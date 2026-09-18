/**
 * Ingests the rich Coursera export into SkillIn's catalog format.
 *
 *   node scripts/ingest-catalog.mjs dataset/CourseraDataset-Clean.csv
 *
 * This dataset is the one worth using, because unlike the earlier two it
 * carries a real course URL, a real instructor, a real rating and a real review
 * count for every row. Nothing below invents any of those. Where a field is
 * absent it is stored as null and the quality model simply has one fewer signal
 * to work with.
 *
 * What gets dropped, and why:
 *
 *  - No skill resolves to the canonical taxonomy. A course we cannot place in
 *    the skill graph cannot be recommended for a gap, so it is noise.
 *  - Duplicate URL, or a duplicate normalised title from the same provider.
 *  - Fewer than MIN_REVIEWS ratings. A 5.0 from four people is not a signal.
 *  - Title matched a skill only through a generic keyword with no support from
 *    the declared skill list.
 *
 * The result is deliberately smaller than the input. Quality over quantity is
 * the point: a catalog of 8,370 loosely tagged rows recommends worse than a
 * few thousand well placed ones.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const MIN_REVIEWS = 25;
const MIN_RATING = 3.8;

// ── Canonical taxonomy, parsed from the TS source ──────────────────────────
const skillsSrc = readFileSync(new URL('../data/skills.ts', import.meta.url), 'utf8');
const SKILLS = [];
const skillRe =
  /\{ id: '([a-z0-9-]+)', name: '([^']+)', category: '[a-z-]+', domain: '[a-z-]+', aliases: \[([^\]]*)\]/g;
for (const m of skillsSrc.matchAll(skillRe)) {
  const aliases = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((a) => a[1]);
  SKILLS.push({ id: m[1], name: m[2].replace(/\\'/g, "'"), aliases });
}
if (SKILLS.length < 150) {
  throw new Error(`Only parsed ${SKILLS.length} skills from data/skills.ts, the shape changed.`);
}

const ALIAS_INDEX = new Map();
for (const s of SKILLS) {
  ALIAS_INDEX.set(s.name.toLowerCase(), s.id);
  ALIAS_INDEX.set(s.id, s.id);
  for (const a of s.aliases) ALIAS_INDEX.set(a.toLowerCase(), s.id);
}

const canonical = (raw) =>
  raw.toLowerCase().trim().replace(/[‘’'"`]/g, '').replace(/\s+/g, ' ');

/**
 * Source titles occasionally carry em and en dashes. Once ingested they are
 * product copy shown in the UI, so they are normalised here rather than left
 * for the repo-wide check to trip over.
 */
const cleanText = (raw) =>
  String(raw ?? '')
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/(\d)\s*\u2013\s*(\d)/g, '$1-$2')
    .replace(/\s*\u2013\s*/g, ', ')
    .trim();

function normalizeSkill(raw) {
  if (!raw) return null;
  const key = canonical(raw);
  if (ALIAS_INDEX.has(key)) return ALIAS_INDEX.get(key);
  // Try dropping a trailing qualifier: "Python Programming" -> "Python".
  const trimmed = key.replace(/\b(programming|development|fundamentals|basics|skills|techniques)\b/g, '').trim();
  if (trimmed && ALIAS_INDEX.has(trimmed)) return ALIAS_INDEX.get(trimmed);
  return null;
}

// ── CSV parsing, quoted fields and embedded newlines ───────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/**
 * Publisher credibility, independent of audience size.
 *
 * This is the main structural defence against popularity bias: a university or
 * a first-party engineering org scores as highly as a brand with a large
 * marketing budget. Anything unrecognised gets the neutral default rather than
 * a penalty, because unknown is not the same as bad.
 */
const PROVIDER_TRUST = [
  [/university|universidad|universite|college|institute of technology|\biit\b|\biim\b/i, 0.95],
  [/museum|smithsonian|royal academy|conservatory/i, 0.92],
  [/google|microsoft|ibm|amazon|meta|nvidia|intel|adobe|autodesk/i, 0.90],
  [/deeplearning\.ai|hugging ?face|anthropic|openai/i, 0.90],
  [/mckinsey|bcg|deloitte|pwc|kpmg/i, 0.88],
];
function providerTrust(name) {
  for (const [re, score] of PROVIDER_TRUST) if (re.test(name)) return score;
  return 0.72;
}

const LEVELS = { 'beginner level': 'beginner', 'intermediate level': 'intermediate', 'advanced level': 'advanced' };

/** Domain keyword from the dataset, mapped to SkillIn's top level grouping. */
const DOMAIN_MAP = {
  'Computer Science': 'technology',
  'Information Technology': 'technology',
  DataScience: 'technology',
  'Math and Logic': 'technology',
  'Physical Science and Engineering': 'technology',
  Business: 'business',
  'Personal Development': 'business',
  'Arts and Humanities': 'creative',
  'Social Sciences': 'humanities',
  Health: 'humanities',
};

const PROJECT_RE = /\bproject|portfolio|capstone|hands[- ]on|build a|case stud/i;

function main() {
  const file = process.argv[2] ?? 'dataset/CourseraDataset-Clean.csv';
  const raw = parseCsv(readFileSync(file, 'utf8'));

  const stats = { read: raw.length, noSkill: 0, thinReviews: 0, lowRating: 0, duplicate: 0, kept: 0 };
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];

  for (const r of raw) {
    const title = cleanText(r['Course Title']);
    const url = (r['Course Url'] ?? '').trim();
    if (!title || !url.startsWith('http')) continue;

    // ── Skills. Declared list only: a title keyword alone is not evidence. ──
    const declared = (r['Skill gain'] ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && x !== 'Not specified');
    const skills = [...new Set(declared.map(normalizeSkill).filter(Boolean))];
    if (skills.length === 0) { stats.noSkill++; continue; }

    // ── Real numbers only, null where the dataset has nothing. ──
    const rating = Number.parseFloat(r['Rating']);
    const reviews = Number.parseInt((r['Number of Review'] ?? '').replace(/[^0-9]/g, ''), 10);
    const hasRating = Number.isFinite(rating) && rating > 0;
    const hasReviews = Number.isFinite(reviews) && reviews > 0;

    if (hasReviews && reviews < MIN_REVIEWS) { stats.thinReviews++; continue; }
    if (hasRating && rating < MIN_RATING) { stats.lowRating++; continue; }

    const provider = cleanText(r['Offered By']) || 'Coursera';
    const titleKey = `${provider.toLowerCase()}::${canonical(title)}`;
    if (seenUrl.has(url) || seenTitle.has(titleKey)) { stats.duplicate++; continue; }
    seenUrl.add(url);
    seenTitle.add(titleKey);

    const modules = (r['Modules'] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const outcomes = (r['What you will learn'] ?? '').trim();
    const hasOutcomes = Boolean(outcomes) && outcomes !== 'Not specified';
    const hours = Number.parseFloat(r['Duration to complete (Approx.)']);
    const instructor = cleanText(r['Instructor']) || null;
    const projectBased = PROJECT_RE.test(`${title} ${outcomes} ${modules.join(' ')}`);

    // ── Quality: several signals, deliberately not just the rating ──
    const signals = {
      provider: providerTrust(provider),
      // Rating normalised across the band that actually occurs, 3.8 to 5.0.
      rating: hasRating ? Math.min(1, Math.max(0, (rating - 3.8) / 1.2)) : null,
      // Confidence in that rating, saturating around a thousand reviews.
      reviewVolume: hasReviews ? Math.min(1, Math.log10(reviews + 1) / 3) : null,
      // A syllabus and stated outcomes mean the course describes itself.
      completeness: (modules.length >= 3 ? 0.6 : modules.length > 0 ? 0.3 : 0) + (hasOutcomes ? 0.4 : 0),
      practical: projectBased ? 1 : 0,
      // How cleanly it lands in the taxonomy.
      skillClarity: Math.min(1, skills.length / 4),
    };

    const WEIGHTS = {
      provider: 0.28, rating: 0.18, reviewVolume: 0.14,
      completeness: 0.16, practical: 0.12, skillClarity: 0.12,
    };
    // Missing signals are dropped and the remaining weights renormalised, so an
    // unrated course is not silently punished for the absence.
    let sum = 0;
    let weight = 0;
    for (const [k, w] of Object.entries(WEIGHTS)) {
      if (signals[k] === null) continue;
      sum += signals[k] * w;
      weight += w;
    }
    const qualityScore = weight > 0 ? sum / weight : 0;

    const tier = qualityScore >= 0.72 ? 'core' : qualityScore >= 0.58 ? 'strong' : 'supplementary';

    out.push({
      id: 'cr-' + url.replace(/^https?:\/\/(www\.)?coursera\.org\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60),
      title,
      provider,
      instructor,
      source: 'Coursera',
      url,
      domain: DOMAIN_MAP[r['Keyword']] ?? 'technology',
      subdomain: r['Keyword'] ?? null,
      skills,
      level: LEVELS[(r['Level'] ?? '').toLowerCase()] ?? 'intermediate',
      estimatedHours: Number.isFinite(hours) && hours > 0 ? Math.round(hours) : null,
      language: 'en',
      courseType: 'course',
      rating: hasRating ? Number(rating.toFixed(2)) : null,
      reviewCount: hasReviews ? reviews : null,
      moduleCount: modules.length || null,
      projectBased,
      certificateAvailable: true,
      qualityScore: Number(qualityScore.toFixed(4)),
      tier,
      // The dataset's own vintage, not today. Claiming a fresh check we did not
      // perform would be the same class of lie as inventing the rating.
      lastVerified: '2024-02-12',
    });
  }

  stats.kept = out.length;
  out.sort((a, b) => b.qualityScore - a.qualityScore);

  const byTier = out.reduce((acc, c) => ((acc[c.tier] = (acc[c.tier] ?? 0) + 1), acc), {});
  const byDomain = out.reduce((acc, c) => ((acc[c.domain] = (acc[c.domain] ?? 0) + 1), acc), {});

  writeFileSync(
    new URL('../data/catalog-extended.generated.json', import.meta.url),
    JSON.stringify({
      generatedAt: new Date().toISOString().slice(0, 10),
      note: 'Generated by scripts/ingest-catalog.mjs, do not edit by hand.',
      source: 'CourseraDataset-Clean.csv',
      rows: out,
    }),
  );

  console.log('\n  read            %d', stats.read);
  console.log('  dropped, no skill match   %d', stats.noSkill);
  console.log('  dropped, thin reviews     %d', stats.thinReviews);
  console.log('  dropped, low rating       %d', stats.lowRating);
  console.log('  dropped, duplicate        %d', stats.duplicate);
  console.log('  kept            %d', stats.kept);
  console.log('\n  tiers    %s', JSON.stringify(byTier));
  console.log('  domains  %s\n', JSON.stringify(byDomain));
}

main();
