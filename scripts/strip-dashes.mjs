/**
 * Removes every em dash (U+2014) and en dash (U+2013) from the codebase.
 *
 *   node scripts/strip-dashes.mjs          rewrite
 *   node scripts/strip-dashes.mjs --check  exit non-zero if any remain
 *
 * Context-aware, because the right replacement depends on what the dash was
 * doing:
 *
 *   numeric range       2021<en>2025    ->  2021-2025
 *   metadata separator  Title <em> Sub  ->  Title . Sub  (middle dot)
 *   prose aside         it works <em> and  ->  it works, and
 *
 * Deliberately conservative: it makes only these substitutions and does no
 * general "tidy up" afterwards. An earlier version normalised spacing around
 * commas and brackets as a finishing pass, which silently rewrote real code
 * (`[first, ...rest]` lost its comma) and regex character classes. Formatting
 * is not this script's job.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.css', '.md', '.json']);
// `dataset` holds raw third-party source files. They are inputs to the ingest
// script, not product content, so their punctuation is not ours to rewrite.
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'tasks', 'dist', 'build', 'dataset']);

const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);
const MIDDLE_DOT = String.fromCharCode(0x00b7);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTENSIONS.has(extname(entry))) out.push(path);
  }
  return out;
}

function strip(text) {
  let out = text;

  // ── En dash: almost always a range ──
  out = out.replace(new RegExp(`(\\d)\\s*${EN}\\s*(\\d)`, 'g'), '$1-$2');
  out = out.replace(new RegExp(`([A-Za-z])${EN}([A-Za-z])`, 'g'), '$1-$2');
  out = out.replace(new RegExp(`\\s*${EN}\\s*`, 'g'), ', ');
  out = out.split(EN).join('-');

  // ── Em dash ──
  // Inside a short quoted string, a spaced dash separates two labels rather
  // than joining a clause, so a middle dot reads better than a comma.
  out = out.replace(
    new RegExp(`(['"\`])([^'"\`\\n]{2,60}?) ${EM} ([A-Z][^'"\`\\n]{2,60}?)(['"\`])`, 'g'),
    `$1$2 ${MIDDLE_DOT} $3$4`,
  );
  // A spaced dash in prose introduces a trailing clause: a comma is the fit.
  out = out.replace(new RegExp(` ${EM} `, 'g'), ', ');
  // A dash opening a line is a list marker.
  out = out.replace(new RegExp(`^(\\s*)${EM}\\s`, 'gm'), '$1- ');
  // Anything still standing.
  out = out.replace(new RegExp(`\\s*${EM}\\s*`, 'g'), ', ');
  out = out.split(EM).join('-');

  return out;
}

function countDashes(text) {
  let n = 0;
  for (const ch of text) {
    if (ch === EM || ch === EN) n++;
  }
  return n;
}

const checkOnly = process.argv.includes('--check');
const files = walk('.');
let changed = 0;
let remaining = 0;
const offenders = [];

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const count = countDashes(before);
  if (count === 0) continue;

  if (checkOnly) {
    remaining += count;
    offenders.push(`${file} (${count})`);
    continue;
  }

  const after = strip(before);
  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    changed++;
  }
}

if (checkOnly) {
  if (remaining > 0) {
    console.error(`\n  ${remaining} dash character(s) remain:`);
    for (const f of offenders) console.error(`    ${f}`);
    process.exit(1);
  }
  console.log(`\n  No em or en dashes in ${files.length} files.\n`);
} else {
  console.log(`\n  rewrote ${changed} of ${files.length} file(s)\n`);
}
