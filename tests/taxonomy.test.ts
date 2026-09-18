import { describe, it, expect } from 'vitest';
import { CAREER_GOALS, CAREER_CATEGORIES, CAREER_GROUPS } from '@/data/careers';
import { SKILL_MAP, SKILLS } from '@/data/skills';
import { fullCatalog } from '@/lib/catalog';
import { PROJECTS } from '@/data/projects';
import { roleSalary, salaryCoverage } from '@/data/salaries';

/**
 * Structural checks on the taxonomy.
 *
 * Skill and category ids are strings, so TypeScript cannot catch a typo in a
 * career definition. These tests do, and they also record the one thing that is
 * easy to let slide while adding domains: whether the catalog can actually
 * teach what a role asks for. A role with no courses behind it is worse than an
 * absent role, because the product promises a roadmap and then cannot build one.
 */

const COVERAGE_FLOOR = 0.5;

describe('career taxonomy', () => {
  it('references only skills that exist', () => {
    const broken: string[] = [];
    for (const career of CAREER_GOALS) {
      for (const s of career.skills) {
        if (!SKILL_MAP.has(s.skillId)) broken.push(`${career.id} -> ${s.skillId}`);
      }
      for (const f of career.foundations) {
        if (!SKILL_MAP.has(f)) broken.push(`${career.id} foundation -> ${f}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('references only categories that exist, and every category has a group', () => {
    const categories = new Set(CAREER_CATEGORIES.map((c) => c.id));
    const groups = new Set(CAREER_GROUPS.map((g) => g.id));
    for (const career of CAREER_GOALS) {
      expect(categories.has(career.category)).toBe(true);
    }
    for (const category of CAREER_CATEGORIES) {
      expect(groups.has(category.group)).toBe(true);
    }
  });

  it('gives every career at least one required skill and a foundation', () => {
    for (const career of CAREER_GOALS) {
      expect(career.skills.some((s) => s.required)).toBe(true);
      expect(career.foundations.length).toBeGreaterThan(0);
    }
  });

  it('has unique skill and career ids', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    expect(new Set(CAREER_GOALS.map((c) => c.id)).size).toBe(CAREER_GOALS.length);
  });

  it('declares a credential wherever the field is licence gated', () => {
    // Roles that no amount of online study qualifies someone for must say so.
    const gated = ['psychology-researcher', 'historian', 'philosopher', 'art-historian'];
    for (const id of gated) {
      const career = CAREER_GOALS.find((c) => c.id === id);
      expect(career, id).toBeDefined();
      expect(career!.credential, id).toBeTruthy();
    }
  });
});

describe('project templates', () => {
  it('reference only skills and careers that exist', () => {
    const careers = new Set(CAREER_GOALS.map((c) => c.id));
    const broken: string[] = [];
    for (const p of PROJECTS) {
      for (const s of p.skills) if (!SKILL_MAP.has(s)) broken.push(`${p.id} skill -> ${s}`);
      for (const s of p.prerequisites) if (!SKILL_MAP.has(s)) broken.push(`${p.id} prereq -> ${s}`);
      for (const c of p.careerTags) if (!careers.has(c)) broken.push(`${p.id} career -> ${c}`);
    }
    expect(broken).toEqual([]);
  });

  it('has unique ids', () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
  });

  /*
   * A role with no buildable project cannot produce a portfolio, which is the
   * whole output of the creative and management roadmaps.
   */
  it('gives every career at least one project', () => {
    const orphans = CAREER_GOALS
      .filter((c) => !PROJECTS.some((p) => p.careerTags.includes(c.id)))
      .map((c) => c.id);
    expect(orphans).toEqual([]);
  });
});

describe('role salaries', () => {
  it('maps onto real careers, so a rename cannot silently hide a figure', () => {
    const careers = new Set(CAREER_GOALS.map((c) => c.id));
    const orphaned = CAREER_GOALS
      .map((c) => roleSalary(c.id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .filter((s) => !careers.has(s.careerId));
    expect(orphaned).toEqual([]);
    expect(salaryCoverage).toBeGreaterThan(30);
  });

  it('never shows a figure without a source and a date', () => {
    for (const career of CAREER_GOALS) {
      const salary = roleSalary(career.id);
      if (!salary) continue;
      expect(salary.averageLpa, career.id).toBeGreaterThan(0);
      expect(salary.source, career.id).toBeTruthy();
      expect(salary.sourceUrl.startsWith('http'), career.id).toBe(true);
    }
  });

  /*
   * Salary belongs to the moment of choosing a goal. Anywhere else it stops
   * being context and starts reading as a promise the product cannot keep.
   */
  it('is used only in onboarding', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join, sep } = await import('node:path');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry) && readFileSync(path, 'utf8').includes('roleSalary')) {
          hits.push(path.split(sep).join('/'));
        }
      }
    };
    walk('components');
    walk('app');
    expect(hits).toEqual(['components/onboarding/CareerStep.tsx']);
  });
});

describe('catalog can serve the careers it offers', () => {
  const catalog = fullCatalog();

  /** Share of a role's required skills that at least one course teaches. */
  function coverage(careerId: string): number {
    const career = CAREER_GOALS.find((c) => c.id === careerId)!;
    const required = career.skills.filter((s) => s.required);
    const covered = required.filter((s) => catalog.some((r) => r.skills.includes(s.skillId)));
    return covered.length / Math.max(1, required.length);
  }

  it('teaches at least half of every role\'s required skills', () => {
    const thin = CAREER_GOALS.map((c) => [c.id, coverage(c.id)] as const)
      .filter(([, pct]) => pct < COVERAGE_FLOOR)
      .map(([id, pct]) => `${id} ${Math.round(pct * 100)}%`);
    expect(thin).toEqual([]);
  });

  it('covers the flagship roles well', () => {
    for (const id of [
      'ai-engineer', 'product-manager', 'marketing-manager',
      'business-analyst', 'financial-analyst', 'hr-manager', 'ux-ui-designer',
    ]) {
      expect(coverage(id), id).toBeGreaterThanOrEqual(0.7);
    }
  });

  /*
   * The coverage floor above is a percentage, so a role can clear it while one
   * of its required skills is taught by nothing at all. That skill is then a
   * gap the product displays and can never close: the learner finishes every
   * course offered and readiness still stops short, with no explanation. Nine
   * roles were in that state, all of them management or creative, because the
   * source tags those skills with words the alias table did not carry.
   *
   * Courses and projects both count. Some skills are only ever demonstrated,
   * not lectured at, and a portfolio is built rather than attended.
   */
  it('can teach every skill some role requires', () => {
    const teachable = new Set([
      ...catalog.flatMap((r) => r.skills),
      ...PROJECTS.flatMap((p) => p.skills),
    ]);
    const unteachable = CAREER_GOALS.flatMap((c) =>
      c.skills.filter((s) => !teachable.has(s.skillId)).map((s) => `${c.id} -> ${s.skillId}`));
    expect(unteachable).toEqual([]);
  });
});

/*
 * The ingest resolves a course's skill strings through one alias table. Two
 * skills claiming the same alias means whichever is declared later takes every
 * course tagged that way, silently and permanently. That had already happened
 * twice: "people management" sat on both Human Resources and Leadership, and
 * "video production" on both Videography and Video Editing.
 */
describe('skill aliases', () => {
  it('are claimed by exactly one skill each', () => {
    const owner = new Map<string, string>();
    const collisions: string[] = [];
    for (const skill of SKILLS) {
      const keys = [skill.name.toLowerCase(), skill.id, ...skill.aliases.map((a) => a.toLowerCase())];
      for (const key of keys) {
        const existing = owner.get(key);
        if (existing && existing !== skill.id) collisions.push(`"${key}": ${existing} and ${skill.id}`);
        else owner.set(key, skill.id);
      }
    }
    expect(collisions).toEqual([]);
  });
});
