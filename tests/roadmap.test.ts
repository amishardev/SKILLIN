import { describe, it, expect } from 'vitest';
import { demoProfile } from './fixtures/sample-profile';
import { buildStudentSkills, toVector } from '@/lib/skills/vector';
import { getCareer } from '@/data/careers';
import { buildRoadmap, WEEKS_PER_MONTH, byMonth, skillSequence } from '@/lib/roadmap/planner';
import { planWeek, currentWeekPlan } from '@/lib/roadmap/weekly';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { getResource } from '@/data/resources';
import { getProject } from '@/data/projects';
import type { ScoringContext, } from '@/lib/recommendation/engine';
import type { SkillVector } from '@/types';

const profile = demoProfile();
const skills = buildStudentSkills(profile);
const vector = toVector(skills);

function ctx(v: SkillVector, careerId: string): ScoringContext {
  return {
    vector: v,
    career: getCareer(careerId)!,
    projectSkills: profile.projects.flatMap((p) => p.technologies),
    experienceSkills: profile.experience.flatMap((e) => e.technologies),
    academicSkills: ['statistics'],
    certificateSkills: profile.certificates.flatMap((c) => c.skills),
  };
}

function plan(careerId: string, months: number, weeklyHours: number) {
  return buildRoadmap({
    vector,
    careerId,
    timelineMonths: months,
    weeklyHours,
    context: ctx(vector, careerId),
  });
}

describe('roadmap generation', () => {
  const roadmap = plan('ai-engineer', 12, 10);

  it('produces a non-empty, ordered plan', () => {
    expect(roadmap.milestones.length).toBeGreaterThan(0);
    for (let i = 1; i < roadmap.milestones.length; i++) {
      expect(roadmap.milestones[i].order).toBe(roadmap.milestones[i - 1].order + 1);
      expect(roadmap.milestones[i].weekStart).toBeGreaterThanOrEqual(
        roadmap.milestones[i - 1].weekStart,
      );
    }
  });

  it('never schedules a resource before its prerequisites are taught', () => {
    const acquired: SkillVector = new Map(vector);
    for (const milestone of roadmap.milestones) {
      const resource = milestone.resourceId ? getResource(milestone.resourceId) : undefined;
      if (resource) {
        expect(checkReadiness(resource.prerequisites, acquired).ready).toBe(true);
      }
      for (const skillId of milestone.skillsGained) {
        acquired.set(skillId, Math.max(acquired.get(skillId) ?? 0, 0.75));
      }
    }
  });

  it('never schedules a PROJECT before its prerequisites are taught', () => {
    // The failure this guards against: an image-classification project landing
    // weeks before the deep-learning resource that makes it possible.
    const acquired: SkillVector = new Map(vector);
    for (const milestone of roadmap.milestones) {
      if (milestone.projectId) {
        const project = getProject(milestone.projectId)!;
        expect(
          checkReadiness(project.prerequisites, acquired).ready,
          `${project.title} scheduled at week ${milestone.weekStart} without ${checkReadiness(project.prerequisites, acquired).missingNames.join(', ')}`,
        ).toBe(true);
      }
      for (const skillId of milestone.skillsGained) {
        acquired.set(skillId, Math.max(acquired.get(skillId) ?? 0, 0.75));
      }
    }
  });

  it('does not pad the plan with near-duplicate resources', () => {
    // Two resources teaching an identical skill set add nothing after the first.
    const signatures = roadmap.milestones
      .filter((m) => m.kind === 'resource')
      .map((m) => [...m.skillsGained].sort().join('|'));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('respects the learner’s total hour budget', () => {
    const budget = 12 * 10 * WEEKS_PER_MONTH;
    // Allowed a small overshoot only from the guaranteed-minimum project rule.
    expect(roadmap.totalHours).toBeLessThanOrEqual(budget * 1.15);
  });

  it('includes both learning and building', () => {
    const kinds = new Set(roadmap.milestones.map((m) => m.kind));
    expect(kinds.has('resource')).toBe(true);
    expect(kinds.has('project')).toBe(true);
  });

  it('targets skills the career actually requires', () => {
    const career = getCareer('ai-engineer')!;
    const required = new Set(career.skills.filter((s) => s.required).map((s) => s.skillId));
    const taught = new Set(roadmap.milestones.flatMap((m) => m.skillsGained));
    expect([...taught].some((s) => required.has(s))).toBe(true);
  });

  it('does not re-teach skills the learner already has', () => {
    // Python is at ~0.95 for the demo learner; nothing should be scheduled
    // whose only contribution is Python.
    for (const milestone of roadmap.milestones) {
      if (milestone.kind !== 'resource') continue;
      const onlyPython =
        milestone.skillsGained.length > 0 && milestone.skillsGained.every((s) => s === 'python');
      expect(onlyPython).toBe(false);
    }
  });
});

describe('roadmap adapts to constraints', () => {
  it('schedules less work in 3 months than in 24', () => {
    const short = plan('ai-engineer', 3, 10);
    const long = plan('ai-engineer', 24, 10);
    expect(short.totalHours).toBeLessThan(long.totalHours);
    expect(short.milestones.length).toBeLessThanOrEqual(long.milestones.length);
  });

  it('schedules less work at 3 hrs/week than at 25', () => {
    const light = plan('ai-engineer', 12, 3);
    const heavy = plan('ai-engineer', 12, 25);
    expect(light.totalHours).toBeLessThan(heavy.totalHours);
  });

  it('reports what the budget could not cover instead of pretending', () => {
    const tiny = plan('ai-engineer', 3, 3);
    expect(tiny.uncovered.length).toBeGreaterThan(0);
  });

  it('covers more of the gap when given more time', () => {
    const tiny = plan('ai-engineer', 3, 3);
    const generous = plan('ai-engineer', 24, 20);
    expect(generous.uncovered.length).toBeLessThan(tiny.uncovered.length);
  });

  it('produces a different plan for a different career', () => {
    const ai = plan('ai-engineer', 12, 10).milestones.map((m) => m.title);
    const security = plan('cybersecurity-engineer', 12, 10).milestones.map((m) => m.title);
    expect(ai).not.toEqual(security);
  });

  it('fits milestones inside the timeline', () => {
    const roadmap = plan('ai-engineer', 6, 10);
    const totalWeeks = Math.round(6 * WEEKS_PER_MONTH);
    for (const m of roadmap.milestones) {
      expect(m.weekEnd).toBeLessThanOrEqual(totalWeeks);
      expect(m.month).toBeLessThanOrEqual(6);
    }
  });

  it('still plans something for a learner with no skills at all', () => {
    const empty: SkillVector = new Map();
    const roadmap = buildRoadmap({
      vector: empty,
      careerId: 'frontend-developer',
      timelineMonths: 12,
      weeklyHours: 10,
      context: ctx(empty, 'frontend-developer'),
    });
    expect(roadmap.milestones.length).toBeGreaterThan(0);
  });
});

describe('roadmap views', () => {
  const roadmap = plan('ai-engineer', 12, 10);

  it('groups milestones by ascending month', () => {
    const months = byMonth(roadmap).map((g) => g.month);
    expect(months).toEqual([...months].sort((a, b) => a - b));
  });

  it('produces a readable skill sequence with no repeats', () => {
    const sequence = skillSequence(roadmap);
    expect(sequence.length).toBeGreaterThan(0);
    expect(new Set(sequence).size).toBe(sequence.length);
  });
});

describe('weekly plan', () => {
  const roadmap = plan('ai-engineer', 12, 10);
  const milestone = roadmap.milestones[0];

  it('allocates close to the weekly budget', () => {
    const week = planWeek(milestone, 10, 1);
    // Rounding to quarter-hours means an exact match is not expected.
    expect(week.totalMinutes).toBeGreaterThan(10 * 60 * 0.85);
    expect(week.totalMinutes).toBeLessThan(10 * 60 * 1.15);
  });

  it('gives a light-budget learner fewer, shorter sessions', () => {
    const light = planWeek(milestone, 3, 1);
    const heavy = planWeek(milestone, 20, 1);
    expect(light.sessions.length).toBeLessThan(heavy.sessions.length);
    expect(light.totalMinutes).toBeLessThan(heavy.totalMinutes);
  });

  it('never produces a zero-length session', () => {
    for (const hours of [3, 5, 10, 15, 20, 25]) {
      const week = planWeek(milestone, hours, 1);
      expect(week.sessions.every((s) => s.minutes >= 15)).toBe(true);
    }
  });

  it('varies the focus across sessions', () => {
    const week = planWeek(milestone, 15, 1);
    expect(new Set(week.sessions.map((s) => s.focus)).size).toBeGreaterThan(1);
  });

  it('returns the plan for the current week of the roadmap', () => {
    const week = currentWeekPlan(roadmap, 1);
    expect(week).not.toBeNull();
    expect(week!.weekNumber).toBe(1);
    expect(week!.sessions.length).toBeGreaterThan(0);
  });
});
