import raw from '@/data/embeddings.generated.json';
import type { LearningResource } from '@/data/resources';
import type { CareerGoal } from '@/data/careers';
import type { SkillGap, SkillVector } from '@/types';

/**
 * Dense skill embeddings.
 *
 * Built offline by `scripts/build-embeddings.mjs` from how skills co-occur
 * across the whole catalog: co-occurrence → PPMI → eigendecomposition. Skills
 * that keep company end up close in the space without anyone declaring them
 * related, which is what lets the recommender reach resources whose literal
 * skill tags miss but whose subject matter lands.
 *
 * Everything here is pure vector arithmetic over a 28 KB table, no model
 * download, no API key, no network call, identical results every run.
 */

interface EmbeddingFile {
  generatedAt: string;
  method: string;
  dims: number;
  documents: number;
  skills: string[];
  vectors: number[][];
}

const file = raw as unknown as EmbeddingFile;

export const EMBEDDING_DIMS = file.dims;
export const embeddingsGeneratedAt = file.generatedAt;
export const embeddingCorpusSize = file.documents;

const INDEX: ReadonlyMap<string, number> = new Map(file.skills.map((id, i) => [id, i]));
const ZERO: readonly number[] = new Array(file.dims).fill(0);

/** The embedding for one skill, or a zero vector when it has no signal. */
export function skillEmbedding(skillId: string): readonly number[] {
  const i = INDEX.get(skillId);
  return i === undefined ? ZERO : file.vectors[i];
}

/** True when this skill actually has a direction in the space. */
export function hasEmbedding(skillId: string): boolean {
  const vec = skillEmbedding(skillId);
  return vec.some((x) => x !== 0);
}

// ══════════════════════════════════════════════════════════
// Vector arithmetic
// ══════════════════════════════════════════════════════════

/** Cosine similarity of two unit-ish vectors. Returns 0 if either is empty. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Weighted centroid of several skills, L2-normalised. */
export function combine(weighted: Iterable<[skillId: string, weight: number]>): readonly number[] {
  const out = new Array<number>(file.dims).fill(0);
  let any = false;

  for (const [skillId, weight] of weighted) {
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const vec = skillEmbedding(skillId);
    for (let i = 0; i < file.dims; i++) out[i] += vec[i] * weight;
    any = true;
  }
  if (!any) return ZERO;

  let norm = 0;
  for (const x of out) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm < 1e-9) return ZERO;

  for (let i = 0; i < file.dims; i++) out[i] /= norm;
  return out;
}

// ══════════════════════════════════════════════════════════
// Domain vectors
// ══════════════════════════════════════════════════════════

/** Where a resource sits: the centroid of what it teaches. */
export function resourceEmbedding(resource: LearningResource): readonly number[] {
  return combine(resource.skills.map((s) => [s, 1] as [string, number]));
}

/** Where the learner sits: their skills, weighted by how well they hold them. */
export function learnerEmbedding(vector: SkillVector): readonly number[] {
  return combine(vector);
}

/** Where the target role sits: its requirements, weighted by importance. */
export function careerEmbedding(career: CareerGoal): readonly number[] {
  return combine(career.skills.map((s) => [s.skillId, s.weight] as [string, number]));
}

/**
 * The direction of travel, what the learner still needs.
 *
 * Not the career vector, and not the difference between two centroids: it is
 * the centroid of the role's requirements weighted by *remaining deficit*. A
 * skill already held contributes nothing, so the vector points precisely at the
 * work left to do. Resources aligned with it are the ones that close ground.
 */
export function gapEmbedding(gaps: readonly SkillGap[]): readonly number[] {
  return combine(gaps.map((g) => [g.skillId, g.gap] as [string, number]));
}

/**
 * How well a resource matches the learner's remaining gap.
 *
 * Returns 0 when the gap has no direction (nothing left to learn, or every
 * remaining skill is too rare to have an embedding) so the caller falls back to
 * the explicit skill-gap term rather than acting on noise.
 */
export function gapAffinity(
  resource: LearningResource,
  gapVector: readonly number[]): number {
  if (gapVector === ZERO) return 0;
  const similarity = cosine(resourceEmbedding(resource), gapVector);
  // Cosine runs −1..1; an anti-correlated resource is simply "not relevant"
  // rather than negatively so, so the range is clamped.
  return Math.max(0, similarity);
}

/** Nearest skills to a given one, for explanations and related rows. */
export function nearestSkills(skillId: string, k = 5): Array<{ skillId: string; score: number }> {
  const base = skillEmbedding(skillId);
  if (base === ZERO) return [];

  return file.skills
    .map((id, i) => ({ skillId: id, score: cosine(base, file.vectors[i]) }))
    .filter((x) => x.skillId !== skillId && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Resources closest to a given one in the embedding space. */
export function nearestResources(
  target: LearningResource,
  catalog: readonly LearningResource[],
  k = 12): LearningResource[] {
  const base = resourceEmbedding(target);
  if (base === ZERO) return [];

  return catalog
    .filter((r) => r.id !== target.id)
    .map((r) => ({ r, score: cosine(base, resourceEmbedding(r)) }))
    .filter((x) => x.score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.r);
}
