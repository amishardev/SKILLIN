/**
 * Deterministic LinkedIn profile PDF parser.
 *
 * LinkedIn's "Save to PDF" export has a stable, predictable shape: a left
 * sidebar (Contact / Top Skills / Languages / Certifications / Honors-Awards)
 * followed by the main column (headline, Summary, Experience, Education).
 *
 * This parser reads that structure directly. It is the *primary* extraction
 * path, Gemini, when configured, only enriches what is found here. That means
 * the product works with no API key, and nothing is ever invented: every field
 * below is copied from the document or left empty.
 */

import { sanitizePdfText } from './extract';
import { normalizeSkill } from '@/data/skills';
import type {
  AchievementEntry,
  CertificateEntry,
  EducationEntry,
  ExperienceEntry,
  ExtractedSkill,
  ProjectEntry,
  StudentProfile,
} from '@/types';

/** Headings LinkedIn emits, lowercased for matching. */
const SECTION_HEADINGS = [
  'contact',
  'top skills',
  'skills',
  'languages',
  'certifications',
  'honors-awards',
  'honors & awards',
  'awards',
  'publications',
  'projects',
  'summary',
  'experience',
  'education',
  'volunteer experience',
  'courses',
  'patents',
  'recommendations',
  'interests',
] as const;

type SectionName = (typeof SECTION_HEADINGS)[number];

export interface ParsedSections {
  [key: string]: string[];
}

/** True when the text carries LinkedIn's export fingerprints. */
export function looksLikeLinkedInExport(text: string): boolean {
  const lower = text.toLowerCase();
  let signals = 0;
  if (lower.includes('linkedin.com/in/')) signals += 2;
  if (lower.includes('top skills')) signals += 1;
  if (lower.includes('www.linkedin.com')) signals += 1;
  if (/\bpage \d+ of \d+\b/.test(lower)) signals += 1;
  return signals >= 2;
}

/**
 * Split the document into named sections.
 * A line is treated as a heading only when it matches a known LinkedIn section
 * title exactly, this avoids swallowing a job title like "Summary Intern".
 */
export function splitSections(text: string): ParsedSections {
  const lines = sanitizePdfText(text).split('\n');
  const sections: ParsedSections = { _preamble: [] };
  let current = '_preamble';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Page furniture repeats on every page and carries no profile information.
    if (/^page \d+ of \d+$/i.test(line)) continue;
    if (line === '\f') continue;

    const heading = SECTION_HEADINGS.find((h) => line.toLowerCase() === h);
    if (heading) {
      current = heading;
      if (!sections[current]) sections[current] = [];
      continue;
    }

    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }

  return sections;
}

// ══════════════════════════════════════════════════════════
// Field parsers
// ══════════════════════════════════════════════════════════

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\d[\d\s()-]{7,}\d)/;
const YEAR_RE = /\b(19|20)\d{2}\b/;
const DATE_RANGE_RE =
  /((?:January|February|March|April|May|June|July|August|September|October|November|December)?\s?(?:19|20)\d{2})\s*[-\u2013\u2014]\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)?\s?(?:19|20)\d{2}|Present)/i;

function firstMatch(lines: string[], re: RegExp): string | undefined {
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[0].trim();
  }
  return undefined;
}

/** Could this line plausibly be a person's name? */
function isNameLike(line: string): boolean {
  if (line.length < 2 || line.length > 60) return false;
  if (/\d/.test(line)) return false;
  if (EMAIL_RE.test(line) || /linkedin\.com|www\.|https?:|@/i.test(line)) return false;
  // Locations and headlines carry separators; names do not.
  if (/[,|·•/]/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;
  return /^[A-ZÀ-ɏ]/.test(line);
}

/**
 * The identity block (name, headline, location) sits in the main column just
 * above "Summary". Because LinkedIn emits the whole sidebar first, that block
 * lands in whichever sidebar section happened to be open, so it cannot be
 * found by section name. We locate it positionally instead: walk backwards from
 * the first main-column heading until a name-shaped line appears.
 */
interface Identity {
  name: string;
  headline?: string;
  location?: string;
  /**
   * The exact lines the identity block occupied. LinkedIn emits this block
   * after the sidebar, so it lands inside whichever sidebar section was open, * typically Honors-Awards. Callers strip these lines from the sections so the
   * learner's own name does not turn up as an achievement.
   */
  blockLines: string[];
}

function parseIdentity(text: string): Identity {
  const lines = sanitizePdfText(text)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^page \d+ of \d+$/i.test(l));

  const anchorIndex = lines.findIndex((l) =>
    ['summary', 'experience', 'education'].includes(l.toLowerCase()));
  if (anchorIndex <= 0) return { name: nameFromSlug(text), blockLines: [] };

  let name = '';
  let headline: string | undefined;
  let location: string | undefined;
  let blockLines: string[] = [];

  // Scan back over the identity block, stopping at the previous heading.
  for (let i = anchorIndex - 1; i >= 0 && anchorIndex - i <= 8; i--) {
    const line = lines[i];
    if (SECTION_HEADINGS.includes(line.toLowerCase() as SectionName)) break;

    if (isNameLike(line)) {
      name = line;
      // Whatever followed the name is the headline, then the location.
      headline = lines[i + 1] !== undefined && lines[i + 1].toLowerCase() !== 'summary'
        ? lines[i + 1]
        : undefined;
      const maybeLocation = lines[i + 2];
      if (maybeLocation && /,/.test(maybeLocation) && maybeLocation.length < 80) {
        location = maybeLocation;
      }
      blockLines = [name, headline, location].filter((l): l is string => Boolean(l));
      break;
    }
  }

  return { name: name || nameFromSlug(text), headline, location, blockLines };
}

/** Fallback: derive a display name from the profile slug when nothing else works. */
function nameFromSlug(text: string): string {
  const slug = text.match(/linkedin\.com\/in\/([a-z0-9-]+)/i)?.[1];
  if (!slug) return '';
  const words = slug
    .split('-')
    // Slugs often end in a disambiguator like "dev" or "a1b2c3".
    .filter((w) => w.length > 1 && !/\d/.test(w))
    .slice(0, 3);
  if (words.length === 0) return '';
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function parseTopSkills(sections: ParsedSections): ExtractedSkill[] {
  const lines = [...(sections['top skills'] ?? []), ...(sections.skills ?? [])];
  const out: ExtractedSkill[] = [];

  for (const line of lines) {
    // A skills line may be one per line, or comma separated.
    const parts = line.includes(',') ? line.split(',') : [line];
    for (const part of parts) {
      const raw = part.trim();
      if (!raw || raw.length > 60) continue;
      out.push({
        skillId: normalizeSkill(raw),
        rawName: raw,
        // LinkedIn "Top Skills" are endorsed and self-selected: real evidence,
        // but weaker than a shipped project.
        confidence: 0.75,
        source: 'self',
        evidence: 'Listed in your LinkedIn Skills section',
        explicit: true,
      });
    }
  }
  return out;
}

function parseCertificates(sections: ParsedSections): CertificateEntry[] {
  const lines = sections.certifications ?? [];
  return lines
    .filter((l) => l.length > 2 && l.length < 140)
    .map((line, i) => {
      const year = line.match(YEAR_RE)?.[0];
      return {
        id: `cert-${i}`,
        title: line.replace(YEAR_RE, '').replace(/[-\u2013\u2014|]\s*$/, '').trim(),
        issuer: '',
        year: year ? Number(year) : undefined,
        // A certificate title usually names its subject ("Python for Data Science").
        skills: extractSkillMentions(line),
      };
    });
}

function parseAchievements(sections: ParsedSections): AchievementEntry[] {
  const lines = [
    ...(sections['honors-awards'] ?? []), ...(sections['honors & awards'] ?? []), ...(sections.awards ?? []), ...(sections.publications ?? []),
  ];
  return lines
    .filter((l) => l.length > 3 && l.length < 200)
    .map((line, i) => {
      const year = line.match(YEAR_RE)?.[0];
      return {
        id: `ach-${i}`,
        title: line.replace(YEAR_RE, '').trim() || line,
        year: year ? Number(year) : undefined,
      };
    });
}

/**
 * Education entries look like:
 *   Indian Institute of Technology Bombay
 *   Bachelor of Technology - BTech, Computer Science · (2021 - 2025)
 */
function parseEducation(sections: ParsedSections): EducationEntry[] {
  const lines = sections.education ?? [];
  const entries: EducationEntry[] = [];
  let pending: Partial<EducationEntry> | null = null;

  const flush = () => {
    if (pending?.institution) {
      entries.push({
        institution: pending.institution,
        degree: pending.degree ?? '',
        branch: pending.branch ?? '',
        startYear: pending.startYear,
        endYear: pending.endYear,
      });
    }
    pending = null;
  };

  for (const line of lines) {
    const hasDegreeWords =
      /\b(bachelor|master|b\.?tech|m\.?tech|b\.?e\b|m\.?e\b|b\.?sc|m\.?sc|bs\b|ms\b|ba\b|mba|phd|doctor|diploma|associate|secondary|high school)\b/i.test(
        line);

    if (hasDegreeWords && pending) {
      // Degree line: "Bachelor of Technology - BTech, Computer Science · (2021 - 2025)"
      const years = [...line.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => Number(m[1]));
      const withoutYears = line.replace(/·?\s*\(?[^()]*\b(19|20)\d{2}\b[^()]*\)?/g, '').trim();
      const [degreePart, ...rest] = withoutYears.split(',');
      pending.degree = (degreePart ?? '').replace(/[·,\s-]+$/, '').trim();
      pending.branch = rest.join(',').replace(/[·,\s-]+$/, '').trim();
      if (years.length >= 1) pending.startYear = years[0];
      if (years.length >= 2) pending.endYear = years[1];
      flush();
      continue;
    }

    // Anything else at this level starts a new institution.
    flush();
    pending = { institution: line };
  }
  flush();

  return entries;
}

/**
 * Experience blocks look like:
 *   Acme Analytics
 *   Data Analyst Intern
 *   May 2024 - August 2024 (4 months)
 *   Mumbai, India
 *   <description lines>
 */
/** Lines LinkedIn puts under a date range that are a place, not a description. */
function isLocationLine(line: string): boolean {
  if (line.length > 70) return false;
  if (/^(remote|hybrid|on-?site)$/i.test(line)) return true;
  // "Mumbai, Maharashtra, India", commas, capitalised, no sentence punctuation.
  return /^[A-Z][^.;]*, [^.;]*$/.test(line) && line.split(' ').length <= 8;
}

/**
 * Parse positions by anchoring on date ranges.
 *
 * Every LinkedIn position emits exactly one date-range line, and the company
 * and role always sit on the two lines directly above it. Anchoring on the
 * dates is therefore far more reliable than trying to detect where one block
 * ends and the next begins by shape alone.
 */
function parseExperience(sections: ParsedSections): ExperienceEntry[] {
  const lines = sections.experience ?? [];
  const anchors: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (DATE_RANGE_RE.test(lines[i])) anchors.push(i);
  }
  if (anchors.length === 0) return [];

  const entries: ExperienceEntry[] = [];

  for (let a = 0; a < anchors.length; a++) {
    const d = anchors[a];
    const prevAnchor = a > 0 ? anchors[a - 1] : -1;

    const roleLine = d - 1 > prevAnchor ? lines[d - 1] : undefined;
    const orgLine = d - 2 > prevAnchor ? lines[d - 2] : undefined;

    // When the company line was already consumed by the previous position's
    // description, this is a second role at the same employer.
    const organization = orgLine ?? entries[entries.length - 1]?.organization ?? '';
    const role = roleLine ?? '';
    if (!organization && !role) continue;

    const match = lines[d].match(DATE_RANGE_RE);

    // The description runs to two lines before the next anchor (that pair being
    // the next company and role), or to the end of the section.
    const stop = a + 1 < anchors.length ? Math.max(d + 1, anchors[a + 1] - 2) : lines.length;
    const body: string[] = [];
    for (let i = d + 1; i < stop; i++) {
      if (i === d + 1 && isLocationLine(lines[i])) continue;
      body.push(lines[i]);
    }

    const description = body.join(' ').trim();
    entries.push({
      id: `exp-${entries.length}`,
      organization,
      role,
      description,
      technologies: extractSkillMentions(`${role} ${description}`),
      skills: [],
      startDate: match?.[1]?.trim(),
      endDate: match?.[2]?.trim(),
      kind: /intern/i.test(role) ? 'internship' : 'work',
    });
  }

  return entries;
}

function parseProjects(sections: ParsedSections): ProjectEntry[] {
  const lines = sections.projects ?? [];
  const projects: ProjectEntry[] = [];

  let title = '';
  let body: string[] = [];

  const flush = () => {
    if (title) {
      const description = body.join(' ').trim();
      projects.push({
        id: `proj-${projects.length}`,
        title,
        description,
        technologies: extractSkillMentions(`${title} ${description}`),
        skills: [],
        year: Number(`${title} ${description}`.match(YEAR_RE)?.[0]) || undefined,
      });
    }
    title = '';
    body = [];
  };

  // PDF extraction preserves the publisher's hard line breaks, so a project
  // description arrives as several wrapped lines. Length alone cannot tell a
  // title from a wrapped sentence, "Applied SMOTE for class imbalance." is
  // short and capitalised but is plainly not a title. The reliable signal is
  // punctuation: a title carries no terminal full stop, and the line before it
  // closed the previous description.
  let previousClosedSentence = true;

  for (const line of lines) {
    const endsSentence = /[.;:!?]$/.test(line);
    const looksLikeTitle = line.length <= 90 && !endsSentence && /^[A-Z0-9]/.test(line);

    if (looksLikeTitle && (!title || previousClosedSentence)) {
      flush();
      title = line;
    } else {
      body.push(line);
    }
    previousClosedSentence = endsSentence;
  }
  flush();

  return projects;
}

/**
 * Find canonical skills mentioned anywhere in a block of text.
 * Only exact token matches against the taxonomy count, this never guesses.
 */
export function extractSkillMentions(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  // Split on anything that cannot appear inside a skill name, keeping "c++",
  // "node.js" and "scikit-learn" intact.
  const tokens = text.split(/[^A-Za-z0-9+#.\- ]+/);

  for (const token of tokens) {
    const words = token.split(' ').filter(Boolean);
    // Check unigrams through trigrams so "machine learning" and
    // "natural language processing" both resolve.
    for (let n = 3; n >= 1; n--) {
      for (let i = 0; i + n <= words.length; i++) {
        const phrase = words.slice(i, i + n).join(' ').replace(/[.,;:]+$/, '');
        if (phrase.length < 2) continue;
        const id = normalizeSkill(phrase);
        if (id) found.add(id);
      }
    }
  }
  return [...found];
}

// ══════════════════════════════════════════════════════════
// Entry point
// ══════════════════════════════════════════════════════════

export interface ParseResult {
  profile: StudentProfile;
  /** Sections the parser recognised, surfaced so the UI can say what was read. */
  sectionsFound: string[];
  /** True when the document carries LinkedIn's export fingerprints. */
  isLinkedIn: boolean;
}

/**
 * Parse profile text into a structured profile using only what the document says.
 */
export function parseLinkedInText(text: string, source: StudentProfile['source']): ParseResult {
  const rawSections = splitSections(text);
  const identity = parseIdentity(text);

  // Remove the identity block wherever it landed, so the name, headline and
  // location cannot be read back as an award, a certificate or a skill.
  const identityLines = new Set(identity.blockLines);
  const sections: ParsedSections = {};
  for (const [key, lines] of Object.entries(rawSections)) {
    sections[key] = lines.filter((line) => !identityLines.has(line));
  }
  const sectionsFound = Object.keys(sections).filter(
    (k) => k !== '_preamble' && (sections[k]?.length ?? 0) > 0);

  const contactLines = [...(sections.contact ?? []), ...(sections._preamble ?? [])];
  const education = parseEducation(sections);
  const experience = parseExperience(sections);
  const projects = parseProjects(sections);

  const latestEducation = education[0];

  const profile: StudentProfile = {
    name: identity.name,
    email: firstMatch(contactLines, EMAIL_RE),
    phone: firstMatch(contactLines, PHONE_RE),
    location: identity.location,
    headline: identity.headline,
    summary: (sections.summary ?? []).join(' ') || undefined,
    education,
    college: latestEducation?.institution,
    degree: latestEducation?.degree,
    branch: latestEducation?.branch,
    graduationYear: latestEducation?.endYear,
    projects,
    experience,
    certificates: parseCertificates(sections),
    achievements: parseAchievements(sections),
    declaredSkills: parseTopSkills(sections),
    source,
    extractedAt: new Date().toISOString(),
    aiAssisted: false,
  };

  return { profile, sectionsFound, isLinkedIn: looksLikeLinkedInExport(text) };
}
