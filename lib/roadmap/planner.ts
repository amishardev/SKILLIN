/**
 * Roadmap planner.
 *
 * Turns ranked recommendations into a dated, prerequisite-safe plan that fits
 * the learner's actual budget. The two honest constraints it enforces:
 *
 *   1. Nothing is scheduled before its prerequisites are scheduled.
 *   2. Total scheduled hours never exceed `timelineMonths * weeklyHours * 4.33`.
 *
 * When the budget cannot cover every gap, the plan says so via `uncovered`
 * rather than silently compressing a 12-month curriculum into 3 months.
 */

import { getResource, type LearningResource } from '@/data/resources';
import { fullCatalog } from '@/lib/catalog';
import { PROJECTS, type ProjectTemplate } from '@/data/projects';
import { getCareer, type CareerGoal } from '@/data/careers';
import { skillName } from '@/data/skills';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { rankResources, computeSkillGaps, type ScoringContext } from '@/lib/recommendation/engine';
import { MIN_MARGINAL_GAP } from '@/lib/recommendation/config';
import { SKILL_CONFIRMED_THRESHOLD, type Milestone, type Roadmap, type SkillVector } from '@/types';

/** Average weeks per month, plans are built in weeks, presented in months. */
export const WEEKS_PER_MONTH = 4.33;

/** Learners do not absorb a resource's full nominal hours as new learning. */
const PROJECT_SHARE_OF_BUDGET = 0.3;

/**
 * The skill level the planner assumes after a resource is completed.
 *
 * Set above the highest career weight on purpose. At a lower value, a skill the
 * role weights at 0.90 would keep a permanent residual deficit no matter how
 * much was scheduled for it, and the planner would keep booking another
 * resource to chase the remainder forever.
 */
const TAUGHT_LEVEL = 0.85;

export interface PlanInput {
  vector: SkillVector;
  careerId: string;
  timelineMonths: number;
  weeklyHours: number;
  context: ScoringContext;
  completedResourceIds?: string[];
}

/**
 * Build the roadmap.
 *
 * Greedy but prerequisite-aware: at each step, pick the highest-value resource
 * whose prerequisites are satisfied *by the plan so far*, not just by the
 * learner's starting skills. This is what produces a sequence like
 * Deep Learning -> Transformers -> LLMs rather than an arbitrary top-5 list.
 */
export function buildRoadmap(input: PlanInput): Roadmap {
  const career = getCareer(input.careerId);
  if (!career) {
    throw new Error(`Unknown career goal: ${input.careerId}`);
  }

  const totalHours = Math.max(1, input.timelineMonths * input.weeklyHours * WEEKS_PER_MONTH);
  const learningBudget = totalHours * (1 - PROJECT_SHARE_OF_BUDGET);
  const projectBudget = totalHours - learningBudget;

  // A mutable copy of the learner's skills, advanced as the plan "teaches" them.
  const projected: SkillVector = new Map(input.vector);
  const completed = new Set(input.completedResourceIds ?? []);

  const gapTargets = new Set(
    computeSkillGaps(input.vector, career)
      .filter((g) => g.gap > 0.1)
      .map((g) => g.skillId));

  // The learner's total weighted deficit at the start. Marginal value is judged
  // against this fixed denominator, measuring against the *remaining* deficit
  // would make every late addition look valuable, because the denominator
  // shrinks as fast as the numerator.
  const initialDeficit = totalDeficit(input.vector, career);

  const chosen: LearningResource[] = [];
  let spent = 0;

  // ── Select resources ──
  while (spent < learningBudget) {
    const candidate = pickNext({
      projected,
      career,
      gapTargets,
      chosenIds: new Set([...chosen.map((c) => c.id), ...completed]),
      context: input.context,
      remainingHours: learningBudget - spent,
      initialDeficit,
    });
    if (!candidate) break;

    chosen.push(candidate);
    spent += candidate.estimatedHours;
    // Completing a resource brings its skills to a confirmed level.
    for (const skillId of candidate.skills) {
      projected.set(skillId, Math.max(projected.get(skillId) ?? 0, TAUGHT_LEVEL));
    }
  }

  // ── Select projects that the plan has actually prepared the learner for ──
  const projects = pickProjects(projected, career, projectBudget);

  // ── Lay out on a calendar ──
  const milestones = schedule(
    chosen,
    projects,
    input.weeklyHours,
    input.timelineMonths,
    input.vector);

  // ── Report honestly on what the budget could not cover ──
  const covered = new Set(chosen.flatMap((c) => c.skills));
  const uncovered = [...gapTargets].filter(
    (s) => !covered.has(s) && (input.vector.get(s) ?? 0) < SKILL_CONFIRMED_THRESHOLD);

  return {
    careerGoalId: career.id,
    careerTitle: career.title,
    timelineMonths: input.timelineMonths,
    weeklyHours: input.weeklyHours,
    milestones,
    uncovered,
    totalHours: milestones.reduce((sum, m) => sum + m.hours, 0),
    generatedAt: new Date().toISOString(),
  };
}

interface PickInput {
  projected: SkillVector;
  career: CareerGoal;
  gapTargets: Set<string>;
  chosenIds: Set<string>;
  context: ScoringContext;
  remainingHours: number;
  initialDeficit: number;
}

/** Total weighted shortfall against a career, given a skill vector. */
function totalDeficit(vector: SkillVector, career: CareerGoal): number {
  return career.skills.reduce(
    (sum, s) => sum + Math.max(0, s.weight - (vector.get(s.skillId) ?? 0)),
    0);
}

/** How much of the career's weighted deficit this resource would still close. */
function marginalGain(
  resource: LearningResource,
  projected: SkillVector,
  career: CareerGoal): number {
  let gain = 0;
  for (const s of career.skills) {
    if (!resource.skills.includes(s.skillId)) continue;
    gain += Math.max(0, s.weight - (projected.get(s.skillId) ?? 0));
  }
  return gain;
}

/**
 * The next best resource given what the plan has taught so far.
 * Re-ranks against the *projected* vector each round, which is what makes the
 * sequence prerequisite-safe end to end.
 */
function pickNext(input: PickInput): LearningResource | null {
  /*
   * The whole catalog, not only the curated tier.
   *
   * This used to rank over the 116 hand-checked resources alone, which was
   * invisible while every career was a technical one, because that tier is
   * entirely technical. The moment business, creative and humanities roles
   * existed, twenty eight of them produced recommendations but an empty
   * roadmap: the ranker could see courses for them, the planner could not.
   *
   * Free-first is preserved by the ranking itself, where publisher reliability
   * carries the largest share of the quality term, rather than by hiding the
   * rest of the catalog from this stage.
   */
  const { ready } = rankResources(
    {
      ...input.context,
      vector: input.projected,
      career: input.career,
      completedResourceIds: [...input.chosenIds],
    },
    // Pre-filtered to what could possibly help. `scoreResource` treats every
    // resource independently and does no global normalisation, so narrowing the
    // input here is identical in result to filtering the output, and avoids
    // scoring four thousand resources once per scheduled milestone.
    fullCatalog().filter((r) => r.skills.some((skill) => input.gapTargets.has(skill))));

  for (const { resource } of ready) {
    if (input.chosenIds.has(resource.id)) continue;
    // Skip anything that cannot fit in what is left, unless nothing has been
    // scheduled yet, a learner with a tiny budget should still get one item.
    if (resource.estimatedHours > input.remainingHours * 1.35) continue;
    // Only schedule things that move a real gap.
    if (!resource.skills.some((s) => input.gapTargets.has(s))) continue;
    // Stop once the best remaining candidate barely moves the needle. A second
    // prompt-engineering guide after the first closes almost nothing, and a
    // padded plan is worse than a shorter honest one.
    if (input.initialDeficit > 0) {
      const share = marginalGain(resource, input.projected, input.career) / input.initialDeficit;
      if (share < MIN_MARGINAL_GAP) continue;
    }
    return resource;
  }
  return null;
}

/** Projects the learner will be able to build, ordered by difficulty. */
function pickProjects(
  projected: SkillVector,
  career: CareerGoal,
  budget: number): ProjectTemplate[] {
  const relevant = PROJECTS.filter((p) => p.careerTags.includes(career.id))
    .filter((p) => checkReadiness(p.prerequisites, projected).ready)
    .sort((a, b) => {
      const order = { beginner: 0, intermediate: 1, advanced: 2 } as const;
      const value = { low: 0, medium: 1, high: 2, 'very-high': 3 } as const;
      return order[a.difficulty] - order[b.difficulty] || value[b.portfolioValue] - value[a.portfolioValue];
    });

  const picked: ProjectTemplate[] = [];
  let spent = 0;
  for (const project of relevant) {
    if (spent + project.estimatedHours > budget) continue;
    picked.push(project);
    spent += project.estimatedHours;
    if (picked.length >= 5) break;
  }
  // A plan with no project at all is a worse outcome than a slightly over-budget
  // one, so guarantee at least the cheapest relevant option.
  if (picked.length === 0 && relevant.length > 0) picked.push(relevant[0]);
  return picked;
}

/**
 * Lay resources and projects onto weeks.
 *
 * A project is inserted after the resource that taught its headline skill, so
 * practice immediately follows theory rather than being bolted on at the end.
 */
function schedule(
  resources: LearningResource[],
  projects: ProjectTemplate[],
  weeklyHours: number,
  timelineMonths: number,
  startingVector: SkillVector): Milestone[] {
  const items: Array<{ kind: 'resource' | 'project'; resource?: LearningResource; project?: ProjectTemplate }> =
    [];

  const remainingProjects = [...projects];
  // Skills the learner will hold at each point in the plan. A project may only
  // be placed once this covers its prerequisites, otherwise the calendar would
  // ask someone to build an image classifier weeks before they study deep
  // learning, which is exactly the failure the prerequisite engine exists to
  // prevent.
  const acquired: SkillVector = new Map(startingVector);

  const placeReadyProjects = (justTaught: readonly string[]) => {
    // Loop until nothing more unlocks: finishing one project can satisfy the
    // prerequisites of another.
    for (;;) {
      const index = remainingProjects.findIndex(
        (p) =>
          checkReadiness(p.prerequisites, acquired).ready &&
          p.skills.some((s) => justTaught.includes(s)));
      if (index < 0) return;
      const [project] = remainingProjects.splice(index, 1);
      items.push({ kind: 'project', project });
      for (const skillId of project.skills) {
        acquired.set(skillId, Math.max(acquired.get(skillId) ?? 0, TAUGHT_LEVEL));
      }
    }
  };

  for (const resource of resources) {
    items.push({ kind: 'resource', resource });
    for (const skillId of resource.skills) {
      acquired.set(skillId, Math.max(acquired.get(skillId) ?? 0, TAUGHT_LEVEL));
    }
    placeReadyProjects(resource.skills);
  }

  // Anything still pending goes at the end, by which point the whole plan has
  // run and its prerequisites are satisfied.
  for (const project of remainingProjects) items.push({ kind: 'project', project });

  const milestones: Milestone[] = [];
  const totalWeeks = Math.max(1, Math.round(timelineMonths * WEEKS_PER_MONTH));
  let cursorWeek = 1;

  items.forEach((item, index) => {
    const hours = item.resource?.estimatedHours ?? item.project?.estimatedHours ?? 0;
    const weeks = Math.max(1, Math.ceil(hours / Math.max(1, weeklyHours)));
    const weekStart = cursorWeek;
    const weekEnd = Math.min(totalWeeks, cursorWeek + weeks - 1);

    milestones.push({
      id: item.resource ? `m-${item.resource.id}` : `m-${item.project!.id}`,
      order: index + 1,
      // Clamped: 26 weeks / 4.33 rounds up to month 7 in a 6-month plan, and a
      // milestone must never sit outside the timeline the learner chose.
      month: Math.min(timelineMonths, Math.max(1, Math.ceil(weekStart / WEEKS_PER_MONTH))),
      weekStart,
      weekEnd,
      kind: item.kind,
      title: item.resource?.title ?? item.project!.title,
      subtitle: item.resource
        ? `${item.resource.provider} · ${item.resource.level}`
        : `Project · ${item.project!.difficulty}`,
      resourceId: item.resource?.id,
      projectId: item.project?.id,
      skillsGained: item.resource?.skills ?? item.project!.skills,
      hours,
    });

    cursorWeek = weekEnd + 1;
  });

  return milestones;
}

/** Group milestones by calendar month for the roadmap view. */
export function byMonth(roadmap: Roadmap): Array<{ month: number; milestones: Milestone[] }> {
  const map = new Map<number, Milestone[]>();
  for (const milestone of roadmap.milestones) {
    const list = map.get(milestone.month) ?? [];
    list.push(milestone);
    map.set(milestone.month, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, milestones]) => ({ month, milestones }));
}

/** The learning path as a readable skill sequence: current -> ... -> target. */
export function skillSequence(roadmap: Roadmap): string[] {
  const seen = new Set<string>();
  const sequence: string[] = [];
  for (const milestone of roadmap.milestones) {
    for (const skillId of milestone.skillsGained) {
      if (seen.has(skillId)) continue;
      seen.add(skillId);
      sequence.push(skillName(skillId));
    }
  }
  return sequence;
}

/** Resolve a milestone back to its full resource record. */
export function milestoneResource(milestone: Milestone): LearningResource | undefined {
  return milestone.resourceId ? getResource(milestone.resourceId) : undefined;
}
