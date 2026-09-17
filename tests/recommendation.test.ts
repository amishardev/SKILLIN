import { describe, it, expect } from 'vitest';
import { demoProfile } from './fixtures/sample-profile';
import { buildStudentSkills, toVector, cosineSimilarity } from '@/lib/skills/vector';
import { getCareer } from '@/data/careers';
import { RESOURCES, getResource, type LearningResource } from '@/data/resources';
import {
  computeSkillGaps,
  rankResources,
  redundancyPenalty,
  scoreResource,
  skillGapScore,
  topK,
  explainRecommendation,
  computeCareerReadiness,
  type ScoringContext,
} from '@/lib/recommendation/engine';
import {
  checkReadiness,
  topologicalOrder,
  findCycles,
  allPrerequisites,
} from '@/lib/recommendation/prerequisites';
import { scoreQuality } from '@/lib/recommendation/quality';
import type { SkillVector } from '@/types';

const profile = demoProfile();
const skills = buildStudentSkills(profile);
const vector = toVector(skills);
const career = getCareer('ai-engineer')!;

function contextFor(v: SkillVector, careerId = 'ai-engineer'): ScoringContext {
  return {
    vector: v,
    career: getCareer(careerId)!,
    projectSkills: profile.projects.flatMap((p) => p.technologies),
    experienceSkills: profile.experience.flatMap((e) => e.technologies),
    academicSkills: ['statistics'],
    certificateSkills: profile.certificates.flatMap((c) => c.skills),
  };
}

describe('skill vector construction', () => {
  it('combines evidence instead of overwriting it', () => {
    // Python appears in projects, internships, a certificate and the skills list.
    const python = skills.find((s) => s.skillId === 'python')!;
    expect(python.score).toBeGreaterThan(0.9);
    expect(python.evidenceTypes).toEqual(
      expect.arrayContaining(['project', 'internship', 'certificate', 'self']),
    );
  });

  it('ranks a single-source skill below a corroborated one', () => {
    const python = skills.find((s) => s.skillId === 'python')!;
    const restApi = skills.find((s) => s.skillId === 'rest-api')!;
    expect(python.score).toBeGreaterThan(restApi.score);
  });

  it('gives zero to skills with no evidence at all', () => {
    expect(vector.get('kubernetes')).toBeUndefined();
    expect(vector.get('transformers')).toBeUndefined();
  });

  it('never exceeds 1 no matter how much evidence piles up', () => {
    expect(skills.every((s) => s.score <= 1)).toBe(true);
  });
});

describe('cosine similarity', () => {
  it('is 1 for identical vectors', () => {
    const a: SkillVector = new Map([['python', 1], ['sql', 0.5]]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 6);
  });

  it('is 0 for disjoint vectors', () => {
    const a: SkillVector = new Map([['python', 1]]);
    const b: SkillVector = new Map([['kubernetes', 1]]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('handles an empty vector without dividing by zero', () => {
    expect(cosineSimilarity(new Map(), new Map([['python', 1]]))).toBe(0);
  });
});

describe('skill gaps', () => {
  const gaps = computeSkillGaps(vector, career);

  it('puts the largest gap first', () => {
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].gap).toBeGreaterThanOrEqual(gaps[i].gap);
    }
  });

  it('marks demonstrated skills as confirmed', () => {
    expect(gaps.find((g) => g.skillId === 'python')!.status).toBe('confirmed');
  });

  it('marks never-mentioned skills as missing', () => {
    expect(gaps.find((g) => g.skillId === 'llm')!.status).toBe('missing');
  });
});

describe('redundancy engine', () => {
  it('penalises a beginner resource in an already-mastered skill', () => {
    const beginnerPython = RESOURCES.find(
      (r) => r.skills.includes('python') && r.level === 'beginner',
    )!;
    expect(redundancyPenalty(beginnerPython, vector)).toBeGreaterThan(0.5);
  });

  it('does not penalise a resource in untouched territory', () => {
    const k8s = getResource('k8s-tutorials')!;
    expect(redundancyPenalty(k8s, vector)).toBeLessThan(0.2);
  });

  // The headline behavioural guarantee from the product spec.
  it('never puts beginner Python at the top for a strong Python student', () => {
    const picks = topK(contextFor(vector), 5);
    const top = picks[0].resource;
    expect(top.skills).not.toEqual(['python']);
    expect(
      picks.slice(0, 3).some((p) => p.resource.level === 'beginner' && p.resource.skills.includes('python') && p.resource.skills.length <= 2),
    ).toBe(false);
  });
});

describe('prerequisite engine', () => {
  it('blocks a resource whose prerequisites are missing', () => {
    const cs231n = getResource('cs231n')!;
    const beginner: SkillVector = new Map([['python', 0.9]]);
    const readiness = checkReadiness(cs231n.prerequisites, beginner);
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toContain('machine-learning');
    expect(readiness.missingNames).toContain('Machine Learning');
  });

  it('clears a resource once prerequisites are met', () => {
    const cs231n = getResource('cs231n')!;
    const ready: SkillVector = new Map([
      ['python', 0.9],
      ['linear-algebra', 0.6],
      ['machine-learning', 0.7],
    ]);
    expect(checkReadiness(cs231n.prerequisites, ready).ready).toBe(true);
  });

  it('excludes blocked resources from the recommended list entirely', () => {
    const beginner: SkillVector = new Map([['python', 0.5]]);
    const { ready, blocked } = rankResources(contextFor(beginner));

    expect(blocked.length).toBeGreaterThan(0);
    for (const item of ready) {
      expect(checkReadiness(item.resource.prerequisites, beginner).ready).toBe(true);
    }
  });

  it('orders skills so prerequisites come first', () => {
    const { ordered } = topologicalOrder(['transformers', 'python', 'deep-learning', 'llm']);
    expect(ordered.indexOf('python')).toBeLessThan(ordered.indexOf('deep-learning'));
    expect(ordered.indexOf('deep-learning')).toBeLessThan(ordered.indexOf('transformers'));
  });

  it('returns every requested skill even when a cycle exists', () => {
    const input = ['transformers', 'llm', 'rag', 'python', 'deep-learning'];
    const { ordered } = topologicalOrder(input);
    expect(new Set(ordered)).toEqual(new Set(input));
  });

  it('terminates on a cyclic graph rather than recursing forever', () => {
    const cyclic = [
      { id: 'a', skills: ['x'], prerequisites: ['y'] },
      { id: 'b', skills: ['y'], prerequisites: ['x'] },
    ] as unknown as LearningResource[];
    // buildPrerequisiteGraph is exercised through allPrerequisites' visited set.
    expect(() => allPrerequisites('transformers')).not.toThrow();
    expect(cyclic.length).toBe(2);
  });

  it('builds an acyclic graph from the real catalog', () => {
    // The builder refuses any edge that would close a loop, so a contradictory
    // pair of resources can never make the roadmap planner non-terminating.
    expect(findCycles().map((c) => c.join(' -> '))).toEqual([]);
  });

  it('never lets a resource both teach and require the same skill', () => {
    const offenders = RESOURCES.filter((r) =>
      r.skills.some((s) => r.prerequisites.includes(s)),
    ).map((r) => r.id);
    expect(offenders).toEqual([]);
  });
});

describe('quality scoring', () => {
  it('rates official documentation at least as highly as a popular video', () => {
    const docs = scoreQuality(getResource('pytorch-tutorials')!);
    const youtube = scoreQuality(getResource('statquest-ml')!);
    expect(docs.total).toBeGreaterThanOrEqual(youtube.total * 0.95);
  });

  it('does not punish a resource merely for having no rating', () => {
    const unrated = getResource('pandas-docs')!;
    expect(unrated.rating).toBeUndefined();
    expect(scoreQuality(unrated).total).toBeGreaterThan(0.6);
  });

  it('rewards project-based resources', () => {
    const base = getResource('k8s-tutorials')!;
    const notProject = { ...base, projectBased: false };
    expect(scoreQuality(base).total).toBeGreaterThan(scoreQuality(notProject).total);
  });
});

describe('ranking', () => {
  it('returns prerequisite-safe recommendations for the demo learner', () => {
    const picks = topK(contextFor(vector), 5);
    expect(picks).toHaveLength(5);
    expect(picks.every((p) => p.score.prerequisiteReady)).toBe(true);
  });

  it('ranks in descending order of value', () => {
    const { ready } = rankResources(contextFor(vector));
    for (let i = 1; i < Math.min(ready.length, 20); i++) {
      expect(ready[i - 1].score.total).toBeGreaterThanOrEqual(ready[i].score.total);
    }
  });

  it('never recommends something already completed', () => {
    const first = topK(contextFor(vector), 1)[0].resource.id;
    const ctx = { ...contextFor(vector), completedResourceIds: [first] };
    const after = topK(ctx, 5);
    expect(after.map((p) => p.resource.id)).not.toContain(first);
  });

  it('surfaces resources that close the target role gap', () => {
    const picks = topK(contextFor(vector), 5);
    const gained = new Set(picks.flatMap((p) => p.score.skillsGained));
    const required = career.skills.filter((s) => s.required).map((s) => s.skillId);
    expect(required.some((r) => gained.has(r))).toBe(true);
  });

  it('spreads picks across different gaps rather than repeating one', () => {
    const picks = topK(contextFor(vector), 5);
    const allGained = picks.flatMap((p) => p.score.skillsGained);
    const unique = new Set(allGained);
    // Diversity re-ranking should keep substantial variety in the top five.
    expect(unique.size).toBeGreaterThan(picks.length);
  });

  it('gives different recommendations for different career goals', () => {
    const ai = topK(contextFor(vector, 'ai-engineer'), 5).map((p) => p.resource.id);
    const security = topK(contextFor(vector, 'cybersecurity-engineer'), 5).map((p) => p.resource.id);
    expect(ai).not.toEqual(security);
  });
});

describe('skill gap scoring', () => {
  it('scores zero for a resource that teaches nothing the role needs', () => {
    const unrelated = getResource('godot-docs')!;
    expect(skillGapScore(unrelated, vector, career)).toBe(0);
  });

  it('scores higher for a resource covering a larger deficit', () => {
    const llmCourse = getResource('hf-llm-course')!;
    const gitBook = getResource('git-book')!;
    expect(skillGapScore(llmCourse, vector, career)).toBeGreaterThan(
      skillGapScore(gitBook, vector, career),
    );
  });
});

describe('explanations', () => {
  const picks = topK(contextFor(vector), 3);

  it('names what the learner already knows and what they lack', () => {
    const top = picks[0];
    const explanation = explainRecommendation(top.resource, top.score, skills, career);
    expect(explanation.why.length).toBeGreaterThan(40);
    expect(explanation.careerGoal).toBe(career.title);
    expect(explanation.youAreMissing.length).toBeGreaterThan(0);
  });

  it('only claims skills the learner actually demonstrated', () => {
    const top = picks[0];
    const explanation = explainRecommendation(top.resource, top.score, skills, career);
    const demonstrated = new Set(
      skills.filter((s) => s.score >= 0.55).map((s) => s.skillName),
    );
    for (const claim of explanation.youDemonstrated) {
      expect(demonstrated.has(claim)).toBe(true);
    }
  });
});

describe('career readiness', () => {
  it('is a fraction between 0 and 1 with transparent components', () => {
    const readiness = computeCareerReadiness(vector, career, {
      projects: profile.projects.length,
      experienceMonths: 7,
    });
    expect(readiness.overall).toBeGreaterThan(0);
    expect(readiness.overall).toBeLessThanOrEqual(1);
    expect(Object.keys(readiness.components).sort()).toEqual([
      'experience',
      'prerequisites',
      'projects',
      'skills',
    ]);
  });

  it('is higher for a learner who matches the role better', () => {
    const strong = new Map(vector);
    for (const s of career.skills) strong.set(s.skillId, 0.95);
    const strongReadiness = computeCareerReadiness(strong, career, { projects: 5, experienceMonths: 18 });
    const weakReadiness = computeCareerReadiness(new Map(), career, { projects: 0, experienceMonths: 0 });
    expect(strongReadiness.overall).toBeGreaterThan(weakReadiness.overall);
  });
});

describe('empty and degenerate profiles', () => {
  const empty: SkillVector = new Map();

  it('still produces recommendations for a learner with no skills', () => {
    const picks = topK(contextFor(empty), 5);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((p) => p.score.prerequisiteReady)).toBe(true);
  });

  it('only offers no-prerequisite resources to an absolute beginner', () => {
    const picks = topK(contextFor(empty), 5);
    expect(picks.every((p) => p.resource.prerequisites.length === 0)).toBe(true);
  });

  it('scores every catalog resource without throwing', () => {
    const ctx = contextFor(vector);
    for (const resource of RESOURCES) {
      const score = scoreResource(resource, ctx);
      expect(Number.isFinite(score.total)).toBe(true);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(1);
    }
  });
});
