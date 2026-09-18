import { describe, it, expect } from 'vitest';
import { CAREER_GOALS, CAREER_CATEGORIES, CAREER_GROUPS } from '@/data/careers';
import { SKILL_MAP, SKILLS } from '@/data/skills';
import { fullCatalog } from '@/lib/catalog';

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
});
