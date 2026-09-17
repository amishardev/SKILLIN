/**
 * Hybrid recommendation engine.
 *
 * Three models, combined:
 *   1. Content-based, cosine similarity between learner and resource vectors.
 *   2. Skill-gap, how much of the *target role's* deficit a resource closes.
 *   3. Hybrid, weighted combination, minus a redundancy penalty,
 *                       gated by prerequisite readiness.
 *
 * All of it is deterministic. Gemini never sees this stage; it is only asked to
 * phrase an explanation for a decision that has already been made here.
 */

import { RESOURCES, type LearningResource } from '@/data/resources';
import { getCareer, type CareerGoal } from '@/data/careers';
import { skillName } from '@/data/skills';
import { cosineSimilarity, levelOf } from '@/lib/skills/vector';
import { gapAffinity, gapEmbedding } from '@/lib/embeddings';
import { scoreQuality } from './quality';
import {
  checkReadiness,
  readinessScore,
  unlockedBy,
  getPrerequisiteGraph,
} from './prerequisites';
import {
  DEFAULT_WEIGHTS,
  MAX_RECOMMENDATIONS,
  REDUNDANCY_MASTERY_THRESHOLD,
  type RankingWeights,
} from './config';
import {
  SKILL_CONFIRMED_THRESHOLD,
  type Recommendation,
  type RecommendationExplanation,
  type RecommendationScore,
  type SkillGap,
  type SkillVector,
  type StudentSkill,
} from '@/types';

// ══════════════════════════════════════════════════════════
// Model 2 inputs: the skill gap toward a target role
// ══════════════════════════════════════════════════════════

/**
 * What stands between the learner and the role, largest gap first.
 */
export function computeSkillGaps(vector: SkillVector, career: CareerGoal): SkillGap[] {
  return career.skills
    .map(({ skillId, weight }) => {
      const current = levelOf(vector, skillId);
      const gap = Math.max(0, weight - current);
      const status: SkillGap['status'] =
        current >= SKILL_CONFIRMED_THRESHOLD
          ? 'confirmed'
          : current > 0.15
            ? 'developing'
            : 'missing';
      return { skillId, skillName: skillName(skillId), required: weight, current, gap, status };
    })
    .sort((a, b) => b.gap - a.gap || b.required - a.required);
}

/** Career readiness as a transparent, component-wise heuristic. */
export function computeCareerReadiness(
  vector: SkillVector,
  career: CareerGoal,
  counts: { projects: number; experienceMonths: number }) {
  const required = career.skills.filter((s) => s.required);
  const skillsScore =
    required.length === 0
      ? 0
      : required.reduce((sum, s) => sum + Math.min(1, levelOf(vector, s.skillId) / s.weight), 0) /
        required.length;

  // Three solid projects is treated as a full portfolio signal.
  const projectsScore = Math.min(1, counts.projects / 3);
  // Twelve months of relevant experience saturates the experience component.
  const experienceScore = Math.min(1, counts.experienceMonths / 12);

  const foundations = career.foundations;
  const prerequisitesScore =
    foundations.length === 0
      ? 1
      : foundations.reduce((sum, f) => sum + Math.min(1, levelOf(vector, f) / 0.6), 0) /
        foundations.length;

  const components = {
    skills: skillsScore,
    projects: projectsScore,
    experience: experienceScore,
    prerequisites: prerequisitesScore,
  };

  // Skills dominate; the rest are corroboration.
  const overall =
    components.skills * 0.5 +
    components.projects * 0.2 +
    components.experience * 0.15 +
    components.prerequisites * 0.15;

  return { overall, components };
}

// ══════════════════════════════════════════════════════════
// Individual signals
// ══════════════════════════════════════════════════════════

/**
 * The learner's remaining-gap direction, derived from the scoring context.
 * Callers that score many resources should compute this once and pass it in.
 */
export function gapVectorFor(ctx: ScoringContext): readonly number[] {
  return gapEmbedding(computeSkillGaps(ctx.vector, ctx.career));
}

/** A resource as a skill vector, every skill it teaches, at full weight. */
function resourceVector(resource: LearningResource): SkillVector {
  return new Map(resource.skills.map((s) => [s, 1]));
}

/**
 * Model 2. How much of the role's weighted deficit does this resource close?
 * Only skills the role actually needs count, so a well-made but irrelevant
 * resource scores zero here.
 */
export function skillGapScore(
  resource: LearningResource,
  vector: SkillVector,
  career: CareerGoal): number {
  const needed = new Map(career.skills.map((s) => [s.skillId, s.weight]));
  let closed = 0;
  let totalDeficit = 0;

  for (const [skillId, weight] of needed) {
    const deficit = Math.max(0, weight - levelOf(vector, skillId));
    totalDeficit += deficit;
    if (resource.skills.includes(skillId)) closed += deficit;
  }

  return totalDeficit > 0 ? closed / totalDeficit : 0;
}

/** How much of the role's required-skill weight this resource covers at all. */
function careerMatchScore(resource: LearningResource, career: CareerGoal): number {
  const required = career.skills.filter((s) => s.required);
  if (required.length === 0) return 0;

  const taught = new Set(resource.skills);
  let matched = 0;
  let total = 0;
  for (const s of required) {
    total += s.weight;
    if (taught.has(s.skillId)) matched += s.weight;
  }

  // A direct career tag is corroborating evidence, not a substitute for skills.
  const tagBonus = resource.careerTags.includes(career.id) ? 0.15 : 0;
  return Math.min(1, (total > 0 ? matched / total : 0) + tagBonus);
}

/**
 * Redundancy. Penalises resources whose content the learner has already
 * mastered, this is what stops a strong Python programmer being handed
 * "Python for Beginners".
 */
export function redundancyPenalty(resource: LearningResource, vector: SkillVector): number {
  if (resource.skills.length === 0) return 0;

  let masteredWeight = 0;
  for (const skillId of resource.skills) {
    const level = levelOf(vector, skillId);
    // Mastery above the threshold is fully redundant; below it, partially.
    masteredWeight +=
      level >= REDUNDANCY_MASTERY_THRESHOLD ? 1 : level / REDUNDANCY_MASTERY_THRESHOLD;
  }

  const fraction = masteredWeight / resource.skills.length;

  // A beginner-level resource on already-mastered ground is the worst case,
  // so level amplifies the penalty rather than being a separate term.
  const levelMultiplier = resource.level === 'beginner' ? 1.25 : resource.level === 'intermediate' ? 1 : 0.8;
  return Math.min(1, fraction * levelMultiplier);
}

/** Overlap between a resource and skills the learner proved through doing. */
function evidenceMatch(resource: LearningResource, evidenceSkills: readonly string[]): number {
  if (resource.skills.length === 0 || evidenceSkills.length === 0) return 0;
  const taught = new Set(resource.skills);
  const overlap = new Set(evidenceSkills.filter((s) => taught.has(s))).size;
  return Math.min(1, overlap / resource.skills.length);
}

/** Does this resource cover ground the learner's certificates already claim? */
function certificateGapScore(
  resource: LearningResource,
  certificateSkills: readonly string[]): number {
  if (resource.skills.length === 0) return 0;
  const certified = new Set(certificateSkills);
  const uncertified = resource.skills.filter((s) => !certified.has(s)).length;
  return uncertified / resource.skills.length;
}

// ══════════════════════════════════════════════════════════
// Model 3: hybrid scoring
// ══════════════════════════════════════════════════════════

export interface ScoringContext {
  vector: SkillVector;
  career: CareerGoal;
  /**
   * The learner's remaining-gap direction in embedding space.
   *
   * Optional and cached by the caller: it depends only on the profile and goal,
   * so computing it once and reusing it across thousands of resources is the
   * difference between a responsive catalog and a stalled one. When absent it
   * is derived on demand.
   */
  gapVector?: readonly number[];
  projectSkills: string[];
  experienceSkills: string[];
  academicSkills: string[];
  certificateSkills: string[];
  /** Resources already completed, never recommended again. */
  completedResourceIds?: string[];
  weights?: RankingWeights;
}

export function scoreResource(
  resource: LearningResource,
  ctx: ScoringContext): RecommendationScore {
  const w = ctx.weights ?? DEFAULT_WEIGHTS;
  const vec = ctx.vector;

  const similarity = cosineSimilarity(vec, resourceVector(resource));
  const gap = skillGapScore(resource, vec, ctx.career);
  const affinity = gapAffinity(resource, ctx.gapVector ?? gapVectorFor(ctx));
  const career = careerMatchScore(resource, ctx.career);
  const redundancy = redundancyPenalty(resource, vec);
  const projectMatch = evidenceMatch(resource, ctx.projectSkills);
  const experienceMatch = evidenceMatch(resource, ctx.experienceSkills);
  const academicMatch = evidenceMatch(resource, ctx.academicSkills);
  const certificateGap = certificateGapScore(resource, ctx.certificateSkills);
  const quality = scoreQuality(resource).total;

  const readiness = checkReadiness(resource.prerequisites, vec);

  const raw =
    w.academicMatch * academicMatch +
    w.projectMatch * projectMatch +
    w.experienceMatch * experienceMatch +
    w.certificateGap * certificateGap +
    w.skillGap * gap +
    w.careerMatch * career +
    w.similarity * similarity +
    w.gapAffinity * affinity +
    w.quality * quality -
    w.redundancyLambda * redundancy;

  const total = Math.min(1, Math.max(0, raw));

  const skillsGained = resource.skills.filter(
    (s) => levelOf(vec, s) < SKILL_CONFIRMED_THRESHOLD);
  const skillsReinforced = resource.skills.filter(
    (s) => levelOf(vec, s) >= SKILL_CONFIRMED_THRESHOLD);

  return {
    resourceId: resource.id,
    total,
    academicMatch,
    projectMatch,
    experienceMatch,
    certificateGap,
    skillGap: gap,
    careerMatch: career,
    similarity,
    gapAffinity: affinity,
    redundancyPenalty: redundancy,
    qualityScore: quality,
    prerequisiteReady: readiness.ready,
    prerequisiteMissing: readiness.missing,
    skillsGained,
    skillsReinforced,
  };
}

export interface RankedResource {
  resource: LearningResource;
  score: RecommendationScore;
}

/**
 * Rank every catalog resource for this learner.
 *
 * Prerequisite-unsafe resources are *excluded* from the main list rather than
 * merely demoted, recommending something a learner cannot start is worse than
 * recommending nothing. They are returned separately as "not ready yet", with
 * the specific missing prerequisite named.
 */
export function rankResources(
  ctx: ScoringContext,
  catalog: readonly LearningResource[] = RESOURCES): { ready: RankedResource[]; blocked: RankedResource[] } {
  const completed = new Set(ctx.completedResourceIds ?? []);
  const ready: RankedResource[] = [];
  const blocked: RankedResource[] = [];

  for (const resource of catalog) {
    if (completed.has(resource.id)) continue;

    const score = scoreResource(resource, ctx);
    if (score.total <= 0 && score.skillsGained.length === 0) continue;

    if (score.prerequisiteReady) ready.push({ resource, score });
    else blocked.push({ resource, score });
  }

  ready.sort((a, b) => b.score.total - a.score.total || a.resource.id.localeCompare(b.resource.id));

  // Blocked items are ordered by how close the learner is to unlocking them,
  // so "almost ready" surfaces above "needs three more prerequisites".
  blocked.sort((a, b) => {
    const ra = readinessScore(a.resource.prerequisites, ctx.vector);
    const rb = readinessScore(b.resource.prerequisites, ctx.vector);
    return rb - ra || b.score.total - a.score.total;
  });

  return { ready, blocked };
}

/**
 * Top-K with diversity.
 *
 * Without this, the top five are often five resources teaching the same gap.
 * A skill already covered by a higher-ranked pick is discounted, which spreads
 * recommendations across the learner's actual deficits.
 */
export function topK(
  ctx: ScoringContext,
  k = 5,
  catalog: readonly LearningResource[] = RESOURCES): RankedResource[] {
  const { ready } = rankResources(ctx, catalog);
  const limit = Math.min(k, MAX_RECOMMENDATIONS);
  const picked: RankedResource[] = [];
  const covered = new Set<string>();

  const pool = [...ready];

  while (picked.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const fresh = candidate.score.skillsGained.filter((s) => !covered.has(s)).length;
      const totalNew = Math.max(1, candidate.score.skillsGained.length);
      // Full credit for entirely new ground, halved when fully overlapping.
      const diversity = 0.5 + 0.5 * (fresh / totalNew);
      const value = candidate.score.total * diversity;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }

    const [chosen] = pool.splice(bestIndex, 1);
    picked.push(chosen);
    for (const s of chosen.score.skillsGained) covered.add(s);
  }

  return picked;
}

// ══════════════════════════════════════════════════════════
// Explanations
// ══════════════════════════════════════════════════════════

/**
 * Build the explanation from facts the engine already computed.
 * Deterministic, the AI layer may rewrite the prose, never the facts.
 */
export function explainRecommendation(
  resource: LearningResource,
  score: RecommendationScore,
  skills: StudentSkill[],
  career: CareerGoal): RecommendationExplanation {
  const confirmed = skills.filter((s) => s.score >= SKILL_CONFIRMED_THRESHOLD);
  const gaps = computeSkillGaps(new Map(skills.map((s) => [s.skillId, s.score])), career);

  const youKnow = confirmed
    .filter((s) => resource.skills.includes(s.skillId) || career.skills.some((c) => c.skillId === s.skillId))
    .slice(0, 5)
    .map((s) => s.skillName);

  const youDemonstrated = confirmed
    .filter((s) => s.evidenceTypes.some((e) => e === 'project' || e === 'internship' || e === 'work'))
    .slice(0, 4)
    .map((s) => s.skillName);

  const youAreMissing = score.skillsGained.map(skillName).slice(0, 5);

  const graph = getPrerequisiteGraph();
  const unlocks = [
    ...new Set(resource.skills.flatMap((s) => unlockedBy(s, graph))),
  ]
    .filter((s) => !resource.skills.includes(s))
    .slice(0, 4)
    .map(skillName);

  const why = composeWhy({
    resourceTitle: resource.title,
    careerTitle: career.title,
    youKnow,
    youDemonstrated,
    youAreMissing,
    reinforced: score.skillsReinforced.map(skillName),
    // When the explicit gap term is near zero but the embedding term is
    // strong, adjacency is the actual reason this surfaced, and saying so is
    // more honest than implying a direct skill match.
    adjacencyDrove: score.skillGap < 0.05 && score.gapAffinity > 0.45,
    nearestGaps: gaps
      .filter((g) => g.gap > 0.1)
      .slice(0, 2)
      .map((g) => g.skillName),
  });

  return { youKnow, youDemonstrated, youAreMissing, unlocks, careerGoal: career.title, why };
}

/** Deterministic prose, used as-is when no AI key is configured. */
function composeWhy(input: {
  resourceTitle: string;
  careerTitle: string;
  youKnow: string[];
  youDemonstrated: string[];
  youAreMissing: string[];
  reinforced: string[];
  adjacencyDrove: boolean;
  nearestGaps: string[];
}): string {
  const sentences: string[] = [];

  if (input.youDemonstrated.length > 0) {
    sentences.push(
      `You already demonstrate ${list(input.youDemonstrated.slice(0, 3))} through your projects and experience.`);
  } else if (input.youKnow.length > 0) {
    sentences.push(`You already have ${list(input.youKnow.slice(0, 3))} in your profile.`);
  } else {
    sentences.push(`Your profile doesn't show these skills yet, so this is a starting point.`);
  }

  if (input.youAreMissing.length > 0) {
    sentences.push(
      `${input.careerTitle} needs ${list(input.youAreMissing.slice(0, 3))}, which is the largest prerequisite-safe gap in your profile right now.`);
  }

  if (input.adjacencyDrove && input.nearestGaps.length > 0) {
    sentences.push(
      `It isn't tagged with ${list(input.nearestGaps)}, but it sits right beside them in the skill map built from how topics co-occur across the catalog, so it moves you toward ${input.careerTitle} anyway.`);
  }

  if (input.reinforced.length > 0) {
    sentences.push(`It builds on your ${list(input.reinforced.slice(0, 2))} rather than repeating it.`);
  }

  return sentences.join(' ');
}

function list(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Package ranked results as storable Recommendation records. */
export function toRecommendations(
  ranked: RankedResource[],
  skills: StudentSkill[],
  careerId: string): Recommendation[] {
  const career = getCareer(careerId);
  if (!career) return [];
  const generatedAt = new Date().toISOString();

  return ranked.map((item, index) => ({
    rank: index + 1,
    resourceId: item.resource.id,
    score: item.score,
    explanation: explainRecommendation(item.resource, item.score, skills, career),
    generatedAt,
  }));
}
