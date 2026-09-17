import raw from '@/data/catalog.generated.json';
import { skillName } from '@/data/skills';
import type {
  LearningResource,
  ResourceAccess,
  ResourceLevel,
  ResourceType,
} from '@/data/resources';

/**
 * Decoder for the imported Coursera datasets.
 *
 * The generated file is deliberately compact (short keys, enumerated levels,
 * ids and descriptions derived rather than stored) because it is shipped to the
 * browser so the Learn page can search and build rails without a round trip.
 * Everything is expanded once, lazily, on first access.
 */

interface CompactRow {
  t: string;
  p: number;
  s: string[];
  c: string[];
  l: number;
  h: number;
  y: number;
  a: number;
  r?: number;
  n?: number;
  g?: string;
  b?: string;
}

interface CompactFile {
  generatedAt: string;
  levels: string[];
  access: string[];
  types: string[];
  providers: string[];
  rows: CompactRow[];
}

const file = raw as unknown as CompactFile;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Descriptions are generated rather than stored, the dataset has none, and a
 * template repeated 2,315 times is pure payload. Naming the actual skills is
 * more useful than marketing copy would be anyway.
 */
function describe(title: string, provider: string, skills: string[]): string {
  const named = skills.slice(0, 4).map(skillName);
  if (named.length === 0) return `${title} from ${provider}.`;
  const list =
    named.length === 1
      ? named[0]
      : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
  return `${provider} course covering ${list}.`;
}

let decoded: LearningResource[] | null = null;

/** The imported dataset as ordinary LearningResource records. */
export function datasetResources(): LearningResource[] {
  if (decoded) return decoded;

  decoded = file.rows.map((row) => {
    const provider = file.providers[row.p] ?? 'Coursera';
    const skills = row.s;
    return {
      id: `cs-${slugify(row.t)}`,
      title: row.t,
      provider,
      source: 'Coursera',
      // Neither dataset carries course URLs, so this is the provider's real
      // search endpoint, flagged as such by `linkKind`.
      url: `https://www.coursera.org/search?query=${encodeURIComponent(row.t)}`,
      description: describe(row.t, provider, skills),
      type: (file.types[row.y] ?? 'course') as ResourceType,
      level: (file.levels[row.l] ?? 'intermediate') as ResourceLevel,
      estimatedHours: row.h,
      skills,
      prerequisites: [],
      careerTags: row.c,
      projectBased: file.types[row.y] === 'project',
      language: 'English',
      access: (file.access[row.a] ?? 'paid') as ResourceAccess,
      isFree: file.access[row.a] !== 'paid',
      linkKind: 'search',
      thumbnail: row.g,
      rating: row.r,
      ratingCount: row.n,
      subject: row.b,
      lastVerified: file.generatedAt,
      status: 'dataset',
    } satisfies LearningResource;
  });

  return decoded;
}

export const datasetGeneratedAt = file.generatedAt;
export const datasetCount = file.rows.length;
