import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { verifyIdToken, adminAvailable } from '@/lib/firebase/admin';
import {
  readStreak,
  writeStreak,
  readProgress,
  writeProgress,
  appendActivity,
  readActiveDates,
  hasActivityOn,
  EMPTY_PROGRESS,
} from '@/lib/firebase/store';
import {
  applyActivity,
  projectStreak,
  localDate,
  weekStrip,
  streakMessage,
  nextMilestone,
  EMPTY_STREAK,
} from '@/lib/streak/engine';
import { applyEvent, clampMinutes, DEFAULT_MINUTES } from '@/lib/progress/engine';
import { QUALIFYING_ACTIVITIES, type ActivityEvent, type LearningStreak } from '@/types';

export const runtime = 'nodejs';

/**
 * Streak endpoint.
 *
 * The only place a streak value is produced. Note what the request body does
 * *not* contain: any streak number, any date, and any completion percentage.
 * The client reports that something happened; the server decides what it means,
 * using its own clock.
 */

const activitySchema = z.object({
  // Only qualifying types are accepted at the boundary, a client asking to
  // record a "login" as streak activity is rejected as a bad request.
  type: z.enum(QUALIFYING_ACTIVITIES as unknown as [string, ...string[]]),
  targetId: z.string().max(128).optional(),
  label: z.string().max(200).default('Learning activity'),
  minutes: z.number().int().min(0).max(600).optional(),
  /** IANA timezone, used only to decide which calendar day this falls on. */
  timezone: z.string().max(64).default('UTC'),
});

function unauthorized() {
  return NextResponse.json(
    { error: 'Sign in to record learning activity.' },
    { status: 401 });
}

/** Read the current streak, projected onto today so it is never stale. */
export async function GET(request: NextRequest) {
  const user = await verifyIdToken(request.headers.get('authorization'));
  if (!user) return unauthorized();

  const timezone = request.nextUrl.searchParams.get('tz') || 'UTC';
  const stored = (await readStreak(user.uid)) ?? { ...EMPTY_STREAK, timezone };
  const now = new Date();
  const projected = projectStreak({ ...stored, timezone }, now);
  const activeDates = await readActiveDates(user.uid);

  return NextResponse.json({
    streak: projected,
    message: streakMessage(projected.status),
    nextMilestone: nextMilestone(projected.currentStreak),
    week: weekStrip(activeDates, now, timezone),
    serverManaged: adminAvailable(),
  });
}

/** Record a qualifying activity and return the recomputed streak. */
export async function POST(request: NextRequest) {
  const user = await verifyIdToken(request.headers.get('authorization'));
  if (!user) return unauthorized();

  let body: z.infer<typeof activitySchema>;
  try {
    body = activitySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'That activity could not be recorded.' }, { status: 400 });
  }

  // The server clock is the only source of time. A client-supplied timestamp
  // would let anyone back-date their way to a 365-day streak.
  const now = new Date();
  const timezone = body.timezone || 'UTC';
  const today = localDate(now, timezone);

  const duplicate = await hasActivityOn(user.uid, today, body.type, body.targetId);

  const event: ActivityEvent = {
    id: randomUUID(),
    type: body.type as ActivityEvent['type'],
    targetId: body.targetId,
    label: body.label,
    minutes: clampMinutes(body.minutes ?? DEFAULT_MINUTES[body.type as ActivityEvent['type']] ?? 0),
    at: now.toISOString(),
    localDate: today,
  };

  const stored: LearningStreak = (await readStreak(user.uid)) ?? { ...EMPTY_STREAK, timezone };
  const result = applyActivity({
    streak: { ...stored, timezone },
    activityType: event.type,
    at: now,
    timezone,
  });

  // Persist only when this is genuinely new work.
  if (!duplicate) {
    const progress = (await readProgress(user.uid)) ?? EMPTY_PROGRESS;
    await Promise.all([
      appendActivity(user.uid, event),
      writeProgress(user.uid, applyEvent(progress, event)),
    ]);
  }
  if (result.changed) {
    await writeStreak(user.uid, result.streak);
  }

  const activeDates = await readActiveDates(user.uid);

  return NextResponse.json({
    streak: result.streak,
    changed: result.changed,
    reason: result.reason,
    milestoneReached: result.milestoneReached ?? null,
    duplicate,
    message: streakMessage(result.streak.status),
    nextMilestone: nextMilestone(result.streak.currentStreak),
    week: weekStrip(activeDates, now, timezone),
    serverManaged: adminAvailable(),
  });
}
