/**
 * Analysis orchestration.
 *
 * One pure function turns a confirmed profile plus a plan into everything the
 * app displays: skills, gaps, readiness, recommendations and a roadmap.
 *
 * Pure and dependency-free by design, it runs unchanged on the server for a
 * signed-in user, so there is exactly one code path from a profile to what the
 * product shows.
 */

import { getCareer, type CareerGoal } from '@/data/careers';
import { normalizeSkill } from '@/data/skills';
import { getResource, type LearningResource } from '@/data/resources';
import { PROJECTS, type ProjectTemplate } from '@/data/projects';
import { buildStudentSkills, toVector } from '@/lib/skills/vector';
import {
  computeSkillGaps,
  computeCareerReadiness,
  explainRecommendation,
  rankResources,
  topK,
  type RankedResource,
  type ScoringContext,
} from '@/lib/recommendation/engine';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { gapEmbedding } from '@/lib/embeddings';
import { buildRoadmap, skillSequence } from '@/lib/roadmap/planner';
import { currentWeekPlan } from '@/lib/roadmap/weekly';
import type {
  CareerPlan,
  CareerReadiness,
  Recommendation,
  Roadmap,
  SkillGap,
  SkillVector,
  StudentProfile,
  StudentSkill,
  UserProgress,
  WeeklyPlan,
} from '@/types';

export interface BlockedResource {
  resource: LearningResource;
  missing: string[];
  missingNames: string[];
}

export interface Analysis {
  career: CareerGoal;
  skills: StudentSkill[];
  vector: SkillVector;
  gaps: SkillGap[];
  readiness: CareerReadiness;
  /** The single dominant "your next move" card. */
  nextMove: { resource: LearningResource; recommendation: Recommendation } | null;
  recommendations: Recommendation[];
  ranked: RankedResource[];
  blocked: BlockedResource[];
  roadmap: Roadmap;
  learningPath: string[];
  projects: ProjectTemplate[];
  weeklyPlan: WeeklyPlan | null;
}

export interface AnalyzeInput {
  profile: StudentProfile;
  plan: CareerPlan;
  progress?: UserProgress;
  /** Which week of the roadmap the learner is on. */
  currentWeek?: number;
}

export function analyze(input: AnalyzeInput): Analysis {
  const career = getCareer(input.plan.careerGoalId);
  if (!career) {
    throw new Error(`Unknown career goal: ${input.plan.careerGoalId}`);
  }

  const skills = buildStudentSkills(input.profile);
  const vector = toVector(skills);

  const context: ScoringContext = {
    vector,
    career,
    projectSkills: input.profile.projects.flatMap((p) => p.technologies),
    experienceSkills: input.profile.experience.flatMap((e) => e.technologies),
    academicSkills: academicSkillsFrom(input.profile),
    certificateSkills: input.profile.certificates.flatMap((c) => c.skills),
    completedResourceIds: input.progress?.resourcesCompleted ?? [],
  };

  const gaps = computeSkillGaps(vector, career);
  // The remaining-gap direction depends only on the profile and goal, so it is
  // computed once here and reused for every resource scored below.
  context.gapVector = gapEmbedding(gaps);
  const readiness = computeCareerReadiness(vector, career, {
    projects: relevantProjectCount(input.profile, career) +
      (input.progress?.projectsCompleted.length ?? 0),
    experienceMonths: estimateExperienceMonths(input.profile, career),
  });

  const picks = topK(context, 6);
  const recommendations: Recommendation[] = picks.map((item, index) => ({
    rank: index + 1,
    resourceId: item.resource.id,
    score: item.score,
    explanation: explainRecommendation(item.resource, item.score, skills, career),
    generatedAt: new Date().toISOString(),
  }));

  const { blocked } = rankResources(context);
  const blockedList: BlockedResource[] = blocked.slice(0, 6).map(({ resource }) => {
    const readinessResult = checkReadiness(resource.prerequisites, vector);
    return {
      resource,
      missing: readinessResult.missing,
      missingNames: readinessResult.missingNames,
    };
  });

  const roadmap = buildRoadmap({
    vector,
    careerId: career.id,
    timelineMonths: input.plan.timelineMonths,
    weeklyHours: input.plan.weeklyHours,
    context,
    completedResourceIds: context.completedResourceIds,
  });

  const projects = roadmap.milestones
    .filter((m) => m.projectId)
    .map((m) => PROJECTS.find((p) => p.id === m.projectId))
    .filter((p): p is ProjectTemplate => Boolean(p));

  const nextMove =
    picks.length > 0 ? { resource: picks[0].resource, recommendation: recommendations[0] } : null;

  return {
    career,
    skills,
    vector,
    gaps,
    readiness,
    nextMove,
    recommendations,
    ranked: picks,
    blocked: blockedList,
    roadmap,
    learningPath: skillSequence(roadmap),
    projects,
    weeklyPlan: currentWeekPlan(roadmap, input.currentWeek ?? 1),
  };
}

/**
 * Skills implied by the learner's field of study.
 *
 * Derived only from words actually present in the degree and branch, a Data
 * Science degree implies statistics, a Computer Science one implies algorithms.
 * Nothing is added for a field the profile does not name.
 */
function academicSkillsFrom(profile: StudentProfile): string[] {
  const text = [profile.degree, profile.branch, ...profile.education.map((e) => `${e.degree} ${e.branch}`)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const implied: string[] = [];
  const add = (condition: boolean, ...ids: string[]) => {
    if (condition) implied.push(...ids);
  };

  add(/data science|statistic|analytic/.test(text), 'statistics', 'probability', 'data-analysis');
  add(/computer science|software|information technology|\bcse?\b/.test(text), 'dsa', 'operating-systems', 'dbms');
  add(/artificial intelligence|machine learning|\bai\b/.test(text), 'machine-learning', 'linear-algebra');
  add(/electronic|electrical|\bece\b/.test(text), 'signal-processing', 'embedded-systems');
  add(/mechanical|robotic/.test(text), 'control-systems');
  add(/mathematic|\bmath\b/.test(text), 'linear-algebra', 'calculus', 'probability');
  add(/cyber|security/.test(text), 'cybersecurity', 'computer-networks');
  add(/design/.test(text), 'ui-design');

  return [...new Set(implied)];
}

/**
 * How much of a piece of past work the target role actually asks for, 0 to 1.
 *
 * Projects and experience used to be counted as raw totals. That was defensible
 * while every career here was technical, because any engineering work was at
 * least weak evidence for any engineering role. Across four domains it stopped
 * being defensible: a profile with two web apps and ten months at a software job
 * scored 26% ready for Music Producer, having never touched an instrument. The
 * count had no idea what the role was.
 *
 * A signal that ignores the goal is not corroboration, it is a number that only
 * looks like one. So each entry now counts in proportion to how much of what it
 * used is in the role's own skill set.
 */
function relevanceTo(career: CareerGoal, raw: readonly string[]): number {
  const wanted = new Set<string>([
    ...career.skills.map((s) => s.skillId),
    ...career.foundations,
  ]);
  const ids = raw.map((name) => normalizeSkill(name)).filter((id): id is string => Boolean(id));
  // Work whose skills we cannot resolve at all is not evidence either way.
  if (ids.length === 0) return 0;
  return ids.filter((id) => wanted.has(id)).length / ids.length;
}

/** Every skill name an entry mentions, whether declared or inferred. */
function namesOf(entry: { technologies: string[]; skills: { rawName: string }[] }): string[] {
  return [...entry.technologies, ...entry.skills.map((s) => s.rawName)];
}

/**
 * Projects, each weighted by its relevance to the role.
 *
 * Fractional by design. A project that is half about the role is half the
 * evidence of one that is entirely about it, and rounding that to zero or one
 * would throw away the distinction the weighting exists to make.
 */
function relevantProjectCount(profile: StudentProfile, career: CareerGoal): number {
  return profile.projects.reduce((sum, p) => sum + relevanceTo(career, namesOf(p)), 0);
}

/**
 * Months of recorded experience, each position weighted by its relevance to the
 * role. Dates decide the duration; the skill overlap decides how much of that
 * duration counts toward this particular goal.
 */
function estimateExperienceMonths(profile: StudentProfile, career: CareerGoal): number {
  let months = 0;
  for (const exp of profile.experience) {
    const start = parseMonth(exp.startDate);
    const end = exp.endDate && !/present/i.test(exp.endDate) ? parseMonth(exp.endDate) : new Date();
    let span: number;
    if (start && end) {
      const diff =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      // A position with no readable dates still counts for something.
      span = diff > 0 ? diff : 3;
    } else {
      span = 3;
    }
    months += span * relevanceTo(career, namesOf(exp));
  }
  return months;
}

function parseMonth(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value} 1`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const year = value.match(/(19|20)\d{2}/)?.[0];
  return year ? new Date(Number(year), 0, 1) : null;
}

/** Resolve a recommendation back to its resource record. */
export function recommendationResource(rec: Recommendation): LearningResource | undefined {
  return getResource(rec.resourceId);
}
