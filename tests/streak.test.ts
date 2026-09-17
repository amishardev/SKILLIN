import { describe, it, expect } from 'vitest';
import {
  applyActivity,
  EMPTY_STREAK,
  evaluateStatus,
  projectStreak,
  localDate,
  daysBetween,
  weekStrip,
  shiftDate,
  nextMilestone,
  MAX_GRACE_DAYS,
  GRACE_EARN_INTERVAL,
} from '@/lib/streak/engine';
import type { LearningStreak } from '@/types';

const TZ = 'Asia/Kolkata';

function at(iso: string): Date {
  return new Date(iso);
}

function streakOn(date: string, current: number, extra: Partial<LearningStreak> = {}): LearningStreak {
  return {
    ...EMPTY_STREAK,
    currentStreak: current,
    longestStreak: current,
    lastActivityDate: date,
    status: 'active',
    timezone: TZ,
    graceDaysAvailable: 0,
    ...extra,
  };
}

describe('calendar handling', () => {
  it('resolves the local day for a half-hour offset timezone', () => {
    // 19:00 UTC on the 1st is already the 2nd in India (UTC+5:30).
    expect(localDate(at('2026-03-01T19:00:00Z'), 'Asia/Kolkata')).toBe('2026-03-02');
    expect(localDate(at('2026-03-01T19:00:00Z'), 'UTC')).toBe('2026-03-01');
  });

  it('falls back to UTC for an invalid timezone instead of throwing', () => {
    expect(() => localDate(at('2026-03-01T12:00:00Z'), 'Not/AZone')).not.toThrow();
    expect(localDate(at('2026-03-01T12:00:00Z'), 'Not/AZone')).toBe('2026-03-01');
  });

  it('counts days across a DST boundary correctly', () => {
    // US DST begins 2026-03-08; the gap is still one calendar day.
    expect(daysBetween('2026-03-07', '2026-03-08')).toBe(1);
    expect(daysBetween('2026-03-08', '2026-03-09')).toBe(1);
  });

  it('counts days across a month and year boundary', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1); // 2026 is not a leap year
  });
});

describe('qualifying activity gate', () => {
  it('starts a streak on a genuine learning action', () => {
    const result = applyActivity({
      streak: EMPTY_STREAK,
      activityType: 'lesson_completed',
      at: at('2026-03-01T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.changed).toBe(true);
    expect(result.streak.currentStreak).toBe(1);
    expect(result.streak.status).toBe('active');
  });

  it.each(['login', 'dashboard_view', 'resource_view', 'resource_saved', 'profile_edited'] as const)(
    'refuses to advance a streak for %s',
    (type) => {
      const result = applyActivity({
        streak: EMPTY_STREAK,
        activityType: type,
        at: at('2026-03-01T10:00:00Z'),
        timezone: TZ,
      });
      expect(result.changed).toBe(false);
      expect(result.reason).toBe('not_qualifying');
      expect(result.streak.currentStreak).toBe(0);
    },
  );

  it.each([
    'lesson_completed',
    'module_completed',
    'resource_completed',
    'project_milestone',
    'project_completed',
    'learning_session',
  ] as const)('advances the streak for %s', (type) => {
    const result = applyActivity({
      streak: EMPTY_STREAK,
      activityType: type,
      at: at('2026-03-01T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.changed).toBe(true);
  });
});

describe('duplicate protection', () => {
  it('does not advance twice on the same local day', () => {
    const first = applyActivity({
      streak: EMPTY_STREAK,
      activityType: 'lesson_completed',
      at: at('2026-03-01T06:00:00Z'),
      timezone: TZ,
    });
    const second = applyActivity({
      streak: first.streak,
      activityType: 'module_completed',
      at: at('2026-03-01T15:00:00Z'),
      timezone: TZ,
    });

    expect(first.streak.currentStreak).toBe(1);
    expect(second.changed).toBe(false);
    expect(second.reason).toBe('already_counted_today');
    expect(second.streak.currentStreak).toBe(1);
  });

  it('holds steady across ten replayed events in one day', () => {
    let streak = EMPTY_STREAK;
    for (let i = 0; i < 10; i++) {
      streak = applyActivity({
        streak,
        activityType: 'learning_session',
        at: at(`2026-03-01T${String(6 + i).padStart(2, '0')}:00:00Z`),
        timezone: TZ,
      }).streak;
    }
    expect(streak.currentStreak).toBe(1);
  });

  it('ignores an event dated before the last recorded activity', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-10', 5),
      activityType: 'lesson_completed',
      at: at('2026-03-05T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.changed).toBe(false);
    expect(result.streak.currentStreak).toBe(5);
  });
});

describe('consecutive days', () => {
  it('advances on the next day', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-01', 3),
      activityType: 'lesson_completed',
      at: at('2026-03-02T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.streak.currentStreak).toBe(4);
    expect(result.reason).toBe('advanced');
  });

  it('builds a 30-day streak one day at a time', () => {
    let streak: LearningStreak = { ...EMPTY_STREAK, timezone: TZ, graceDaysAvailable: 0 };
    for (let day = 1; day <= 30; day++) {
      const date = shiftDate('2026-03-01', day - 1);
      streak = applyActivity({
        streak,
        activityType: 'lesson_completed',
        at: at(`${date}T10:00:00Z`),
        timezone: TZ,
      }).streak;
    }
    expect(streak.currentStreak).toBe(30);
    expect(streak.longestStreak).toBe(30);
  });

  it('records milestones exactly when they are reached', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-06', 6),
      activityType: 'lesson_completed',
      at: at('2026-03-07T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.streak.currentStreak).toBe(7);
    expect(result.milestoneReached).toBe(7);
  });

  it('does not report a milestone on a non-milestone day', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-07', 7),
      activityType: 'lesson_completed',
      at: at('2026-03-08T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.milestoneReached).toBeUndefined();
  });
});

describe('breaking and grace days', () => {
  it('restarts at 1 after a long gap, keeping the personal best', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-01', 12),
      activityType: 'lesson_completed',
      at: at('2026-03-20T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.reason).toBe('restarted');
    expect(result.streak.currentStreak).toBe(1);
    expect(result.streak.longestStreak).toBe(12);
  });

  it('spends a grace day to survive exactly one missed day', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-01', 5, { graceDaysAvailable: 1 }),
      activityType: 'lesson_completed',
      at: at('2026-03-03T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.reason).toBe('grace_used');
    expect(result.streak.currentStreak).toBe(6);
    expect(result.streak.graceDaysAvailable).toBe(0);
  });

  it('breaks when a day is missed and no grace day is left', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-01', 5, { graceDaysAvailable: 0 }),
      activityType: 'lesson_completed',
      at: at('2026-03-03T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.reason).toBe('restarted');
    expect(result.streak.currentStreak).toBe(1);
  });

  it('earns a grace day at the accrual interval and never exceeds the cap', () => {
    const result = applyActivity({
      streak: streakOn('2026-03-01', GRACE_EARN_INTERVAL - 1, { graceDaysAvailable: 0 }),
      activityType: 'lesson_completed',
      at: at('2026-03-02T10:00:00Z'),
      timezone: TZ,
    });
    expect(result.streak.currentStreak).toBe(GRACE_EARN_INTERVAL);
    expect(result.streak.graceDaysAvailable).toBe(1);

    const capped = applyActivity({
      streak: streakOn('2026-03-01', GRACE_EARN_INTERVAL - 1, { graceDaysAvailable: MAX_GRACE_DAYS }),
      activityType: 'lesson_completed',
      at: at('2026-03-02T10:00:00Z'),
      timezone: TZ,
    });
    expect(capped.streak.graceDaysAvailable).toBe(MAX_GRACE_DAYS);
  });
});

describe('status evaluation', () => {
  it('is active on the day of activity', () => {
    expect(evaluateStatus(streakOn('2026-03-10', 4), '2026-03-10')).toBe('active');
  });

  it('is at risk the day after', () => {
    expect(evaluateStatus(streakOn('2026-03-10', 4), '2026-03-11')).toBe('at_risk');
  });

  it('is broken two days later with no grace day', () => {
    expect(evaluateStatus(streakOn('2026-03-10', 4), '2026-03-12')).toBe('broken');
  });

  it('is still at risk two days later when a grace day is available', () => {
    const withGrace = streakOn('2026-03-10', 4, { graceDaysAvailable: 1 });
    expect(evaluateStatus(withGrace, '2026-03-12')).toBe('at_risk');
  });

  it('is new when nothing has happened yet', () => {
    expect(evaluateStatus(EMPTY_STREAK, '2026-03-10')).toBe('new');
  });
});

describe('projection for display', () => {
  it('shows zero for a stale streak rather than a stale number', () => {
    const stale = streakOn('2026-03-01', 12);
    const shown = projectStreak(stale, at('2026-03-20T10:00:00Z'));
    expect(shown.currentStreak).toBe(0);
    expect(shown.status).toBe('broken');
  });

  it('leaves a current streak untouched', () => {
    const fresh = streakOn('2026-03-20', 12);
    const shown = projectStreak(fresh, at('2026-03-20T18:00:00Z'));
    expect(shown.currentStreak).toBe(12);
    expect(shown.status).toBe('active');
  });

  it('does not mutate the stored record', () => {
    const stale = streakOn('2026-03-01', 12);
    projectStreak(stale, at('2026-03-20T10:00:00Z'));
    expect(stale.currentStreak).toBe(12);
  });
});

describe('week strip', () => {
  it('returns Monday through Sunday', () => {
    const strip = weekStrip([], at('2026-03-11T10:00:00Z'), 'UTC');
    expect(strip.map((d) => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('fills only days with recorded activity', () => {
    // 2026-03-11 is a Wednesday.
    const strip = weekStrip(['2026-03-09', '2026-03-10'], at('2026-03-11T10:00:00Z'), 'UTC');
    const byDay = Object.fromEntries(strip.map((d) => [d.day, d.state]));
    expect(byDay.Mon).toBe('filled');
    expect(byDay.Tue).toBe('filled');
    expect(byDay.Wed).toBe('current');
    expect(byDay.Thu).toBe('future');
  });

  it('marks today as filled once activity is recorded', () => {
    const strip = weekStrip(['2026-03-11'], at('2026-03-11T10:00:00Z'), 'UTC');
    expect(strip.find((d) => d.day === 'Wed')!.state).toBe('filled');
  });
});

describe('milestones', () => {
  it('reports the next milestone ahead', () => {
    expect(nextMilestone(0)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(100)).toBe(365);
    expect(nextMilestone(365)).toBeNull();
  });
});
