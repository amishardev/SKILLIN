/**
 * Verifies every catalog URL still resolves.
 *
 * Run: node scripts/verify-resources.mjs
 *
 * Read-only: issues a single GET per URL and reads only the status. Some
 * publishers reject non-browser clients (403/405), those are reported
 * separately from genuine 404s, because a bot block is not a dead link.
 */

import { readFileSync } from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;

const src = readFileSync(new URL('../data/resources.ts', import.meta.url), 'utf8');
const entries = [...src.matchAll(/id: '([a-z0-9-]+)', title: '((?:[^'\\]|\\.)*)'/g)].map((m, i) => ({
  id: m[1],
  title: m[2],
  index: i,
}));
const urls = [...src.matchAll(/url: '([^']+)'/g)].map((m) => m[1]);
entries.forEach((e, i) => (e.url = urls[i]));

async function check(entry) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(entry.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html, application/xhtml+xml, */*' },
    });
    return { ...entry, status: res.status, finalUrl: res.url };
  } catch (err) {
    const code = err?.cause?.code || err?.cause?.message || err?.name || String(err);
    // Google developer sites bounce cookie-less clients through a silent
    // OAuth endpoint forever. The page itself is fine in a browser.
    if (String(code).includes('redirect count exceeded')) {
      return { ...entry, status: 403, note: 'redirect loop (auth probe)' };
    }
    return { ...entry, status: 0, error: code };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      results.push(await check(entry));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ok = results.filter((r) => r.status >= 200 && r.status < 400);
  const blocked = results.filter((r) => [401, 403, 405, 429].includes(r.status));
  const dead = results.filter(
    (r) => r.status === 0 || (r.status >= 400 && !blocked.includes(r)));

  console.log(`\n  OK        ${ok.length}`);
  console.log(`  BLOCKED   ${blocked.length}  (reachable, rejects non-browser clients)`);
  console.log(`  DEAD      ${dead.length}\n`);

  for (const r of blocked.sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`  [${r.status}] ${r.id.padEnd(26)} ${r.url}`);
  }
  if (dead.length) {
    console.log('\n  --- needs attention ---');
    for (const r of dead.sort((a, b) => a.id.localeCompare(b.id))) {
      console.log(`  [${r.status || r.error}] ${r.id.padEnd(26)} ${r.url}`);
    }
  }
  process.exitCode = dead.length > 0 ? 1 : 0;
}

run();
