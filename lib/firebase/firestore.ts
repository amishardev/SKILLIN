'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './config';
import { COLLECTIONS, type PlanDoc, type ProfileDoc, type RoadmapDoc, type UserDoc } from './schema';
import type { CareerPlan, LearningStreak, Roadmap, StudentProfile, UserProgress } from '@/types';

/**
 * Client-side Firestore access.
 *
 * Only the user-owned, client-writable collections appear here. Streak,
 * progress and activity are deliberately absent: they are read through the
 * API and written exclusively by the server, and Security Rules deny any
 * client write regardless of what this file does.
 */

const now = () => new Date().toISOString();

/**
 * True when Firestore refused the operation because of Security Rules.
 *
 * The usual cause is that `firestore.rules` has never been deployed, so the
 * project is still on Firebase's default locked-mode rules. The app treats this
 * as "cannot persist right now" rather than a crash: work stays in the browser
 * and the UI says so.
 */
export function isPermissionError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = 'code' in err ? String((err as { code: unknown }).code) : '';
  const message = 'message' in err ? String((err as { message: unknown }).message) : '';
  return (
    code === 'permission-denied' ||
    code === 'firestore/permission-denied' ||
    /insufficient permissions|permission[- ]denied|PERMISSION_DENIED/i.test(message)
  );
}

/** Thrown upward so callers can fall back to local storage and tell the user. */
export class StorageUnavailableError extends Error {
  constructor(readonly cause: unknown) {
    super(
      'Could not save to your account. Firestore rejected the write, which usually means the security rules have not been deployed yet.',
    );
    this.name = 'StorageUnavailableError';
  }
}

/** Run a Firestore call, converting a rules rejection into a typed error. */
async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (isPermissionError(err)) throw new StorageUnavailableError(err);
    throw err;
  }
}

// ── Account ───────────────────────────────────────────────

export async function createUserDoc(uid: string, data: Partial<UserDoc>): Promise<void> {
  await guard(() => setDoc(
    doc(getDb(), COLLECTIONS.users, uid),
    {
      fullName: '',
      email: '',
      onboardingComplete: false,
      timezone: browserTimezone(),
      createdAt: now(),
      ...data,
      updatedAt: now(),
    },
      { merge: true },
    ),
  );
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.users, uid)));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function updateUserDoc(uid: string, data: Partial<UserDoc>): Promise<void> {
  await guard(() => setDoc(doc(getDb(), COLLECTIONS.users, uid), { ...data, updatedAt: now() }, { merge: true }));
}

// ── Profile ───────────────────────────────────────────────

export async function saveProfile(uid: string, profile: StudentProfile): Promise<void> {
  const payload: ProfileDoc = { profile, updatedAt: now() };
  await guard(() => setDoc(doc(getDb(), COLLECTIONS.profiles, uid), payload));
}

export async function loadProfile(uid: string): Promise<StudentProfile | null> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.profiles, uid)));
  return snap.exists() ? (snap.data() as ProfileDoc).profile : null;
}

// ── Plan ──────────────────────────────────────────────────

export async function savePlan(uid: string, plan: CareerPlan): Promise<void> {
  const payload: PlanDoc = { plan, updatedAt: now() };
  await guard(() => setDoc(doc(getDb(), COLLECTIONS.plans, uid), payload));
}

export async function loadPlan(uid: string): Promise<CareerPlan | null> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.plans, uid)));
  return snap.exists() ? (snap.data() as PlanDoc).plan : null;
}

// ── Roadmap ───────────────────────────────────────────────

export async function saveRoadmap(uid: string, roadmap: Roadmap): Promise<void> {
  const payload: RoadmapDoc = { roadmap, updatedAt: now() };
  await guard(() => setDoc(doc(getDb(), COLLECTIONS.roadmaps, uid), payload));
}

export async function loadRoadmap(uid: string): Promise<Roadmap | null> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.roadmaps, uid)));
  return snap.exists() ? (snap.data() as RoadmapDoc).roadmap : null;
}

// ── Saved resources ───────────────────────────────────────

export async function saveResourceIds(uid: string, ids: string[]): Promise<void> {
  await guard(() => setDoc(doc(getDb(), COLLECTIONS.saved, uid), { ids, updatedAt: now() }));
}

export async function loadSavedResourceIds(uid: string): Promise<string[]> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.saved, uid)));
  return snap.exists() ? ((snap.data().ids as string[]) ?? []) : [];
}

// ── Read-only mirrors of server-managed documents ─────────

export async function loadProgress(uid: string): Promise<UserProgress | null> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.progress, uid)));
  return snap.exists() ? (snap.data() as UserProgress) : null;
}

export async function loadStreak(uid: string): Promise<LearningStreak | null> {
  const snap = await guard(() => getDoc(doc(getDb(), COLLECTIONS.streaks, uid)));
  return snap.exists() ? (snap.data() as LearningStreak) : null;
}

// ── Account deletion (privacy) ────────────────────────────

/**
 * Delete everything the user owns that the client is permitted to remove.
 * Server-managed documents are cleared through the API, which has the rights.
 */
export async function deleteOwnedData(uid: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await Promise.all([
    deleteDoc(doc(getDb(), COLLECTIONS.profiles, uid)).catch(() => {}),
    deleteDoc(doc(getDb(), COLLECTIONS.plans, uid)).catch(() => {}),
    deleteDoc(doc(getDb(), COLLECTIONS.roadmaps, uid)).catch(() => {}),
    deleteDoc(doc(getDb(), COLLECTIONS.saved, uid)).catch(() => {}),
    deleteDoc(doc(getDb(), COLLECTIONS.users, uid)).catch(() => {}),
  ]);
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
