import 'server-only';

import { adminDb, adminAvailable } from './admin';
import { COLLECTIONS, ACTIVITY_EVENTS, type ProgressDoc, type StreakDoc } from './schema';
import { EMPTY_STREAK } from '@/lib/streak/engine';
import type { ActivityEvent, LearningStreak, UserProgress } from '@/types';

/**
 * Server-side persistence for the protected collections.
 *
 * Every function degrades to null/no-op when Admin credentials are absent, so
 * route handlers work in both the fully-locked and the local configuration.
 */

export const EMPTY_PROGRESS: UserProgress = {
  resourcesStarted: [],
  resourcesCompleted: [],
  projectsStarted: [],
  projectsCompleted: [],
  hoursLearned: 0,
  skillsAcquired: [],
  updatedAt: new Date(0).toISOString(),
};

export function storeAvailable(): boolean {
  return adminAvailable();
}

// ── Streak ────────────────────────────────────────────────

export async function readStreak(uid: string): Promise<LearningStreak | null> {
  const db = adminDb();
  if (!db) return null;
  const snap = await db.collection(COLLECTIONS.streaks).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as LearningStreak;
}

export async function writeStreak(uid: string, streak: LearningStreak): Promise<boolean> {
  const db = adminDb();
  if (!db) return false;
  const doc: StreakDoc = { ...streak, serverManaged: true };
  await db.collection(COLLECTIONS.streaks).doc(uid).set(doc, { merge: true });
  return true;
}

// ── Progress ──────────────────────────────────────────────

export async function readProgress(uid: string): Promise<UserProgress | null> {
  const db = adminDb();
  if (!db) return null;
  const snap = await db.collection(COLLECTIONS.progress).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as UserProgress;
}

export async function writeProgress(uid: string, progress: UserProgress): Promise<boolean> {
  const db = adminDb();
  if (!db) return false;
  const doc: ProgressDoc = { ...progress, serverManaged: true };
  await db.collection(COLLECTIONS.progress).doc(uid).set(doc, { merge: true });
  return true;
}

// ── Activity log ──────────────────────────────────────────

export async function appendActivity(uid: string, event: ActivityEvent): Promise<boolean> {
  const db = adminDb();
  if (!db) return false;
  await db
    .collection(COLLECTIONS.activity)
    .doc(uid)
    .collection(ACTIVITY_EVENTS)
    .doc(event.id)
    .set(event);
  return true;
}

export async function readActivity(uid: string, limit = 120): Promise<ActivityEvent[]> {
  const db = adminDb();
  if (!db) return [];
  const snap = await db
    .collection(COLLECTIONS.activity)
    .doc(uid)
    .collection(ACTIVITY_EVENTS)
    .orderBy('at', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as ActivityEvent);
}

/**
 * Has this exact activity already been recorded today?
 *
 * Belt-and-braces duplicate protection on top of the streak engine's own
 * same-day rule: it stops a replayed request from inflating logged hours even
 * though it could not inflate the streak.
 */
export async function hasActivityOn(
  uid: string,
  localDate: string,
  type: string,
  targetId?: string,
): Promise<boolean> {
  const db = adminDb();
  if (!db) return false;
  let query = db
    .collection(COLLECTIONS.activity)
    .doc(uid)
    .collection(ACTIVITY_EVENTS)
    .where('localDate', '==', localDate)
    .where('type', '==', type);

  if (targetId) query = query.where('targetId', '==', targetId);

  const snap = await query.limit(1).get();
  return !snap.empty;
}

/** Distinct local dates with qualifying activity, for the heatmap and week strip. */
export async function readActiveDates(uid: string, limit = 400): Promise<string[]> {
  const events = await readActivity(uid, limit);
  return [...new Set(events.map((e) => e.localDate))].sort();
}

export { EMPTY_STREAK };
