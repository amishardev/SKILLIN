import { describe, it, expect } from 'vitest';
import { CAREER_GOALS } from '@/data/careers';
import { analyze } from '@/lib/analysis';
import { demoProfile } from './fixtures/sample-profile';
import { catalogResource } from '@/lib/catalog';
import { PROJECTS } from '@/data/projects';

/**
 * Invariants that must hold for every career, not just the technical ones.
 *
 * The domain expansion made this necessary. Every one of these properties held
 * quietly while all 41 careers were technical and drew on one hand-checked
 * tier; several of them stopped holding the moment roles appeared whose courses
 * came from elsewhere. Checking one representative role would not have caught
 * that, so this walks all of them.
 */

const profile = demoProfile();
const PLAN = { timelineMonths: 12, weeklyHours: 10 };
const results = CAREER_GOALS.map((career) => ({
  career,
  analysis: analyze({ profile, plan: { careerGoalId: career.id, ...PLAN } }),
}));

describe('every career produces a usable plan', () => {
  it('builds a non-empty roadmap', () => {
    const empty = results.filter((r) => r.analysis.roadmap.milestones.length === 0).map((r) => r.career.id);
    expect(empty).toEqual([]);
  });

  it('produces recommendations', () => {
    const none = results.filter((r) => r.analysis.recommendations.length === 0).map((r) => r.career.id);
    expect(none).toEqual([]);
  });

  it('keeps readiness a real number between 0 and 1', () => {
    for (const { career, analysis } of results) {
      const value = analysis.readiness.overall;
      expect(Number.isFinite(value), career.id).toBe(true);
      expect(value, career.id).toBeGreaterThanOrEqual(0);
      expect(value, career.id).toBeLessThanOrEqual(1);
    }
  });
});

describe('roadmap milestones are internally consistent', () => {
  it('runs forward in time and fits the timeline', () => {
    const totalWeeks = Math.round(PLAN.timelineMonths * 4.33);
    for (const { career, analysis } of results) {
      let previousStart = 0;
      for (const m of analysis.roadmap.milestones) {
        expect(m.weekStart, `${career.id} ${m.id}`).toBeGreaterThanOrEqual(1);
        expect(m.weekEnd, `${career.id} ${m.id}`).toBeGreaterThanOrEqual(m.weekStart);
        // Scheduling never runs backwards.
        expect(m.weekStart, `${career.id} ${m.id}`).toBeGreaterThanOrEqual(previousStart);
        previousStart = m.weekStart;
        // A plan that overruns its own timeline is not a plan.
        expect(m.weekEnd, `${career.id} ${m.id}`).toBeLessThanOrEqual(totalWeeks + 1);
        expect(m.hours, `${career.id} ${m.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('references only resources and projects that exist', () => {
    const projectIds = new Set(PROJECTS.map((p) => p.id));
    const broken: string[] = [];
    for (const { career, analysis } of results) {
      for (const m of analysis.roadmap.milestones) {
        if (m.resourceId && !catalogResource(m.resourceId)) broken.push(`${career.id} -> ${m.resourceId}`);
        if (m.projectId && !projectIds.has(m.projectId)) broken.push(`${career.id} -> ${m.projectId}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('never schedules the same resource twice', () => {
    for (const { career, analysis } of results) {
      const ids = analysis.roadmap.milestones.map((m) => m.resourceId).filter(Boolean);
      expect(new Set(ids).size, career.id).toBe(ids.length);
    }
  });
});

describe('what is recommended can actually be opened', () => {
  it('gives every recommendation a real link', () => {
    const bad: string[] = [];
    for (const { career, analysis } of results) {
      for (const rec of analysis.recommendations) {
        const resource = catalogResource(rec.resourceId);
        if (!resource) { bad.push(`${career.id} -> missing ${rec.resourceId}`); continue; }
        if (!resource.url.startsWith('http')) bad.push(`${career.id} -> ${resource.id} bad url`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('never recommends something the learner cannot start', () => {
    for (const { career, analysis } of results) {
      for (const rec of analysis.recommendations) {
        expect(rec.score.prerequisiteReady, `${career.id} ${rec.resourceId}`).toBe(true);
      }
    }
  });
});
