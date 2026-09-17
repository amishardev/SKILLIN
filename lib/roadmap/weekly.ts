/**
 * Weekly plan generation.
 *
 * Splits a milestone's hours into realistic sessions for the week. The shape
 * adapts to the budget: a 3 hr/week learner gets two short weekday sessions,
 * a 20 hr/week learner gets daily sessions plus a long weekend block.
 */

import type { Milestone, Roadmap, WeeklyPlan, WeeklySession } from '@/types';

type Day = WeeklySession['day'];

const WEEKDAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/**
 * How many days a week to study, and how the time is distributed.
 * Fewer, longer sessions beat daily fragments when the budget is small.
 */
function sessionShape(weeklyHours: number): { days: Day[]; weekendBlock: boolean } {
  if (weeklyHours <= 3) return { days: ['Tue', 'Thu'], weekendBlock: false };
  if (weeklyHours <= 5) return { days: ['Mon', 'Wed', 'Fri'], weekendBlock: false };
  if (weeklyHours <= 10) return { days: ['Mon', 'Tue', 'Thu'], weekendBlock: true };
  if (weeklyHours <= 15) return { days: ['Mon', 'Tue', 'Wed', 'Thu'], weekendBlock: true };
  if (weeklyHours <= 20) return { days: WEEKDAYS, weekendBlock: true };
  return { days: WEEKDAYS, weekendBlock: true };
}

/** Round to the nearest 15 minutes so sessions look like real calendar blocks. */
function roundToQuarter(minutes: number): number {
  return Math.max(15, Math.round(minutes / 15) * 15);
}

/**
 * Build the plan for one week of a milestone.
 *
 * Project weeks get a different rhythm to study weeks, building benefits from
 * longer uninterrupted blocks, so the weekend session takes a bigger share.
 */
export function planWeek(
  milestone: Milestone,
  weeklyHours: number,
  weekNumber: number): WeeklyPlan {
  const totalMinutes = Math.round(weeklyHours * 60);
  const { days, weekendBlock } = sessionShape(weeklyHours);
  const isProject = milestone.kind === 'project';

  // Projects get a larger contiguous weekend block than study weeks.
  const weekendShare = weekendBlock ? (isProject ? 0.45 : 0.3) : 0;
  const weekendMinutes = weekendBlock ? roundToQuarter(totalMinutes * weekendShare) : 0;
  const weekdayMinutes = Math.max(0, totalMinutes - weekendMinutes);
  const perDay = days.length > 0 ? roundToQuarter(weekdayMinutes / days.length) : 0;

  const focusPoints = focusFor(milestone, days.length + (weekendBlock ? 1 : 0));
  const sessions: WeeklySession[] = [];

  days.forEach((day, i) => {
    if (perDay <= 0) return;
    sessions.push({
      day,
      minutes: perDay,
      focus: focusPoints[i] ?? milestone.title,
      kind: milestone.kind,
    });
  });

  if (weekendBlock && weekendMinutes > 0) {
    sessions.push({
      day: 'Sat',
      minutes: weekendMinutes,
      focus: isProject ? `Build: ${milestone.title}` : `Practice: ${milestone.title}`,
      kind: milestone.kind,
    });
  }

  return {
    weekNumber,
    milestoneTitle: milestone.title,
    sessions,
    totalMinutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
  };
}

/**
 * Per-session focus labels.
 *
 * Derived from the milestone's own skills so the week reads as a progression
 * rather than the same title repeated five times.
 */
function focusFor(milestone: Milestone, sessionCount: number): string[] {
  const skills = milestone.skillsGained;
  if (skills.length === 0) return Array.from({ length: sessionCount }, () => milestone.title);

  const verbs =
    milestone.kind === 'project'
      ? ['Set up', 'Build', 'Extend', 'Test', 'Document', 'Polish']
      : ['Learn', 'Practise', 'Apply', 'Review', 'Extend', 'Consolidate'];

  return Array.from({ length: sessionCount }, (_, i) => {
    const skill = skills[i % skills.length];
    const verb = verbs[Math.floor(i / skills.length) % verbs.length];
    return `${verb}: ${humanize(skill)}`;
  });
}

function humanize(skillId: string): string {
  return skillId
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** The milestone that is live during a given week of the roadmap. */
export function milestoneForWeek(roadmap: Roadmap, week: number): Milestone | undefined {
  return (
    roadmap.milestones.find((m) => week >= m.weekStart && week <= m.weekEnd) ??
    roadmap.milestones[0]
  );
}

/** The current week's plan, given how far into the roadmap the learner is. */
export function currentWeekPlan(roadmap: Roadmap, week = 1): WeeklyPlan | null {
  const milestone = milestoneForWeek(roadmap, week);
  if (!milestone) return null;
  return planWeek(milestone, roadmap.weeklyHours, week);
}
