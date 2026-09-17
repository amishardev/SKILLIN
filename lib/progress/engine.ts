/**
 * Progress engine.
 *
 * Progress is *derived* from verified activity events, never submitted. The
 * client cannot post "I am 80% done", it can only report that a specific,
 * qualifying thing happened, and this module recomputes the totals.
 */

import { getResource } from '@/data/resources';
import { getProject } from '@/data/projects';
import type { ActivityEvent, ActivityType, UserProgress } from '@/types';

/** Apply one verified event to the stored progress record. */
export function applyEvent(progress: UserProgress, event: ActivityEvent): UserProgress {
  const next: UserProgress = {
    ...progress,
    resourcesStarted: [...progress.resourcesStarted],
    resourcesCompleted: [...progress.resourcesCompleted],
    projectsStarted: [...progress.projectsStarted],
    projectsCompleted: [...progress.projectsCompleted],
    skillsAcquired: [...progress.skillsAcquired],
    updatedAt: event.at,
  };

  const add = (list: string[], id: string | undefined) => {
    if (id && !list.includes(id)) list.push(id);
  };

  switch (event.type) {
    case 'resource_completed': {
      add(next.resourcesCompleted, event.targetId);
      add(next.resourcesStarted, event.targetId);
      const resource = event.targetId ? getResource(event.targetId) : undefined;
      for (const skillId of resource?.skills ?? []) add(next.skillsAcquired, skillId);
      break;
    }
    case 'project_completed': {
      add(next.projectsCompleted, event.targetId);
      add(next.projectsStarted, event.targetId);
      const project = event.targetId ? getProject(event.targetId) : undefined;
      for (const skillId of project?.skills ?? []) add(next.skillsAcquired, skillId);
      break;
    }
    case 'project_milestone':
      add(next.projectsStarted, event.targetId);
      break;
    case 'lesson_completed':
    case 'module_completed':
    case 'learning_session':
      add(next.resourcesStarted, event.targetId);
      break;
    default:
      // Views, saves and logins are logged but move no counters.
      break;
  }

  // Time is only ever added from a clamped, server-recorded duration.
  next.hoursLearned = round2(progress.hoursLearned + clampMinutes(event.minutes) / 60);

  return next;
}

/**
 * A single session cannot claim more than four hours. Without this, a replayed
 * or hand-crafted request could inflate lifetime hours arbitrarily.
 */
export const MAX_SESSION_MINUTES = 240;

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.min(MAX_SESSION_MINUTES, Math.round(minutes));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Default minutes credited per activity type when the client sends none. */
export const DEFAULT_MINUTES: Partial<Record<ActivityType, number>> = {
  lesson_completed: 30,
  module_completed: 60,
  resource_completed: 0,
  project_milestone: 60,
  project_completed: 0,
  learning_session: 30,
};

/** Completion percentage of a roadmap, from milestones actually finished. */
export function roadmapCompletion(
  milestoneIds: readonly string[],
  progress: UserProgress,
  resolve: (milestoneId: string) => { resourceId?: string; projectId?: string }): number {
  if (milestoneIds.length === 0) return 0;
  let done = 0;
  for (const id of milestoneIds) {
    const { resourceId, projectId } = resolve(id);
    if (resourceId && progress.resourcesCompleted.includes(resourceId)) done++;
    else if (projectId && progress.projectsCompleted.includes(projectId)) done++;
  }
  return done / milestoneIds.length;
}

/** Activity counts per local date, for the heatmap. */
export function heatmapCounts(events: readonly ActivityEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.localDate, (counts.get(event.localDate) ?? 0) + 1);
  }
  return counts;
}
