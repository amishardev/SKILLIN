/**
 * SkillIn domain model.
 *
 * Every type here is storage-agnostic. Firestore documents are shaped from
 * these, never the other way round.
 */

// ══════════════════════════════════════════════════════════
// Evidence
// ══════════════════════════════════════════════════════════

/** Where a claimed skill came from. Drives how much we trust it. */
export type EvidenceType = 'internship' | 'work' | 'project' | 'certificate' | 'academic' | 'self';

/**
 * How strongly each evidence source supports a skill claim.
 * Configurable in one place, never inline these numbers elsewhere.
 */
export const EVIDENCE_WEIGHTS: Record<EvidenceType, number> = {
  internship: 0.95,
  work: 0.95,
  project: 0.85,
  certificate: 0.70,
  academic: 0.65,
  self: 0.35,
};

/** Below this, a skill is treated as "not yet demonstrated". */
export const SKILL_CONFIRMED_THRESHOLD = 0.55;
/** Minimum level of a prerequisite before a resource is considered safe. */
export const PREREQUISITE_THRESHOLD = 0.40;

export interface ExtractedSkill {
  /** Canonical skill id, or null when the taxonomy has no match. */
  skillId: string | null;
  /** Raw text as written in the source document. */
  rawName: string;
  confidence: number;
  source: EvidenceType;
  /** Verbatim snippet from the profile supporting this skill. */
  evidence: string;
  /** Explicitly stated vs. reasonably inferred from context. */
  explicit: boolean;
}

export interface StudentSkill {
  skillId: string;
  skillName: string;
  /** Composite 0-1 confidence after combining all evidence. */
  score: number;
  evidenceTypes: EvidenceType[];
  evidence: string[];
  /** True when at least one piece of evidence was explicit. */
  explicit: boolean;
}

// ══════════════════════════════════════════════════════════
// Profile
// ══════════════════════════════════════════════════════════

export interface EducationEntry {
  institution: string;
  degree: string;
  branch: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  skills: ExtractedSkill[];
  url?: string;
  year?: number;
}

export interface ExperienceEntry {
  id: string;
  organization: string;
  role: string;
  description: string;
  technologies: string[];
  skills: ExtractedSkill[];
  startDate?: string;
  endDate?: string;
  /** Internships weigh slightly differently from full-time work. */
  kind: 'internship' | 'work';
}

export interface CertificateEntry {
  id: string;
  title: string;
  issuer: string;
  year?: number;
  skills: string[];
}

export interface AchievementEntry {
  id: string;
  title: string;
  description?: string;
  year?: number;
}

/** The normalized profile produced by the extraction pipeline. */
export interface StudentProfile {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  education: EducationEntry[];
  college?: string;
  degree?: string;
  branch?: string;
  graduationYear?: number;
  projects: ProjectEntry[];
  experience: ExperienceEntry[];
  certificates: CertificateEntry[];
  achievements: AchievementEntry[];
  /** Skills listed outright in the profile's Skills section. */
  declaredSkills: ExtractedSkill[];
  /** Provenance of this profile, shown to the user. */
  source: 'linkedin-pdf' | 'resume-pdf' | 'demo' | 'manual';
  extractedAt: string;
  /** True when an LLM enriched extraction; false for deterministic parse only. */
  aiAssisted: boolean;
}

export interface CareerPlan {
  careerGoalId: string;
  secondaryGoalId?: string;
  timelineMonths: number;
  weeklyHours: number;
}

// ══════════════════════════════════════════════════════════
// Skill vector
// ══════════════════════════════════════════════════════════

/** skillId → 0-1 mastery. */
export type SkillVector = Map<string, number>;

export interface SkillGap {
  skillId: string;
  skillName: string;
  /** How much the target career needs this skill (0-1). */
  required: number;
  /** What the student currently demonstrates (0-1). */
  current: number;
  /** max(0, required − current). */
  gap: number;
  status: 'confirmed' | 'developing' | 'missing';
}

// ══════════════════════════════════════════════════════════
// Recommendation
// ══════════════════════════════════════════════════════════

export interface RecommendationScore {
  resourceId: string;
  total: number;
  academicMatch: number;
  projectMatch: number;
  experienceMatch: number;
  certificateGap: number;
  skillGap: number;
  careerMatch: number;
  similarity: number;
  /** Embedding cosine against the learner's remaining-gap direction, 0-1. */
  gapAffinity: number;
  redundancyPenalty: number;
  qualityScore: number;
  prerequisiteReady: boolean;
  /** Canonical skill ids the learner still needs before starting. */
  prerequisiteMissing: string[];
  skillsGained: string[];
  skillsReinforced: string[];
}

export interface RecommendationExplanation {
  youKnow: string[];
  youDemonstrated: string[];
  youAreMissing: string[];
  unlocks: string[];
  careerGoal: string;
  why: string;
}

export interface Recommendation {
  rank: number;
  resourceId: string;
  score: RecommendationScore;
  explanation: RecommendationExplanation;
  generatedAt: string;
}

// ══════════════════════════════════════════════════════════
// Roadmap
// ══════════════════════════════════════════════════════════

export type MilestoneKind = 'resource' | 'project' | 'checkpoint';

export interface Milestone {
  id: string;
  order: number;
  month: number;
  weekStart: number;
  weekEnd: number;
  kind: MilestoneKind;
  title: string;
  subtitle: string;
  resourceId?: string;
  projectId?: string;
  skillsGained: string[];
  hours: number;
}

export interface Roadmap {
  careerGoalId: string;
  careerTitle: string;
  timelineMonths: number;
  weeklyHours: number;
  milestones: Milestone[];
  /** Skills the plan does not have time to cover, stated honestly. */
  uncovered: string[];
  totalHours: number;
  generatedAt: string;
}

export interface WeeklySession {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  minutes: number;
  focus: string;
  kind: MilestoneKind;
}

export interface WeeklyPlan {
  weekNumber: number;
  milestoneTitle: string;
  sessions: WeeklySession[];
  totalMinutes: number;
}

// ══════════════════════════════════════════════════════════
// Progress & streak
// ══════════════════════════════════════════════════════════

/** Only these actions may advance a streak. */
export type QualifyingActivity =
  | 'lesson_completed'
  | 'module_completed'
  | 'resource_completed'
  | 'project_milestone'
  | 'project_completed'
  | 'learning_session';

/** Recorded, but never streak-qualifying. */
export type NonQualifyingActivity =
  | 'login' | 'dashboard_view' | 'resource_view' | 'resource_saved' | 'profile_edited';

export type ActivityType = QualifyingActivity | NonQualifyingActivity;

export const QUALIFYING_ACTIVITIES: readonly QualifyingActivity[] = [
  'lesson_completed',
  'module_completed',
  'resource_completed',
  'project_milestone',
  'project_completed',
  'learning_session',
] as const;

export function isQualifying(type: ActivityType): type is QualifyingActivity {
  return (QUALIFYING_ACTIVITIES as readonly string[]).includes(type);
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  /** Resource or project id the event refers to. */
  targetId?: string;
  label: string;
  minutes: number;
  /** ISO instant the event occurred. */
  at: string;
  /** Learner-local calendar day, YYYY-MM-DD. The streak key. */
  localDate: string;
}

export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'new';

export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  /** YYYY-MM-DD of the most recent qualifying activity. */
  lastActivityDate: string | null;
  status: StreakStatus;
  graceDaysAvailable: number;
  timezone: string;
  updatedAt: string;
}

export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365] as const;

export interface UserProgress {
  resourcesStarted: string[];
  resourcesCompleted: string[];
  projectsStarted: string[];
  projectsCompleted: string[];
  /** Derived from activity events, never written directly by the client. */
  hoursLearned: number;
  skillsAcquired: string[];
  updatedAt: string;
}

export interface CareerReadiness {
  overall: number;
  components: {
    skills: number;
    projects: number;
    experience: number;
    prerequisites: number;
  };
}

/**
 * Opportunities: hackathons, internships, jobs and competitions.
 *
 * The shape exists so the Hackathons and Jobs pages have something real to be
 * built against. Nothing populates it yet, deliberately: a listing carries an
 * organiser, a deadline and a URL that somebody will act on, so it is only
 * worth storing once it comes from a verified source.
 */
export type OpportunityType = 'hackathon' | 'internship' | 'job' | 'competition';

export type OpportunityStatus = 'draft' | 'open' | 'closed' | 'unverified';

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: OpportunityType;
  /** Where the listing came from, for attribution and for re-checking it. */
  source: string;
  sourceUrl: string;
  description: string;
  /** Skill ids from the taxonomy, never free text. */
  skills: string[];
  /** Career ids this is relevant to. */
  careerTags: string[];
  eligibility: string[];
  location: string | null;
  remote: boolean;
  /** ISO date. Null when the source does not state one. */
  deadline: string | null;
  experienceLevel: 'student' | 'entry' | 'mid' | 'senior' | null;
  /** ISO timestamp of the last time the URL and the dates were checked. */
  lastVerified: string | null;
  status: OpportunityStatus;
}
