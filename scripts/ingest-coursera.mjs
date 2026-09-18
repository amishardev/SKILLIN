/**
 * Ingests the two Coursera datasets into SkillIn's catalog format.
 *
 *   node scripts/ingest-coursera.mjs <coursera.csv> <coursera_1000_courses.csv>
 *
 * What this does and does not do:
 *
 *  - Skills are mapped onto SkillIn's canonical taxonomy. A course whose
 *    skills resolve to nothing is DROPPED rather than given invented tags.
 *  - Neither dataset contains course URLs. We therefore link to Coursera's
 *    real search endpoint with the title as the query, and mark the entry so
 *    the UI can say so. We never fabricate a /learn/<slug> URL.
 *  - Access is inferred from the product type: ordinary Courses can be
 *    audited without paying; Guided Projects, Specializations, Professional
 *    Certificates and Degrees cannot. Nothing is claimed to be "Free".
 *  - Output is written as compact JSON, loaded only by the Learn route.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ── Load the canonical taxonomy by evaluating the TS source's data ──────────
// The skills file is plain data plus pure functions, so the alias index can be
// rebuilt here without a TypeScript toolchain.
const skillsSrc = readFileSync(new URL('../data/skills.ts', import.meta.url), 'utf8');

const SKILLS = [];
// Categories and domains may be hyphenated (`social-science`), so both
// character classes allow a dash. Without it six skills were silently skipped.
const skillRe = /\{ id: '([a-z0-9-]+)', name: '([^']+)', category: '[a-z-]+', domain: '[a-z-]+', aliases: \[([^\]]*)\]/g;
for (const m of skillsSrc.matchAll(skillRe)) {
  const aliases = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((a) => a[1]);
  SKILLS.push({ id: m[1], name: m[2].replace(/\\'/g, "'"), aliases });
}
if (SKILLS.length < 100) {
  throw new Error(`Only parsed ${SKILLS.length} skills from data/skills.ts, the shape changed.`);
}

const ALIAS_INDEX = new Map();
for (const s of SKILLS) {
  ALIAS_INDEX.set(s.name.toLowerCase(), s.id);
  ALIAS_INDEX.set(s.id, s.id);
  for (const a of s.aliases) ALIAS_INDEX.set(a.toLowerCase(), s.id);
}

function canonicalize(raw) {
  return raw.toLowerCase().trim().replace(/[‘’'"`]/g, '').replace(/\s+/g, ' ');
}

function normalizeSkill(raw) {
  if (!raw) return null;
  const key = canonicalize(raw);
  if (!key) return null;
  const direct = ALIAS_INDEX.get(key);
  if (direct) return direct;
  const loose = key.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const hit = ALIAS_INDEX.get(loose);
  if (hit) return hit;
  const squished = loose.replace(/\s/g, '');
  for (const [alias, id] of ALIAS_INDEX) {
    if (alias.replace(/[\s\-_.]/g, '') === squished) return id;
  }
  return null;
}

/**
 * Dataset skill strings are noisy ("Python Programming", "Data Analysis and
 * Visualization"). Try the whole phrase, then its comma/`and` parts, then
 * sliding n-grams, so "Python Programming" still resolves to `python`.
 */
function resolveSkillPhrase(phrase) {
  const found = new Set();
  const direct = normalizeSkill(phrase);
  if (direct) {
    found.add(direct);
    return found;
  }
  const words = phrase.replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  for (let n = Math.min(4, words.length); n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const id = normalizeSkill(words.slice(i, i + n).join(' '));
      if (id) found.add(id);
    }
  }
  return found;
}

// ── CSV parsing (RFC 4180: quoted fields, escaped quotes, embedded newlines) ─
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  const src = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function toObjects(rows) {
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

// ── Field mapping ───────────────────────────────────────────────────────────

/** Coursera duration strings → a usable hour estimate. */
function durationToHours(raw) {
  const d = (raw || '').toLowerCase();
  if (d.includes('less than 2 hours')) return 2;
  if (d.includes('1 - 4 weeks') || d.includes('1-4 weeks')) return 15;
  if (d.includes('1 - 3 months') || d.includes('1-3 months')) return 45;
  if (d.includes('3 - 6 months') || d.includes('3-6 months')) return 110;
  if (d.includes('6 - 12 months') || d.includes('6-12 months')) return 220;
  const weeks = d.match(/(\d+)\s*week/);
  if (weeks) return Number(weeks[1]) * 5;
  const hours = d.match(/(\d+)\s*hour/);
  if (hours) return Number(hours[1]);
  const months = d.match(/(\d+)\s*month/);
  if (months) return Number(months[1]) * 18;
  return 20;
}

function normalizeLevel(raw) {
  const l = (raw || '').toLowerCase();
  if (l.startsWith('begin')) return 'beginner';
  if (l.startsWith('adv')) return 'advanced';
  if (l.startsWith('inter')) return 'intermediate';
  // "Mixed" and blanks: treat as intermediate rather than guessing either end.
  return 'intermediate';
}

/** Coursera product names → SkillIn resource types. */
function productToType(raw) {
  const p = (raw || '').toLowerCase();
  if (p.includes('guided project')) return 'project';
  if (p.includes('project')) return 'project';
  if (p.includes('specialization')) return 'course';
  if (p.includes('professional certificate')) return 'course';
  if (p.includes('degree')) return 'course';
  return 'course';
}

/**
 * Access tier. Coursera lets you audit an ordinary course's material for free;
 * multi-course programmes and guided projects require payment. We never label
 * a paid programme "Free".
 */
function accessFor(product) {
  const p = (product || '').toLowerCase();
  if (p.includes('guided project')) return 'paid';
  if (p.includes('specialization')) return 'paid';
  if (p.includes('professional certificate')) return 'paid';
  if (p.includes('certificate')) return 'paid';
  if (p.includes('degree')) return 'paid';
  return 'audit';
}

/** Dataset subject → career ids in SkillIn's taxonomy. */
const SUBJECT_CAREERS = {
  'computer science': ['software-engineer', 'backend-developer', 'fullstack-developer'],
  'data science': ['data-scientist', 'data-analyst', 'ml-engineer'],
  'information technology': ['cloud-engineer', 'devops-engineer', 'cybersecurity-engineer'],
  business: ['product-manager', 'data-analyst'],
  'arts and humanities': ['product-designer', 'technical-writer'],
  'physical science and engineering': ['embedded-engineer', 'robotics-engineer'],
  'math and logic': ['ai-researcher', 'quantum-engineer'],
  'social sciences': ['product-manager'],
  'personal development': ['product-manager'],
  health: ['bioinformatics-engineer'],
  'language learning': [],
};

/** Careers whose required skills this course actually covers. */
function careersForSkills(skillIds, careerIndex) {
  const tags = [];
  for (const [careerId, required] of careerIndex) {
    const hits = skillIds.filter((s) => required.has(s)).length;
    if (hits >= 2) tags.push({ careerId, hits });
  }
  return tags
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5)
    .map((t) => t.careerId);
}

/** Build careerId → Set(requiredSkillIds) from the careers source. */
function loadCareerIndex() {
  const src = readFileSync(new URL('../data/careers.ts', import.meta.url), 'utf8');
  const index = new Map();
  const blocks = src.split(/\n  \{\n    id: '/).slice(1);
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf("'"));
    const skills = new Set(
      [...block.matchAll(/(?:req|pref)\('([a-z0-9-]+)'/g)].map((m) => m[1]));
    if (id && skills.size > 0) index.set(id, skills);
  }
  return index;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Coursera's real search endpoint, not a guessed course slug. */
function searchUrl(title) {
  return `https://www.coursera.org/search?query=${encodeURIComponent(title)}`;
}

function parseReviewCount(raw) {
  if (!raw) return undefined;
  const m = String(raw).replace(/[(),]/g, '').match(/([\d.]+)\s*([km])?/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const mult = m[2]?.toLowerCase() === 'k' ? 1000 : m[2]?.toLowerCase() === 'm' ? 1e6 : 1;
  return Math.round(n * mult);
}

// ── Main ────────────────────────────────────────────────────────────────────

const [, pathA, pathB] = process.argv;
if (!pathA || !pathB) {
  console.error('usage: node scripts/ingest-coursera.mjs <Coursera.csv> <coursera_1000_Courses>');
  process.exit(1);
}

const careerIndex = loadCareerIndex();
const out = new Map(); // dedupe key → record
const stats = { readA: 0, readB: 0, noSkills: 0, duplicate: 0, kept: 0 };

function add(record, dedupeKey) {
  if (out.has(dedupeKey)) {
    // Prefer whichever version carries a thumbnail.
    const existing = out.get(dedupeKey);
    if (!existing.thumbnail && record.thumbnail) out.set(dedupeKey, { ...existing, thumbnail: record.thumbnail });
    stats.duplicate++;
    return;
  }
  out.set(dedupeKey, record);
  stats.kept++;
}

// ── Dataset A: Coursera.csv (subjects + gained skills, no images) ──
{
  const rows = toObjects(parseCsv(readFileSync(pathA, 'utf8')));
  stats.readA = rows.length;

  for (const r of rows) {
    const title = r.Title;
    if (!title) continue;

    const skillIds = new Set();
    for (const part of (r['Gained Skills'] || '').split(',')) {
      const p = part.trim();
      if (!p) continue;
      for (const id of resolveSkillPhrase(p)) skillIds.add(id);
    }
    if (skillIds.size === 0) {
      stats.noSkills++;
      continue;
    }

    const skills = [...skillIds];
    const subject = (r.Subject || '').toLowerCase();
    const careerTags = [
      ...new Set([...(SUBJECT_CAREERS[subject] ?? []), ...careersForSkills(skills, careerIndex)]),
    ].slice(0, 6);

    const rating = parseFloat(r.Rate);
    add(
      {
        id: `cs-${slugify(title)}`,
        title,
        provider: r.Institution || 'Coursera',
        source: 'Coursera',
        url: searchUrl(title),
        description: `${r['Learning Product'] || 'Course'} from ${r.Institution || 'Coursera'} covering ${skills
          .slice(0, 4)
          .map((s) => SKILLS.find((x) => x.id === s)?.name ?? s)
          .join(', ')}.`,
        type: productToType(r['Learning Product']),
        level: normalizeLevel(r.Level),
        estimatedHours: durationToHours(r.Duration),
        skills,
        prerequisites: [],
        careerTags,
        projectBased: productToType(r['Learning Product']) === 'project',
        access: accessFor(r['Learning Product']),
        rating: Number.isFinite(rating) ? rating : undefined,
        ratingCount: parseReviewCount(r.Reviews),
        subject: r.Subject || undefined,
        origin: 'dataset',
        linkKind: 'search',
      },
      slugify(title));
  }
}

// ── Dataset B: coursera_1000_Courses (has banner images) ──
{
  const rows = toObjects(parseCsv(readFileSync(pathB, 'utf8')));
  stats.readB = rows.length;

  for (const r of rows) {
    const title = r.Course_Name;
    if (!title) continue;

    const skillIds = new Set();
    // Values look like "Skills you'll gain: A, B, C".
    const raw = (r.Skills || '').replace(/^.*?gain:?\s*/i, '');
    for (const part of raw.split(',')) {
      const p = part.trim();
      if (!p) continue;
      for (const id of resolveSkillPhrase(p)) skillIds.add(id);
    }
    if (skillIds.size === 0) {
      stats.noSkills++;
      continue;
    }

    const skills = [...skillIds];
    const careerTags = careersForSkills(skills, careerIndex);
    const rating = parseFloat(r.Ratings);
    const banner = (r.Course_Banner || '').trim();

    add(
      {
        id: `cs-${slugify(title)}`,
        title,
        provider: r.Company_Name || 'Coursera',
        source: 'Coursera',
        url: searchUrl(title),
        thumbnail: banner.startsWith('http') ? banner : undefined,
        description: `${r.Type_Of_Certificate || 'Course'} from ${r.Company_Name || 'Coursera'} covering ${skills
          .slice(0, 4)
          .map((s) => SKILLS.find((x) => x.id === s)?.name ?? s)
          .join(', ')}.`,
        type: productToType(r.Type_Of_Certificate),
        level: normalizeLevel(r.Difficulty),
        estimatedHours: durationToHours(r.Duration),
        skills,
        prerequisites: [],
        careerTags,
        projectBased: productToType(r.Type_Of_Certificate) === 'project',
        access: accessFor(r.Type_Of_Certificate),
        rating: Number.isFinite(rating) ? rating : undefined,
        ratingCount: parseReviewCount(r.Reviews),
        origin: 'dataset',
        linkKind: 'search',
      },
      slugify(title));
  }
}

// ── Emit ────────────────────────────────────────────────────────────────────
const records = [...out.values()]
  // Something with no career relevance at all cannot be recommended usefully.
  .filter((r) => r.careerTags.length > 0)
  .sort((a, b) => a.title.localeCompare(b.title));

/**
 * The catalog is shipped to the browser so the Learn page can search, filter
 * and build personalised rails without a round trip per keystroke. It is
 * therefore stored compactly: short keys, enumerated levels and access tiers,
 * ids and descriptions derived at read time rather than stored, and thumbnails
 * reduced to the underlying image URL instead of Coursera's proxy wrapper
 * (which also forces a small 265x216 crop we do not want).
 */
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ACCESS = ['free', 'audit', 'paid'];
const TYPES = ['course', 'project', 'playlist', 'lecture-series', 'tutorial', 'documentation', 'book', 'practice'];

/** Unwrap `.../imageproxy/<real url>?...` and drop the crop parameters. */
function slimThumbnail(url) {
  if (!url) return undefined;
  const proxied = url.match(/imageproxy\/(https?:\/\/[^?]+)/);
  const real = proxied ? proxied[1] : url.split('?')[0];
  return real.startsWith('http') ? real : undefined;
}

const providers = [];
const providerIndex = new Map();
function providerId(name) {
  if (!providerIndex.has(name)) {
    providerIndex.set(name, providers.length);
    providers.push(name);
  }
  return providerIndex.get(name);
}

const compact = records.map((r) => {
  const row = {
    t: r.title,
    p: providerId(r.provider),
    s: r.skills,
    c: r.careerTags,
    l: LEVELS.indexOf(r.level),
    h: r.estimatedHours,
    y: TYPES.indexOf(r.type),
    a: ACCESS.indexOf(r.access),
  };
  if (r.rating !== undefined) row.r = r.rating;
  if (r.ratingCount !== undefined) row.n = r.ratingCount;
  const thumb = slimThumbnail(r.thumbnail);
  if (thumb) row.g = thumb;
  if (r.subject) row.b = r.subject;
  return row;
});

const target = new URL('../data/catalog.generated.json', import.meta.url);
writeFileSync(
  target,
  JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Generated by scripts/ingest-coursera.mjs, do not edit by hand. Decoded by lib/catalog/dataset.ts.',
    levels: LEVELS,
    access: ACCESS,
    types: TYPES,
    providers,
    rows: compact,
  }));

const withThumb = records.filter((r) => r.thumbnail).length;
const bySkill = new Map();
for (const r of records) for (const s of r.skills) bySkill.set(s, (bySkill.get(s) ?? 0) + 1);

console.log(`
  rows read        ${stats.readA} + ${stats.readB}
  dropped (skills) ${stats.noSkills}
  duplicates       ${stats.duplicate}
  ────────────────────────────
  written          ${records.length}
  with thumbnail   ${withThumb}
  distinct skills  ${bySkill.size}
  file             data/catalog.generated.json (${(readFileSync(target,"utf8").length/1024).toFixed(0)} KB)
`);

void pathToFileURL;
