import { describe, it, expect } from 'vitest';
import { analyze } from '@/lib/analysis';
import { demoProfile, DEMO_PLAN } from './fixtures/sample-profile';
import { getResource } from '@/data/resources';
import { CAREER_GOALS } from '@/data/careers';

describe('end-to-end analysis for the demo learner', () => {
  const result = analyze({ profile: demoProfile(), plan: DEMO_PLAN });

  it('resolves the chosen career', () => {
    expect(result.career.id).toBe('ai-engineer');
  });

  it('produces a next move with a real explanation', () => {
    expect(result.nextMove).not.toBeNull();
    expect(result.nextMove!.recommendation.explanation.why.length).toBeGreaterThan(40);
  });

  it('produces gaps, recommendations, a roadmap and projects', () => {
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.roadmap.milestones.length).toBeGreaterThan(0);
    expect(result.projects.length).toBeGreaterThan(0);
    expect(result.learningPath.length).toBeGreaterThan(0);
    expect(result.weeklyPlan).not.toBeNull();
  });

  it('names a specific missing prerequisite on blocked resources', () => {
    for (const blocked of result.blocked) {
      expect(blocked.missingNames.length).toBeGreaterThan(0);
    }
  });

  it('recognises the demo learner already knows Python', () => {
    const python = result.skills.find((s) => s.skillId === 'python');
    expect(python!.score).toBeGreaterThan(0.85);
  });

  it('credits statistics from the profile rather than inventing it', () => {
    const stats = result.skills.find((s) => s.skillId === 'statistics');
    expect(stats).toBeDefined();
    expect(stats!.evidenceTypes).toContain('academic');
  });

  it('only lists gaps for skills the chosen career actually requires', () => {
    const required = new Set(result.career.skills.map((s) => s.skillId));
    for (const gap of result.gaps) expect(required.has(gap.skillId)).toBe(true);
  });

  it('reports a readiness between 0 and 1', () => {
    expect(result.readiness.overall).toBeGreaterThan(0);
    expect(result.readiness.overall).toBeLessThanOrEqual(1);
  });

  it('never recommends a resource whose prerequisites are unmet', () => {
    for (const rec of result.recommendations) {
      expect(rec.score.prerequisiteReady).toBe(true);
      expect(getResource(rec.resourceId)).toBeDefined();
    }
  });
});

describe('analysis respects recorded progress', () => {
  it('drops completed resources from future recommendations', () => {
    const base = analyze({ profile: demoProfile(), plan: DEMO_PLAN });
    const completedId = base.recommendations[0].resourceId;

    const after = analyze({
      profile: demoProfile(),
      plan: DEMO_PLAN,
      progress: {
        resourcesStarted: [completedId],
        resourcesCompleted: [completedId],
        projectsStarted: [],
        projectsCompleted: [],
        hoursLearned: 10,
        skillsAcquired: [],
        updatedAt: new Date().toISOString(),
      },
    });

    expect(after.recommendations.map((r) => r.resourceId)).not.toContain(completedId);
  });
});

describe('analysis handles sparse profiles', () => {
  const bare = {
    ...demoProfile(),
    projects: [],
    experience: [],
    certificates: [],
    achievements: [],
    declaredSkills: [],
  };

  it('works for a profile with no projects or experience', () => {
    const result = analyze({ profile: bare, plan: DEMO_PLAN });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.roadmap.milestones.length).toBeGreaterThan(0);
  });

  it('rejects an unknown career goal loudly rather than guessing', () => {
    expect(() =>
      analyze({ profile: demoProfile(), plan: { ...DEMO_PLAN, careerGoalId: 'nope' } }),
    ).toThrow(/Unknown career goal/);
  });

  it('works for every career goal in the catalog', () => {
    for (const career of CAREER_GOALS) {
      const result = analyze({
        profile: demoProfile(),
        plan: { careerGoalId: career.id, timelineMonths: 12, weeklyHours: 10 },
      });
      expect(result.roadmap.milestones.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    }
  });
});

/*
 * Readiness counts four things, and two of them used to ignore the goal
 * entirely: projects and experience were raw totals. While every career here
 * was technical that was roughly defensible, since any engineering work was at
 * least weak evidence for any engineering role. Across four domains it was not:
 * this profile, a data scientist, scored 26% ready for Music Producer on the
 * strength of two web projects and ten months at a software job.
 */
describe('readiness corroboration is weighed against the goal', () => {
  const readinessFor = (careerGoalId: string) =>
    analyze({ profile: demoProfile(), plan: { ...DEMO_PLAN, careerGoalId } }).readiness;

  it('credits past work toward a role it is relevant to', () => {
    const own = readinessFor('data-scientist');
    expect(own.components.projects).toBeGreaterThan(0.3);
    expect(own.components.experience).toBeGreaterThan(0.2);
  });

  it('credits none of it toward a role it has nothing to do with', () => {
    for (const id of ['music-producer', 'photographer', 'historian']) {
      const far = readinessFor(id);
      expect(far.components.projects, id).toBe(0);
      expect(far.components.experience, id).toBe(0);
    }
  });

  it('ranks the learner far higher on their own field than on a distant one', () => {
    expect(readinessFor('data-scientist').overall)
      .toBeGreaterThan(readinessFor('music-producer').overall + 0.5);
  });
});
