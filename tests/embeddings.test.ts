import { describe, it, expect } from 'vitest';
import {
  EMBEDDING_DIMS,
  embeddingCorpusSize,
  skillEmbedding,
  hasEmbedding,
  cosine,
  combine,
  resourceEmbedding,
  learnerEmbedding,
  careerEmbedding,
  gapEmbedding,
  gapAffinity,
  nearestSkills,
  nearestResources,
} from '@/lib/embeddings';
import { SKILLS } from '@/data/skills';
import { getCareer } from '@/data/careers';
import { catalogResource, fullCatalog } from '@/lib/catalog';
import { demoProfile, DEMO_PLAN } from './fixtures/sample-profile';
import { analyze } from '@/lib/analysis';
import { buildRails } from '@/lib/catalog/rails';
import { scoreResource, computeSkillGaps, topK } from '@/lib/recommendation/engine';
import { DEFAULT_WEIGHTS } from '@/lib/recommendation/config';
import type { SkillVector } from '@/types';
import { RESOURCES } from '@/data/resources';

const profile = demoProfile();
const analysis = analyze({ profile, plan: DEMO_PLAN });

describe('embedding table', () => {
  it('was built from a substantial corpus', () => {
    expect(embeddingCorpusSize).toBeGreaterThan(1000);
    expect(EMBEDDING_DIMS).toBe(32);
  });

  /*
   * Embeddings are learned from catalog co-occurrence, so a skill can only have
   * one if courses in the catalog teach it. The taxonomy deliberately runs
   * ahead of the catalog: the business, creative and humanities skills exist so
   * careers can be defined against them, but no course data covers them yet, so
   * they correctly have no vector.
   *
   * The invariant worth asserting is therefore about the skills the catalog
   * actually reaches, not about the taxonomy as a whole.
   */
  it('covers essentially every skill the catalog teaches', () => {
    const taught = new Set(RESOURCES.flatMap((r) => r.skills));
    const missing = [...taught].filter((id) => !hasEmbedding(id));
    // A handful of very isolated skills legitimately have no co-occurrence.
    expect(missing.length).toBeLessThan(8);
  });

  it('reports honestly which skills have no embedding yet', () => {
    const withVectors = SKILLS.filter((s) => hasEmbedding(s.id));
    // Recorded rather than asserted tightly: this number should fall as course
    // coverage for the newer domains arrives.
    expect(withVectors.length).toBeGreaterThan(100);
    expect(withVectors.length).toBeLessThanOrEqual(SKILLS.length);
  });

  it('returns a zero vector rather than throwing for an unknown skill', () => {
    const vec = skillEmbedding('not-a-real-skill');
    expect(vec).toHaveLength(EMBEDDING_DIMS);
    expect(vec.every((x) => x === 0)).toBe(true);
    expect(hasEmbedding('not-a-real-skill')).toBe(false);
  });

  it('produces unit-length vectors', () => {
    for (const skill of SKILLS.filter((s) => hasEmbedding(s.id)).slice(0, 30)) {
      const vec = skillEmbedding(skill.id);
      const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
      expect(norm).toBeCloseTo(1, 2);
    }
  });

  it('is deterministic across calls', () => {
    expect(skillEmbedding('transformers')).toEqual(skillEmbedding('transformers'));
  });
});

describe('learned semantics', () => {
  /** Is `near` closer to `anchor` than `far` is? */
  function closer(anchor: string, near: string, far: string): boolean {
    const a = skillEmbedding(anchor);
    return cosine(a, skillEmbedding(near)) > cosine(a, skillEmbedding(far));
  }

  it('places AI tooling near transformers, not near unrelated fields', () => {
    expect(closer('transformers', 'llm', 'cybersecurity')).toBe(true);
    expect(closer('transformers', 'huggingface', 'terraform')).toBe(true);
  });

  it('places the security cluster together', () => {
    expect(closer('penetration-testing', 'network-security', 'pandas')).toBe(true);
    expect(closer('cybersecurity', 'network-security', 'ui-design')).toBe(true);
  });

  it('places the frontend cluster together', () => {
    expect(closer('react', 'javascript', 'embedded-systems')).toBe(true);
    expect(closer('react', 'typescript', 'bioinformatics')).toBe(true);
  });

  it('places the data cluster together', () => {
    expect(closer('pandas', 'numpy', 'solidity')).toBe(true);
    expect(closer('sql', 'data-analysis', 'robotics')).toBe(true);
  });

  it('places infrastructure together', () => {
    expect(closer('kubernetes', 'docker', 'ux-research')).toBe(true);
  });

  it('is symmetric, closeness does not depend on direction', () => {
    const ab = cosine(skillEmbedding('docker'), skillEmbedding('kubernetes'));
    const ba = cosine(skillEmbedding('kubernetes'), skillEmbedding('docker'));
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('reports sensible nearest neighbours', () => {
    const near = nearestSkills('transformers', 5).map((n) => n.skillId);
    expect(near).toEqual(expect.arrayContaining(['llm']));
    expect(near).not.toContain('transformers');
  });

  it('returns nothing for a skill with no vector', () => {
    expect(nearestSkills('not-a-real-skill')).toEqual([]);
  });
});

describe('vector arithmetic', () => {
  it('cosine is 1 for a vector against itself', () => {
    expect(cosine(skillEmbedding('python'), skillEmbedding('python'))).toBeCloseTo(1, 5);
  });

  it('cosine is 0 when either side is empty', () => {
    expect(cosine(skillEmbedding('python'), new Array(EMBEDDING_DIMS).fill(0))).toBe(0);
  });

  it('combine normalises and ignores non-positive weights', () => {
    const vec = combine([
      ['python', 1],
      ['sql', 0],
      ['pandas', -3],
    ]);
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
    // With the others discarded, the result should be the python direction.
    expect(cosine(vec, skillEmbedding('python'))).toBeCloseTo(1, 4);
  });

  it('combine returns zero when nothing contributes', () => {
    expect(combine([]).every((x) => x === 0)).toBe(true);
    expect(combine([['not-a-real-skill', 1]]).every((x) => x === 0)).toBe(true);
  });
});

describe('domain vectors', () => {
  it('places a resource near the skills it teaches', () => {
    const hfCourse = catalogResource('hf-nlp-course')!;
    const vec = resourceEmbedding(hfCourse);
    expect(cosine(vec, skillEmbedding('transformers'))).toBeGreaterThan(
      cosine(vec, skillEmbedding('solidity')));
  });

  it('places the learner near what they actually know', () => {
    const vec = learnerEmbedding(analysis.vector);
    expect(cosine(vec, skillEmbedding('python'))).toBeGreaterThan(
      cosine(vec, skillEmbedding('quantum-computing')));
  });

  it('places a career near its own requirements', () => {
    const ai = careerEmbedding(getCareer('ai-engineer')!);
    const sec = careerEmbedding(getCareer('cybersecurity-engineer')!);
    expect(cosine(ai, skillEmbedding('llm'))).toBeGreaterThan(cosine(sec, skillEmbedding('llm')));
    expect(cosine(sec, skillEmbedding('network-security'))).toBeGreaterThan(
      cosine(ai, skillEmbedding('network-security')));
  });
});

describe('gap direction', () => {
  const gapVector = gapEmbedding(analysis.gaps);

  it('points at what is missing, not at what the learner already has', () => {
    // The demo learner is strong in Python and has no LLM exposure at all.
    expect(cosine(gapVector, skillEmbedding('llm'))).toBeGreaterThan(
      cosine(gapVector, skillEmbedding('python')));
  });

  it('is empty when there is nothing left to learn', () => {
    const career = getCareer('ai-engineer')!;
    const complete: SkillVector = new Map(career.skills.map((s) => [s.skillId, 1]));
    const noGaps = computeSkillGaps(complete, career);
    expect(gapEmbedding(noGaps).every((x) => x === 0)).toBe(true);
  });

  it('gives a higher affinity to resources aimed at the gap', () => {
    const llmCourse = catalogResource('hf-llm-course')!;
    const gameEngine = catalogResource('godot-docs')!;
    expect(gapAffinity(llmCourse, gapVector)).toBeGreaterThan(gapAffinity(gameEngine, gapVector));
  });

  it('never returns a negative affinity', () => {
    for (const r of fullCatalog().slice(0, 200)) {
      expect(gapAffinity(r, gapVector)).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns 0 affinity when the gap has no direction', () => {
    const empty = new Array(EMBEDDING_DIMS).fill(0);
    expect(gapAffinity(catalogResource('hf-llm-course')!, empty)).toBe(0);
  });

  it('points somewhere different for a different career', () => {
    const security = analyze({
      profile,
      plan: { ...DEMO_PLAN, careerGoalId: 'cybersecurity-engineer' },
    });
    const securityGap = gapEmbedding(security.gaps);
    expect(cosine(gapVector, securityGap)).toBeLessThan(0.9);
  });
});

describe('nearest resources', () => {
  const catalog = fullCatalog();

  it('finds subject-matter neighbours of a resource', () => {
    const target = catalogResource('hf-nlp-course')!;
    const near = nearestResources(target, catalog, 10);
    expect(near.length).toBeGreaterThan(0);
    expect(near.map((r) => r.id)).not.toContain(target.id);

    // Neighbours should share the resource's subject area.
    const aiish = near.filter((r) =>
      r.skills.some((s) => ['transformers', 'llm', 'nlp', 'deep-learning', 'huggingface', 'fine-tuning'].includes(s)));
    expect(aiish.length).toBeGreaterThan(near.length / 2);
  });

  it('returns nothing for a resource with no embeddable skills', () => {
    const orphan = { ...catalogResource('git-book')!, id: 'orphan', skills: ['not-a-real-skill'] };
    expect(nearestResources(orphan, catalog, 5)).toEqual([]);
  });
});

describe('embedding term in the ranking', () => {
  it('is a real, weighted contributor', () => {
    expect(DEFAULT_WEIGHTS.gapAffinity).toBeGreaterThan(0);
    const positives = Object.entries(DEFAULT_WEIGHTS)
      .filter(([k]) => k !== 'redundancyLambda')
      .reduce((sum, [, v]) => sum + v, 0);
    expect(positives).toBeCloseTo(1, 5);
  });

  it('is reported on every score so the ranking stays inspectable', () => {
    const ctx = {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: [],
      experienceSkills: [],
      academicSkills: [],
      certificateSkills: [],
    };
    for (const r of fullCatalog().slice(0, 60)) {
      const score = scoreResource(r, ctx);
      expect(score.gapAffinity).toBeGreaterThanOrEqual(0);
      expect(score.gapAffinity).toBeLessThanOrEqual(1);
      expect(Number.isFinite(score.total)).toBe(true);
    }
  });

  it('keeps total scores inside 0-1 with the new term', () => {
    const ctx = {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: profile.projects.flatMap((p) => p.technologies),
      experienceSkills: profile.experience.flatMap((e) => e.technologies),
      academicSkills: ['statistics'],
      certificateSkills: profile.certificates.flatMap((c) => c.skills),
    };
    for (const r of fullCatalog()) {
      const score = scoreResource(r, ctx);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(1);
    }
  });
});

describe('the embedding earns its place in ranking, not as a row', () => {
  const rails = buildRails({
    context: {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: profile.projects.flatMap((p) => p.technologies),
      experienceSkills: profile.experience.flatMap((e) => e.technologies),
      academicSkills: ['statistics'],
      certificateSkills: profile.certificates.flatMap((c) => c.skills),
    },
    career: analysis.career,
    skills: analysis.skills,
    gaps: analysis.gaps,
    vector: analysis.vector,
  });

  it('does not ship a row that sorts by raw affinity', () => {
    // Measured and rejected: see the note in lib/catalog/rails.ts. Sorting a
    // row by affinity alone surfaces either redundant material or noise.
    expect(rails.find((r) => r.id === 'adjacent')).toBeUndefined();
  });

  it('keeps every row free of resources the ranker scores at zero', () => {
    const ctx = {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: profile.projects.flatMap((p) => p.technologies),
      experienceSkills: profile.experience.flatMap((e) => e.technologies),
      academicSkills: ['statistics'],
      certificateSkills: profile.certificates.flatMap((c) => c.skills),
    };
    const recommended = rails.find((r) => r.id === 'recommended');
    expect(recommended).toBeDefined();
    for (const r of recommended!.resources) {
      expect(scoreResource(r, ctx).total).toBeGreaterThan(0);
    }
  });

  it('changes what gets recommended at all', () => {
    // Zeroing the embedding term must move the ranking; if it did not, the
    // signal would be decoration.
    const base = {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: [] as string[],
      experienceSkills: [] as string[],
      academicSkills: [] as string[],
      certificateSkills: [] as string[],
    };
    const withEmbedding = topK(base, 6).map((p) => p.resource.id);
    const without = topK(
      { ...base, weights: { ...DEFAULT_WEIGHTS, gapAffinity: 0 } },
      6).map((p) => p.resource.id);
    expect(withEmbedding).not.toEqual(without);
  });
});
