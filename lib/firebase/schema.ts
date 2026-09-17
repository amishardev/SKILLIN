/**
 * Firestore document shapes and collection names.
 *
 * Shared by the client reader and the server writer so both agree on the
 * layout. Everything is keyed by uid, there is no cross-user collection, which
 * is what makes the Security Rules in `firestore.rules` simple enough to trust.
 */

import type {
  ActivityEvent,
  CareerPlan,
  LearningStreak,
  Recommendation,
  Roadmap,
  StudentProfile,
  UserProgress,
} from '@/types';

export const COLLECTIONS = {
  /** Account record: display name, email, onboarding state. */
  users: 'users',
  /** The extracted and confirmed profile. */
  profiles: 'profiles',
  /** Career goal, timeline and weekly hours. */
  plans: 'plans',
  /** The generated roadmap. */
  roadmaps: 'roadmaps',
  /** Saved resources. */
  saved: 'saved_resources',

  // ── Server-authoritative. The client reads these; it must never write them. ──
  progress: 'progress',
  streaks: 'learning_streaks',
  activity: 'learning_activity',
  recommendations: 'recommendations',
} as const;

/** Sub-collection of `learning_activity/{uid}`. */
export const ACTIVITY_EVENTS = 'events';

export interface UserDoc {
  fullName: string;
  email: string;
  avatarUrl?: string;
  onboardingComplete: boolean;
  /** IANA timezone reported by the browser; used for streak day boundaries. */
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDoc {
  profile: StudentProfile;
  updatedAt: string;
}

export interface PlanDoc {
  plan: CareerPlan;
  updatedAt: string;
}

export interface RoadmapDoc {
  roadmap: Roadmap;
  updatedAt: string;
}

export interface ProgressDoc extends UserProgress {
  /** Written only by the server. */
  serverManaged: true;
}

export interface StreakDoc extends LearningStreak {
  serverManaged: true;
}

export interface RecommendationsDoc {
  careerGoalId: string;
  items: Recommendation[];
  generatedAt: string;
}

export type ActivityDoc = ActivityEvent;

/** Collections the client is only ever allowed to read. */
export const SERVER_WRITE_ONLY: readonly string[] = [
  COLLECTIONS.progress,
  COLLECTIONS.streaks,
  COLLECTIONS.activity,
  COLLECTIONS.recommendations,
];
