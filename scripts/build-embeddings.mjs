/**
 * Builds dense skill embeddings from the catalog, offline.
 *
 *   node scripts/build-embeddings.mjs
 *
 * Method, classical distributional semantics, the same family as LSA/GloVe:
 *
 *   1. Count how often every pair of skills co-occurs in the same resource
 *      across the whole catalog (curated + imported: ~2,400 courses).
 *   2. Convert counts to PPMI (positive pointwise mutual information), which
 *      cancels out the fact that "python" appears everywhere and "qiskit"
 *      barely at all.
 *   3. Factorise the symmetric PPMI matrix with a Jacobi eigendecomposition and
 *      keep the top K components.
 *   4. L2-normalise each skill's vector.
 *
 * The result: skills that keep company end up close in the space, even though
 * nothing ever told the system they were related. "transformers" lands near
 * "llm", "penetration-testing" near "network-security". That adjacency is what
 * lets the recommender surface a genuinely relevant resource whose skill tags
 * do not literally match the learner's gap.
 *
 * Deterministic and dependency-free: same catalog in, same vectors out. No API
 * key, no network call, no model download.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const DIMS = 32;
const JACOBI_SWEEPS = 60;
const JACOBI_TOLERANCE = 1e-9;

// ── Load the skill taxonomy ────────────────────────────────────────────────
const skillsSrc = readFileSync(new URL('../data/skills.ts', import.meta.url), 'utf8');
const SKILL_IDS = [...skillsSrc.matchAll(/\{ id: '([a-z0-9-]+)', name: '/g)].map((m) => m[1]);
if (SKILL_IDS.length < 100) {
  throw new Error(`Only parsed ${SKILL_IDS.length} skills, data/skills.ts shape changed.`);
}
const INDEX = new Map(SKILL_IDS.map((id, i) => [id, i]));
const N = SKILL_IDS.length;

// ── Collect every resource's skill set ─────────────────────────────────────
/** @type {string[][]} */
const documents = [];

// Curated tier.
const curatedSrc = readFileSync(new URL('../data/resources.ts', import.meta.url), 'utf8');
for (const match of curatedSrc.matchAll(/\n    skills: \[([^\]]*)\]/g)) {
  const ids = [...match[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).filter((id) => INDEX.has(id));
  if (ids.length > 0) documents.push(ids);
}

// Imported dataset, when it has been generated.
try {
  const generated = JSON.parse(
    readFileSync(new URL('../data/catalog.generated.json', import.meta.url), 'utf8'));
  for (const row of generated.rows) {
    const ids = row.s.filter((id) => INDEX.has(id));
    if (ids.length > 0) documents.push(ids);
  }
} catch {
  console.warn('  note: data/catalog.generated.json not found, using the curated tier only.');
}

// Career goals are strong co-occurrence signals too: the skills a role demands
// genuinely belong together, which helps sparse corners of the taxonomy.
const careersSrc = readFileSync(new URL('../data/careers.ts', import.meta.url), 'utf8');
for (const block of careersSrc.split(/\n  \{\n    id: '/).slice(1)) {
  const ids = [...block.matchAll(/(?:req|pref)\('([a-z0-9-]+)'/g)]
    .map((m) => m[1])
    .filter((id) => INDEX.has(id));
  if (ids.length > 1) documents.push(ids);
}

// Project templates, same reasoning.
try {
  const projectsSrc = readFileSync(new URL('../data/projects.ts', import.meta.url), 'utf8');
  for (const match of projectsSrc.matchAll(/\n    skills: \[([^\]]*)\]/g)) {
    const ids = [...match[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).filter((id) => INDEX.has(id));
    if (ids.length > 1) documents.push(ids);
  }
} catch {
  /* projects are optional */
}

// ── 1. Co-occurrence ───────────────────────────────────────────────────────
const cooc = Array.from({ length: N }, () => new Float64Array(N));
const marginal = new Float64Array(N);
let pairTotal = 0;

for (const doc of documents) {
  const unique = [...new Set(doc)];
  for (const a of unique) marginal[INDEX.get(a)] += 1;
  // A long course tagged with 12 skills is weaker evidence per pair than a
  // focused one tagged with 3, so pairs are down-weighted by document size.
  const weight = 1 / Math.max(1, unique.length - 1);
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = INDEX.get(unique[i]);
      const b = INDEX.get(unique[j]);
      cooc[a][b] += weight;
      cooc[b][a] += weight;
      pairTotal += 2 * weight;
    }
  }
}

// ── 2. PPMI ────────────────────────────────────────────────────────────────
const rowSum = new Float64Array(N);
for (let i = 0; i < N; i++) {
  let sum = 0;
  for (let j = 0; j < N; j++) sum += cooc[i][j];
  rowSum[i] = sum;
}

const ppmi = Array.from({ length: N }, () => new Float64Array(N));
for (let i = 0; i < N; i++) {
  for (let j = 0; j < N; j++) {
    if (cooc[i][j] <= 0 || rowSum[i] <= 0 || rowSum[j] <= 0) continue;
    const pmi = Math.log((cooc[i][j] * pairTotal) / (rowSum[i] * rowSum[j]));
    ppmi[i][j] = pmi > 0 ? pmi : 0;
  }
  // A skill is maximally associated with itself; this anchors isolated skills
  // so they still get a usable (if lonely) vector instead of all zeros.
  ppmi[i][i] = Math.max(ppmi[i][i], marginal[i] > 0 ? 1 : 0);
}

// ── 3. Symmetric eigendecomposition (cyclic Jacobi) ────────────────────────
/**
 * Jacobi rotates away off-diagonal mass until the matrix is diagonal. It is
 * slower than Lanczos but exact, trivially correct, and 115x115 finishes in
 * milliseconds, the right trade for a build step.
 */
function jacobiEigen(matrix, size) {
  const a = matrix.map((row) => Float64Array.from(row));
  const v = Array.from({ length: size }, (_, i) => {
    const row = new Float64Array(size);
    row[i] = 1;
    return row;
  });

  for (let sweep = 0; sweep < JACOBI_SWEEPS; sweep++) {
    let off = 0;
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) off += a[i][j] * a[i][j];
    }
    if (Math.sqrt(2 * off) < JACOBI_TOLERANCE) break;

    for (let p = 0; p < size - 1; p++) {
      for (let q = p + 1; q < size; q++) {
        if (Math.abs(a[p][q]) < 1e-14) continue;

        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        for (let k = 0; k < size; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < size; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < size; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }

  const values = Array.from({ length: size }, (_, i) => ({ value: a[i][i], index: i }));
  values.sort((x, y) => y.value - x.value);
  return { values, vectors: v };
}

const { values, vectors } = jacobiEigen(ppmi, N);
const top = values.slice(0, DIMS).filter((e) => e.value > 1e-9);

// ── 4. Embedding = eigenvector scaled by sqrt(eigenvalue), then normalised ──
const embeddings = [];
for (let i = 0; i < N; i++) {
  const vec = new Float64Array(DIMS);
  for (let d = 0; d < top.length; d++) {
    vec[d] = vectors[i][top[d].index] * Math.sqrt(top[d].value);
  }
  let norm = 0;
  for (let d = 0; d < DIMS; d++) norm += vec[d] * vec[d];
  norm = Math.sqrt(norm);
  // A skill that appears in nothing has no direction; leave it at zero and let
  // callers treat it as "no signal" rather than inventing one.
  embeddings.push(norm > 1e-9 ? Array.from(vec, (x) => x / norm) : Array.from(vec, () => 0));
}

// Quantise to 4 decimals, the vectors are unit length, so this is lossless at
// the precision cosine similarity actually needs, and halves the file size.
const quantised = embeddings.map((vec) => vec.map((x) => Math.round(x * 1e4) / 1e4));

const target = new URL('../data/embeddings.generated.json', import.meta.url);
writeFileSync(
  target,
  JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Generated by scripts/build-embeddings.mjs, do not edit by hand.',
    method: 'skill co-occurrence → PPMI → Jacobi eigendecomposition',
    dims: DIMS,
    documents: documents.length,
    skills: SKILL_IDS,
    vectors: quantised,
  }));

// ── Report: show nearest neighbours so the output can be sanity-checked ────
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < DIMS; i++) dot += a[i] * b[i];
  return dot;
}

function neighbours(id, k = 4) {
  const i = INDEX.get(id);
  if (i === undefined) return [];
  return SKILL_IDS.map((other, j) => ({ other, score: cosine(embeddings[i], embeddings[j]) }))
    .filter((x) => x.other !== id)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => `${x.other} ${x.score.toFixed(2)}`);
}

const dead = embeddings.filter((v) => v.every((x) => x === 0)).length;
console.log(`
  documents        ${documents.length}
  skills           ${N}
  dimensions       ${top.length} / ${DIMS}
  zero vectors     ${dead}
  file             data/embeddings.generated.json (${(readFileSync(target, 'utf8').length / 1024).toFixed(0)} KB)

  nearest neighbours (sanity check)
  ─────────────────────────────────
${['transformers', 'penetration-testing', 'react', 'pandas', 'kubernetes', 'ui-design']
  .map((id) => `  ${id.padEnd(20)} → ${neighbours(id).join(', ')}`)
  .join('\n')}
`);
