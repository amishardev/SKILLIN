import { RESOURCES, type LearningResource, type ResourceLevel, type ResourceType } from '@/data/resources';
import { datasetResources } from './dataset';
import { extendedResources } from './extended';
import { skillName } from '@/data/skills';
import { getCareer } from '@/data/careers';

/**
 * The merged learning catalog.
 *
 * Three tiers, deliberately ordered:
 *
 *   1. Curated free resources, official documentation, NPTEL, freeCodeCamp,
 *      university courses. Hand-checked, with verified URLs and real
 *      prerequisites.
 *   2. The curated Coursera export. Real course URLs, real instructors, real
 *      ratings, filtered at ingest and sorted into quality tiers. This is the
 *      tier that carries business, creative and humanities coverage.
 *   3. The older imported Coursera datasets. Broad coverage and real cover
 *      images, but no URLs and no prerequisite data, so they link to a search.
 *
 * The product is free-first: tier 1 wins ties, and the ranking engine's quality
 * scoring already favours reliable publishers over popular ones. Nothing here
 * makes Coursera load-bearing, remove either generated file and the app still
 * works on the tiers that remain.
 */

let merged: LearningResource[] | null = null;

export function fullCatalog(): LearningResource[] {
  if (merged) return merged;

  const curated = RESOURCES;
  // Suppress a dataset entry only when the curated tier already has the same
  // course from the same publisher. Two publishers' takes on "Prompt
  // Engineering Guide" are genuinely different resources and both stay.
  const seen = new Set(curated.map(dedupeKey));

  // Tier 2 before tier 3: where the same course appears in both, the entry with
  // a real URL should be the one that survives.
  const extended = extendedResources().filter((r) => {
    const key = dedupeKey(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const dataset = datasetResources().filter((r) => {
    const key = dedupeKey(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  merged = [...curated, ...extended, ...dataset];
  return merged;
}

/** Dedupe key: same title AND same publisher, ignoring punctuation. */
function dedupeKey(r: LearningResource): string {
  const flat = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${flat(r.title)}::${flat(r.provider)}`;
}

let index: Map<string, LearningResource> | null = null;

export function catalogResource(id: string): LearningResource | undefined {
  if (!index) index = new Map(fullCatalog().map((r) => [r.id, r]));
  return index.get(id);
}

// ══════════════════════════════════════════════════════════
// Search
// ══════════════════════════════════════════════════════════

export interface CatalogFilters {
  level?: ResourceLevel | 'all';
  type?: ResourceType | 'all';
  /** Only resources reachable without paying. */
  freeOnly?: boolean;
  provider?: string | 'all';
  careerId?: string | 'all';
  skillId?: string | 'all';
  /** Upper bound in hours; `all` means no limit. */
  maxHours?: number | 'all';
}

/**
 * Relevance-ranked search across title, provider, skills, careers and subject.
 *
 * Scored rather than a plain substring filter, so "deep learning" surfaces
 * Deep Learning courses ahead of anything that merely mentions the words.
 */
export function searchCatalog(
  query: string,
  filters: CatalogFilters = {},
  catalog: readonly LearningResource[] = fullCatalog()): LearningResource[] {
  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  const filtered = catalog.filter((r) => matchesFilters(r, filters));
  if (terms.length === 0) return filtered;

  const scored: Array<{ r: LearningResource; score: number }> = [];

  for (const r of filtered) {
    const title = r.title.toLowerCase();
    const provider = r.provider.toLowerCase();
    const skills = r.skills.map((s) => skillName(s).toLowerCase());
    const careers = r.careerTags.map((c) => getCareer(c)?.title.toLowerCase() ?? c.replace(/-/g, ' '));

    let score = 0;
    // Whole-phrase hits are the strongest signal.
    if (title.includes(q)) score += 12;
    if (title.startsWith(q)) score += 6;
    if (skills.some((s) => s === q)) score += 10;
    if (careers.some((c) => c.includes(q))) score += 8;

    for (const term of terms) {
      if (title.includes(term)) score += 4;
      if (provider.includes(term)) score += 2;
      if (skills.some((s) => s.includes(term))) score += 3;
      if (careers.some((c) => c.includes(term))) score += 2;
      if (r.description.toLowerCase().includes(term)) score += 1;
      if (r.subject?.toLowerCase().includes(term)) score += 1;
    }

    if (score > 0) {
      // Free, curated material breaks ties in its favour.
      if (r.status === 'curated') score += 2;
      if (r.access === 'free') score += 1;
      scored.push({ r, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.r.title.localeCompare(b.r.title))
    .map((s) => s.r);
}

function matchesFilters(r: LearningResource, f: CatalogFilters): boolean {
  if (f.level && f.level !== 'all' && r.level !== f.level) return false;
  if (f.type && f.type !== 'all' && r.type !== f.type) return false;
  if (f.freeOnly && r.access === 'paid') return false;
  if (f.provider && f.provider !== 'all' && r.provider !== f.provider) return false;
  if (f.careerId && f.careerId !== 'all' && !r.careerTags.includes(f.careerId)) return false;
  if (f.skillId && f.skillId !== 'all' && !r.skills.includes(f.skillId)) return false;
  if (f.maxHours && f.maxHours !== 'all' && r.estimatedHours > f.maxHours) return false;
  return true;
}

/** Providers present in the catalog, most common first, for the filter panel. */
export function catalogProviders(limit = 24): string[] {
  const counts = new Map<string, number>();
  for (const r of fullCatalog()) {
    counts.set(r.provider, (counts.get(r.provider) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * A deterministic cover for resources with no image.
 *
 * Derived from the resource's own domain so the same course always gets the
 * same treatment, and so a rail reads as a set rather than random noise.
 */
export function coverTheme(resource: LearningResource): { from: string; to: string; glyph: string } {
  const domains: Array<[string[], { from: string; to: string; glyph: string }]> = [
    [['llm', 'transformers', 'rag', 'generative-ai', 'ai-agents', 'prompt-engineering'],
      { from: '#2B1C4A', to: '#0B0B0C', glyph: '◆' }],
    [['machine-learning', 'deep-learning', 'pytorch', 'tensorflow', 'model-evaluation', 'mlops'],
      { from: '#14342B', to: '#0B0B0C', glyph: '◈' }],
    [['data-analysis', 'pandas', 'sql', 'data-engineering', 'big-data', 'data-visualization'],
      { from: '#123040', to: '#0B0B0C', glyph: '▤' }],
    [['cybersecurity', 'penetration-testing', 'cryptography', 'network-security', 'app-security'],
      { from: '#3B1616', to: '#0B0B0C', glyph: '⬢' }],
    [['docker', 'kubernetes', 'aws', 'gcp', 'terraform', 'ci-cd', 'sre', 'linux'],
      { from: '#1B2942', to: '#0B0B0C', glyph: '◰' }],
    [['react', 'javascript', 'typescript', 'css', 'html', 'nextjs', 'nodejs'],
      { from: '#3A2A12', to: '#0B0B0C', glyph: '◧' }],
    [['ui-design', 'ux-research', 'design-systems', 'product-management'],
      { from: '#3A1830', to: '#0B0B0C', glyph: '◐' }],
    [['embedded-systems', 'robotics', 'iot', 'signal-processing'],
      { from: '#2A2E14', to: '#0B0B0C', glyph: '◇' }],
  ];

  for (const [skills, theme] of domains) {
    if (resource.skills.some((s) => skills.includes(s))) return theme;
  }
  return { from: '#242428', to: '#0B0B0C', glyph: '▣' };
}
