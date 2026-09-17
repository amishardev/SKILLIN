/**
 * Learning streak engine.
 *
 * Pure, deterministic, and the *only* place streak values are ever computed.
 * The client may request that an activity be recorded; it can never state what
 * the resulting streak is. `applyActivity` takes the stored streak plus one
 * event and returns the new stored streak, the server persists that result.
 *
 * Rules enforced here:
 *   - Only qualifying learning actions count (a login or a page view never does).
 *   - Two events on the same local day advance the streak once.
 *   - Consecutive days are measured in the learner's own timezone.
 *   - A single missed day may be covered by a grace day, if one is available.
 *   - Nothing is ever back-dated from client input.
 */

import {
  STREAK_MILESTONES,
  isQualifying,
  type ActivityType,
  type LearningStreak,
  type StreakStatus,
} from '@/types';

/** Grace days replenish as the learner keeps going. */
export const MAX_GRACE_DAYS = 2;
/** One grace day is earned for every this many consecutive days. */
export const GRACE_EARN_INTERVAL = 14;

export const EMPTY_STREAK: LearningStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  status: 'new',
  graceDaysAvailable: 1,
  timezone: 'UTC',
  updatedAt: new Date(0).toISOString(),
};

// ══════════════════════════════════════════════════════════
// Calendar helpers
// ══════════════════════════════════════════════════════════

/**
 * The learner's local calendar day as YYYY-MM-DD.
 *
 * Uses Intl rather than date arithmetic so DST transitions and non-hour
 * offsets (India's UTC+5:30, Nepal's UTC+5:45) are handled correctly. An
 * invalid timezone falls back to UTC instead of throwing.
 */
export function localDate(instant: Date, timezone: string): string {
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the key we want.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  }
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

/** Is `date` a well-formed calendar day? */
export function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
}

// ══════════════════════════════════════════════════════════
// Status
// ══════════════════════════════════════════════════════════

/**
 * Current status, evaluated against *today* rather than the last write.
 *
 * A streak that was active yesterday is "at risk" today until the learner does
 * something, that is what drives the "Your streak is at risk today" message.
 */
export function evaluateStatus(streak: LearningStreak, today: string): StreakStatus {
  if (!streak.lastActivityDate || streak.currentStreak === 0) return 'new';

  const gap = daysBetween(streak.lastActivityDate, today);
  if (Number.isNaN(gap)) return 'new';

  if (gap <= 0) return 'active';
  if (gap === 1) return 'at_risk';
  if (gap === 2 && streak.graceDaysAvailable > 0) return 'at_risk';
  return 'broken';
}

/**
 * Read the streak as it should be *displayed* right now.
 *
 * A stored streak of 12 whose last activity was a week ago is not a streak of
 * 12 any more. This projects the stored record onto today without writing, so
 * the dashboard never shows a stale number.
 */
export function projectStreak(streak: LearningStreak, now: Date): LearningStreak {
  const today = localDate(now, streak.timezone);
  const status = evaluateStatus(streak, today);

  if (status === 'broken') {
    return { ...streak, currentStreak: 0, status: 'broken' };
  }
  return { ...streak, status };
}

// ══════════════════════════════════════════════════════════
// The single mutation
// ══════════════════════════════════════════════════════════

export interface ApplyResult {
  streak: LearningStreak;
  /** False when the event did not move the streak, with `reason` explaining why. */
  changed: boolean;
  reason: 'advanced' | 'already_counted_today' | 'not_qualifying' | 'grace_used' | 'restarted';
  /** Set when this activity crossed a milestone worth celebrating. */
  milestoneReached?: number;
}

export interface ApplyInput {
  streak: LearningStreak;
  activityType: ActivityType;
  /** When the activity happened. Supplied by the server, never by the client. */
  at: Date;
  timezone: string;
}

/**
 * Apply one activity to a streak.
 *
 * Deliberately total: every input produces a valid streak record, so a
 * malformed or replayed request can degrade the result but never corrupt it.
 */
export function applyActivity(input: ApplyInput): ApplyResult {
  const timezone = input.timezone || input.streak.timezone || 'UTC';
  const today = localDate(input.at, timezone);
  const base: LearningStreak = { ...input.streak, timezone };

  // ── Gate 1: only real learning counts ──
  if (!isQualifying(input.activityType)) {
    return {
      streak: { ...base, status: evaluateStatus(base, today) },
      changed: false,
      reason: 'not_qualifying',
    };
  }

  const last = base.lastActivityDate;

  // ── First ever qualifying activity ──
  if (!last || !isValidDateKey(last)) {
    return {
      streak: {
        ...base,
        currentStreak: 1,
        longestStreak: Math.max(1, base.longestStreak),
        lastActivityDate: today,
        status: 'active',
        updatedAt: input.at.toISOString(),
      },
      changed: true,
      reason: 'advanced',
      milestoneReached: milestoneFor(1),
    };
  }

  const gap = daysBetween(last, today);

  // ── Gate 2: same day, or a clock that ran backwards ──
  if (gap <= 0) {
    return {
      streak: { ...base, status: 'active' },
      changed: false,
      reason: 'already_counted_today',
    };
  }

  // ── Consecutive day: advance ──
  if (gap === 1) {
    const next = base.currentStreak + 1;
    return {
      streak: {
        ...base,
        currentStreak: next,
        longestStreak: Math.max(next, base.longestStreak),
        lastActivityDate: today,
        status: 'active',
        graceDaysAvailable: earnGrace(next, base.graceDaysAvailable),
        updatedAt: input.at.toISOString(),
      },
      changed: true,
      reason: 'advanced',
      milestoneReached: milestoneFor(next),
    };
  }

  // ── Exactly one day missed: spend a grace day if available ──
  if (gap === 2 && base.graceDaysAvailable > 0) {
    const next = base.currentStreak + 1;
    return {
      streak: {
        ...base,
        currentStreak: next,
        longestStreak: Math.max(next, base.longestStreak),
        lastActivityDate: today,
        status: 'active',
        graceDaysAvailable: base.graceDaysAvailable - 1,
        updatedAt: input.at.toISOString(),
      },
      changed: true,
      reason: 'grace_used',
      milestoneReached: milestoneFor(next),
    };
  }

  // ── Streak broken: start again at 1, keeping the personal best ──
  return {
    streak: {
      ...base,
      currentStreak: 1,
      longestStreak: Math.max(1, base.longestStreak),
      lastActivityDate: today,
      status: 'active',
      updatedAt: input.at.toISOString(),
    },
    changed: true,
    reason: 'restarted',
  };
}

/** Grace days accrue slowly and cap, so they cannot be farmed. */
function earnGrace(streakLength: number, current: number): number {
  if (streakLength > 0 && streakLength % GRACE_EARN_INTERVAL === 0) {
    return Math.min(MAX_GRACE_DAYS, current + 1);
  }
  return Math.min(MAX_GRACE_DAYS, current);
}

/** The milestone this exact streak length reaches, if any. */
export function milestoneFor(streakLength: number): number | undefined {
  return STREAK_MILESTONES.find((m) => m === streakLength);
}

/** The next milestone ahead, for progress display. */
export function nextMilestone(streakLength: number): number | null {
  return STREAK_MILESTONES.find((m) => m > streakLength) ?? null;
}

// ══════════════════════════════════════════════════════════
// Display helpers
// ══════════════════════════════════════════════════════════

/** Encouraging, never guilt-inducing. */
export function streakMessage(status: StreakStatus): string {
  switch (status) {
    case 'active':
      return 'Keep the streak alive.';
    case 'at_risk':
      return 'Your streak is at risk today.';
    case 'broken':
      return 'Start a new streak today.';
    case 'new':
      return 'Complete something today to start your streak.';
  }
}

export interface WeekDay {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  date: string;
  state: 'filled' | 'empty' | 'current' | 'future';
}

const DAY_LABELS: WeekDay['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The Mon-Sun strip for the streak card.
 * `activeDates` comes from recorded activity, so a day is only filled when the
 * learner genuinely did something on it.
 */
export function weekStrip(
  activeDates: readonly string[],
  now: Date,
  timezone: string): WeekDay[] {
  const today = localDate(now, timezone);
  const active = new Set(activeDates);

  // Monday-based index for the current day.
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const mondayOffset = todayDow === 0 ? 6 : todayDow - 1;

  return DAY_LABELS.map((day, i) => {
    const offset = i - mondayOffset;
    const date = shiftDate(today, offset);
    let state: WeekDay['state'];
    if (offset > 0) state = 'future';
    else if (date === today) state = active.has(date) ? 'filled' : 'current';
    else state = active.has(date) ? 'filled' : 'empty';
    return { day, date, state };
  });
}

/** Shift a YYYY-MM-DD key by whole days. */
export function shiftDate(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
