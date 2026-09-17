/**
 * Student skill vector construction.
 *
 * A skill claimed by three independent sources should outrank the same skill
 * claimed once. We therefore *combine* evidence with a noisy-OR rather than
 * taking a max or overwriting, so repeated corroboration raises confidence
 * with diminishing returns and can never exceed 1.
 */

import {
  EVIDENCE_WEIGHTS,
  SKILL_CONFIRMED_THRESHOLD,
  type EvidenceType,
  type ExtractedSkill,
  type SkillVector,
  type StudentProfile,
  type StudentSkill,
} from '@/types';
import { normalizeSkill, skillName } from '@/data/skills';

/**
 * Strength of a single piece of evidence: how trustworthy the *source* is,
 * scaled by how confident the extractor was, and discounted when the skill was
 * inferred rather than stated outright.
 */
export function evidenceStrength(item: ExtractedSkill): number {
  const sourceWeight = EVIDENCE_WEIGHTS[item.source] ?? EVIDENCE_WEIGHTS.self;
  const confidence = clamp01(item.confidence);
  const inferencePenalty = item.explicit ? 1 : 0.75;
  return clamp01(sourceWeight * confidence * inferencePenalty);
}

/**
 * Noisy-OR combination: P(skill) = 1 − Π(1 − strengthᵢ).
 *
 * Two 0.85 project signals give 0.9775, not 1.7, corroboration helps but
 * saturates, which is the behaviour we want for evidence that is correlated.
 */
export function combineEvidence(strengths: number[]): number {
  let complement = 1;
  for (const s of strengths) complement *= 1 - clamp01(s);
  return clamp01(1 - complement);
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Collect every skill claim in a profile, tagged with its evidence source.
 * Claims whose text does not resolve to a canonical skill are dropped, we do
 * not invent taxonomy entries from free text.
 */
export function collectSkillClaims(profile: StudentProfile): ExtractedSkill[] {
  const claims: ExtractedSkill[] = [];

  const push = (item: ExtractedSkill) => {
    const id = item.skillId ?? normalizeSkill(item.rawName);
    if (id) claims.push({ ...item, skillId: id });
  };

  for (const s of profile.declaredSkills) push(s);

  for (const project of profile.projects) {
    for (const s of project.skills) push({ ...s, source: 'project' });
    // Technology lists on a project are explicit statements of use.
    for (const tech of project.technologies) {
      push({
        skillId: null,
        rawName: tech,
        confidence: 0.85,
        source: 'project',
        evidence: `Used in project "${project.title}"`,
        explicit: true,
      });
    }
  }

  for (const exp of profile.experience) {
    for (const s of exp.skills) push({ ...s, source: exp.kind });
    for (const tech of exp.technologies) {
      push({
        skillId: null,
        rawName: tech,
        confidence: 0.9,
        source: exp.kind,
        evidence: `Used as ${exp.role} at ${exp.organization}`,
        explicit: true,
      });
    }
  }

  for (const cert of profile.certificates) {
    for (const raw of cert.skills) {
      push({
        skillId: null,
        rawName: raw,
        confidence: 0.8,
        source: 'certificate',
        evidence: `Certified: ${cert.title}`,
        explicit: true,
      });
    }
  }

  return claims;
}

/**
 * Build the ranked student skill list from all evidence in a profile.
 * Deterministic: the same profile always yields the same vector.
 */
export function buildStudentSkills(profile: StudentProfile): StudentSkill[] {
  const claims = collectSkillClaims(profile);
  const grouped = new Map<string, ExtractedSkill[]>();

  for (const claim of claims) {
    const id = claim.skillId;
    if (!id) continue;
    const bucket = grouped.get(id);
    if (bucket) bucket.push(claim);
    else grouped.set(id, [claim]);
  }

  const skills: StudentSkill[] = [];

  for (const [skillId, items] of grouped) {
    // Within one evidence type, only the strongest claim counts in full;
    // weaker duplicates from the same source are correlated, so they are
    // discounted heavily before being combined across sources.
    const byType = new Map<EvidenceType, number[]>();
    for (const item of items) {
      const list = byType.get(item.source) ?? [];
      list.push(evidenceStrength(item));
      byType.set(item.source, list);
    }

    const perTypeStrengths: number[] = [];
    for (const [, strengths] of byType) {
      strengths.sort((a, b) => b - a);
      const [strongest, ...rest] = strengths;
      const corroboration = rest.map((s) => s * 0.3);
      perTypeStrengths.push(combineEvidence([strongest, ...corroboration]));
    }

    const evidenceTypes = [...byType.keys()];
    const score = combineEvidence(perTypeStrengths);

    skills.push({
      skillId,
      skillName: skillName(skillId),
      score,
      evidenceTypes,
      evidence: dedupe(items.map((i) => i.evidence).filter(Boolean)).slice(0, 4),
      explicit: items.some((i) => i.explicit),
    });
  }

  return skills.sort((a, b) => b.score - a.score || a.skillName.localeCompare(b.skillName));
}

/** Student skills as a lookup vector. */
export function toVector(skills: StudentSkill[]): SkillVector {
  return new Map(skills.map((s) => [s.skillId, s.score]));
}

/** Mastery of a single skill, 0 when never demonstrated. */
export function levelOf(vector: SkillVector, skillId: string): number {
  return vector.get(skillId) ?? 0;
}

/** Skills the learner can genuinely claim. */
export function confirmedSkills(skills: StudentSkill[]): StudentSkill[] {
  return skills.filter((s) => s.score >= SKILL_CONFIRMED_THRESHOLD);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Cosine similarity between two sparse skill vectors.
 * Measures topical overlap only, it is deliberately a small term in ranking,
 * because high overlap often means the resource is redundant, not relevant.
 */
export function cosineSimilarity(a: SkillVector, b: SkillVector): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, valA] of a) {
    normA += valA * valA;
    const valB = b.get(key);
    if (valB !== undefined) dot += valA * valB;
  }
  for (const [, valB] of b) normB += valB * valB;

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
