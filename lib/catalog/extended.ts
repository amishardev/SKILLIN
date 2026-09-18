import raw from '@/data/catalog-extended.generated.json';
import { skillName } from '@/data/skills';
import { CAREER_GOALS } from '@/data/careers';
import type {
  LearningResource,
  ResourceAccess,
  ResourceLevel,
  ResourceType,
} from '@/data/resources';

/**
 * Decoder for the curated Coursera export.
 *
 * This is the tier that opened the product up beyond technology: business,
 * creative and humanities courses with the same evidence standard as the
 * technical ones.
 *
 * What makes it better than the older imported tier:
 *
 *   - A real course URL, so `linkKind` is `direct` and the UI says "Start
 *     learning" rather than sending the learner to a search page.
 *   - A real instructor, rating and review count, or null. Nothing invented.
 *   - A quality tier computed at ingest from six signals, not from the rating
 *     alone. See `scripts/ingest-catalog.mjs`.
 *
 * Career tags are derived here rather than stored, because a tag is a statement
 * about the relationship between a course and a role, and that relationship is
 * already expressed by the skills on both sides. Deriving it keeps the two from
 * drifting apart when a role's requirements change.
 */

export type QualityTier = 'core' | 'strong' | 'supplementary';

interface ExtendedRow {
  id: string;
  title: string;
  provider: string;
  instructor: string | null;
  source: string;
  url: string;
  domain: string;
  subdomain: string | null;
  skills: string[];
  level: string;
  estimatedHours: number | null;
  language: string;
  courseType: string;
  rating: number | null;
  reviewCount: number | null;
  moduleCount: number | null;
  projectBased: boolean;
  certificateAvailable: boolean;
  qualityScore: number;
  tier: QualityTier;
  lastVerified: string;
}

interface ExtendedFile {
  generatedAt: string;
  source: string;
  rows: ExtendedRow[];
}

const file = raw as unknown as ExtendedFile;

/** Tier by resource id, for ranking and for the catalog's own rows. */
const TIERS = new Map<string, QualityTier>();

/**
 * A course is tagged for a role when it teaches enough of what that role asks
 * for to be worth surfacing there. Two required skills, or one that the role
 * weights heavily, is the threshold: below that it is a coincidence rather than
 * a match, and tagging it would fill a role's row with near misses.
 */
function deriveCareerTags(skills: readonly string[]): string[] {
  const taught = new Set(skills);
  const tags: string[] = [];

  for (const career of CAREER_GOALS) {
    let matched = 0;
    let heavy = false;
    for (const req of career.skills) {
      if (!taught.has(req.skillId)) continue;
      matched++;
      if (req.required && req.weight >= 0.7) heavy = true;
    }
    if (matched >= 2 || heavy) tags.push(career.id);
  }
  return tags;
}

/**
 * Descriptions are generated, not stored. The dataset has none, and naming the
 * actual skills is more useful to a learner than marketing copy would be.
 */
function describe(row: ExtendedRow): string {
  const named = row.skills.slice(0, 4).map(skillName);
  const who = row.instructor ? ` Taught by ${row.instructor.split(',')[0].trim()}.` : '';
  if (named.length === 0) return `${row.title} from ${row.provider}.${who}`;
  return `Covers ${named.join(', ')}. From ${row.provider}.${who}`;
}

let decoded: LearningResource[] | null = null;

export function extendedResources(): LearningResource[] {
  if (decoded) return decoded;

  decoded = file.rows.map((row) => {
    TIERS.set(row.id, row.tier);
    return {
      id: row.id,
      title: row.title,
      provider: row.provider,
      source: row.source,
      url: row.url,
      description: describe(row),
      type: (row.courseType ?? 'course') as ResourceType,
      level: (row.level ?? 'intermediate') as ResourceLevel,
      // The dataset states hours for most rows. Where it does not, a neutral
      // mid length is used so the planner can still budget the course rather
      // than dropping it; it is an estimate either way.
      estimatedHours: row.estimatedHours ?? 20,
      skills: row.skills,
      // Coursera does not publish machine readable prerequisites, and guessing
      // them would break the one guarantee the roadmap makes.
      prerequisites: [],
      careerTags: deriveCareerTags(row.skills),
      projectBased: row.projectBased,
      language: row.language === 'en' ? 'English' : row.language,
      // Ordinary Coursera courses can be audited without paying. That is not
      // the same as free, and the UI distinguishes the two.
      access: 'audit' as ResourceAccess,
      isFree: false,
      linkKind: 'direct',
      rating: row.rating ?? undefined,
      ratingCount: row.reviewCount ?? undefined,
      subject: row.subdomain ?? undefined,
      lastVerified: row.lastVerified,
      status: 'dataset',
    } satisfies LearningResource;
  });

  return decoded;
}

/** Quality tier for a resource from this tier, or undefined for others. */
export function qualityTier(resourceId: string): QualityTier | undefined {
  if (TIERS.size === 0) extendedResources();
  return TIERS.get(resourceId);
}

/** How many rows this tier contributes, for the catalog's own counters. */
export const extendedCount = file.rows.length;
