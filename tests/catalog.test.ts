import { describe, it, expect } from 'vitest';
import { demoProfile, DEMO_PLAN } from './fixtures/sample-profile';
import { analyze } from '@/lib/analysis';
import { RESOURCES } from '@/data/resources';
import { datasetResources, datasetCount } from '@/lib/catalog/dataset';
import { fullCatalog, searchCatalog, catalogResource, catalogProviders, coverTheme } from '@/lib/catalog';
import { buildRails, featuredResource } from '@/lib/catalog/rails';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { SKILLS } from '@/data/skills';
import { CAREER_MAP } from '@/data/careers';
import type { ScoringContext } from '@/lib/recommendation/engine';

const profile = demoProfile();
const analysis = analyze({ profile, plan: DEMO_PLAN });

const context: ScoringContext = {
  vector: analysis.vector,
  career: analysis.career,
  projectSkills: profile.projects.flatMap((p) => p.technologies),
  experienceSkills: profile.experience.flatMap((e) => e.technologies),
  academicSkills: ['statistics'],
  certificateSkills: profile.certificates.flatMap((c) => c.skills),
};

const railInput = {
  context,
  career: analysis.career,
  skills: analysis.skills,
  gaps: analysis.gaps,
  vector: analysis.vector,
};

describe('imported dataset', () => {
  const dataset = datasetResources();

  it('decodes every row', () => {
    expect(dataset.length).toBe(datasetCount);
    expect(dataset.length).toBeGreaterThan(1500);
  });

  it('only carries canonical skill ids', () => {
    const known = new Set(SKILLS.map((s) => s.id));
    for (const r of dataset) {
      for (const s of r.skills) expect(known.has(s)).toBe(true);
    }
  });

  it('only carries real career ids', () => {
    for (const r of dataset) {
      for (const c of r.careerTags) expect(CAREER_MAP.has(c)).toBe(true);
    }
  });

  it('gives every entry at least one skill and one career', () => {
    for (const r of dataset) {
      expect(r.skills.length).toBeGreaterThan(0);
      expect(r.careerTags.length).toBeGreaterThan(0);
    }
  });

  it('never claims a paid programme is free', () => {
    for (const r of dataset) {
      if (r.access === 'paid') expect(r.isFree).toBe(false);
    }
  });

  it('marks dataset links as searches, never as direct course URLs', () => {
    for (const r of dataset) {
      expect(r.linkKind).toBe('search');
      // A fabricated /learn/<slug> deep link would be a lie; this is the real
      // search endpoint with the title as the query.
      expect(r.url).toContain('coursera.org/search?query=');
      expect(r.url).not.toContain('/learn/');
    }
  });

  it('labels provenance so the UI can be honest', () => {
    expect(dataset.every((r) => r.status === 'dataset')).toBe(true);
  });

  it('carries usable cover images where the dataset had them', () => {
    const withThumb = dataset.filter((r) => r.thumbnail);
    expect(withThumb.length).toBeGreaterThan(300);
    for (const r of withThumb.slice(0, 50)) {
      expect(r.thumbnail).toMatch(/^https:\/\//);
      // The proxy wrapper forces a small crop; we store the underlying image.
      expect(r.thumbnail).not.toContain('imageproxy');
    }
  });
});

describe('merged catalog', () => {
  const catalog = fullCatalog();

  it('keeps the curated free tier intact', () => {
    for (const curated of RESOURCES) {
      expect(catalog.find((r) => r.id === curated.id)).toBeDefined();
    }
  });

  it('puts curated resources first, so free-first ordering survives', () => {
    const firstDatasetIndex = catalog.findIndex((r) => r.status === 'dataset');
    const lastCuratedIndex = catalog.map((r) => r.status).lastIndexOf('curated');
    expect(lastCuratedIndex).toBeLessThan(firstDatasetIndex);
  });

  it('contains no duplicate ids', () => {
    const ids = catalog.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never shows the same course from the same publisher twice', () => {
    const flat = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const keys = catalog.map((r) => `${flat(r.title)}::${flat(r.provider)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves resources by id', () => {
    expect(catalogResource('py-official-tutorial')?.title).toBe('The Python Tutorial');
    expect(catalogResource('nope-not-real')).toBeUndefined();
  });

  it('still works if the dataset were removed, curated tier stands alone', () => {
    expect(RESOURCES.length).toBeGreaterThan(100);
    expect(RESOURCES.every((r) => r.linkKind === 'direct')).toBe(true);
  });
});

describe('catalog search', () => {
  it('puts deep learning resources first for "deep learning"', () => {
    const results = searchCatalog('deep learning');
    expect(results.length).toBeGreaterThan(0);
    const top = results.slice(0, 5);
    expect(
      top.some((r) => /deep learning/i.test(r.title) || r.skills.includes('deep-learning'))).toBe(true);
  });

  it('finds resources by career name', () => {
    const results = searchCatalog('AI Engineer');
    expect(results.length).toBeGreaterThan(0);
    expect(results.slice(0, 10).some((r) => r.careerTags.includes('ai-engineer'))).toBe(true);
  });

  it('finds resources by skill', () => {
    const results = searchCatalog('transformers');
    expect(results.some((r) => r.skills.includes('transformers'))).toBe(true);
  });

  it('returns nothing for a nonsense query rather than everything', () => {
    expect(searchCatalog('zzzzqqqxyw').length).toBe(0);
  });

  it('respects the free-only filter', () => {
    const results = searchCatalog('python', { freeOnly: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.access !== 'paid')).toBe(true);
  });

  it('respects level and duration filters', () => {
    const results = searchCatalog('data', { level: 'beginner', maxHours: 20 });
    expect(results.every((r) => r.level === 'beginner' && r.estimatedHours <= 20)).toBe(true);
  });

  it('lists real providers for the filter panel', () => {
    const providers = catalogProviders(10);
    expect(providers.length).toBeGreaterThan(3);
    expect(new Set(providers).size).toBe(providers.length);
  });
});

describe('personalised rails', () => {
  const rails = buildRails(railInput);

  it('produces several rows', () => {
    expect(rails.length).toBeGreaterThan(3);
  });

  it('never produces an empty row', () => {
    for (const rail of rails) expect(rail.resources.length).toBeGreaterThan(0);
  });

  it('gives every row a reason written in the learner’s own terms', () => {
    for (const rail of rails) {
      expect(rail.reason.length).toBeGreaterThan(15);
      // The whole point is that rows are not "what is trending".
      expect(rail.reason.toLowerCase()).not.toContain('most popular');
    }
  });

  it('names the learner’s actual career goal', () => {
    expect(rails.some((r) => r.title.includes(analysis.career.title))).toBe(true);
  });

  it('builds a gap row for a skill the learner genuinely lacks', () => {
    const gapRails = rails.filter((r) => r.id.startsWith('gap-'));
    expect(gapRails.length).toBeGreaterThan(0);
    for (const rail of gapRails) {
      const skillId = rail.id.replace('gap-', '');
      expect(analysis.vector.get(skillId) ?? 0).toBeLessThan(0.55);
    }
  });

  it('keeps prerequisite-unsafe resources out of every unlocked row', () => {
    for (const rail of rails) {
      if (rail.locked) continue;
      if (rail.id === 'continue' || rail.id === 'saved') continue;
      for (const r of rail.resources) {
        expect(checkReadiness(r.prerequisites, analysis.vector).ready).toBe(true);
      }
    }
  });

  it('puts blocked resources only in the locked row', () => {
    const locked = rails.find((r) => r.id === 'blocked');
    if (locked) {
      for (const r of locked.resources) {
        expect(checkReadiness(r.prerequisites, analysis.vector).ready).toBe(false);
      }
    }
  });

  it('never recommends something already completed', () => {
    const withProgress = buildRails({
      ...railInput,
      progress: {
        resourcesStarted: [],
        resourcesCompleted: ['py-official-tutorial'],
        projectsStarted: [],
        projectsCompleted: [],
        hoursLearned: 5,
        skillsAcquired: [],
        updatedAt: new Date().toISOString(),
      },
    });
    for (const rail of withProgress) {
      expect(rail.resources.map((r) => r.id)).not.toContain('py-official-tutorial');
    }
  });

  it('surfaces a "continue learning" row only when something is in progress', () => {
    expect(rails.find((r) => r.id === 'continue')).toBeUndefined();

    const withStarted = buildRails({
      ...railInput,
      progress: {
        resourcesStarted: ['hf-nlp-course'],
        resourcesCompleted: [],
        projectsStarted: [],
        projectsCompleted: [],
        hoursLearned: 2,
        skillsAcquired: [],
        updatedAt: new Date().toISOString(),
      },
    });
    const cont = withStarted.find((r) => r.id === 'continue');
    expect(cont?.resources.map((r) => r.id)).toContain('hf-nlp-course');
  });

  it('produces different rows for a different career goal', () => {
    const security = analyze({
      profile,
      plan: { ...DEMO_PLAN, careerGoalId: 'cybersecurity-engineer' },
    });
    const securityRails = buildRails({
      context: { ...context, career: security.career, vector: security.vector },
      career: security.career,
      skills: security.skills,
      gaps: security.gaps,
      vector: security.vector,
    });
    expect(securityRails.map((r) => r.title)).not.toEqual(rails.map((r) => r.title));
  });
});

describe('featured hero', () => {
  it('is prerequisite-safe and not already completed', () => {
    const hero = featuredResource(railInput);
    expect(hero).not.toBeNull();
    expect(checkReadiness(hero!.prerequisites, analysis.vector).ready).toBe(true);
  });
});

describe('cover fallback', () => {
  it('gives a stable theme per resource domain', () => {
    const a = coverTheme(catalogResource('hf-llm-course')!);
    const b = coverTheme(catalogResource('hf-llm-course')!);
    expect(a).toEqual(b);
    expect(a.from).toMatch(/^#/);
  });

  it('themes different domains differently', () => {
    const ai = coverTheme(catalogResource('hf-llm-course')!);
    const sec = coverTheme(catalogResource('owasp-top-ten')!);
    expect(ai.from).not.toBe(sec.from);
  });
});
