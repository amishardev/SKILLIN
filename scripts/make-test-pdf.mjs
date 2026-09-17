/**
 * Builds a minimal, valid PDF containing the LinkedIn fixture text.
 *
 * Used to exercise the real extraction pipeline (unpdf -> parser) rather than
 * only the text parser. Writes to the path given as argv[2].
 *
 * Run: node scripts/make-test-pdf.mjs out.pdf
 */

import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'linkedin-test.pdf';

/**
 * Read the fixture straight out of the TypeScript test file, so the PDF and the
 * text-parser tests are driven by one source of truth rather than a copy that
 * can drift.
 */
function loadFixture() {
  const src = readFileSync(new URL('../tests/fixtures/linkedin-export.ts', import.meta.url), 'utf8');
  const match = src.match(/export const LINKEDIN_EXPORT_TEXT = `([\s\S]*?)`;/);
  if (!match) throw new Error('LINKEDIN_EXPORT_TEXT not found in the fixture file');
  return match[1];
}

const LINKEDIN_EXPORT_TEXT = loadFixture();

const LINES_PER_PAGE = 46;
const FONT_SIZE = 10;
const LEADING = 14;
const MARGIN_X = 50;
const PAGE_H = 792;
const PAGE_W = 612;

/** Escape the characters that terminate a PDF string literal. */
function esc(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

const allLines = LINKEDIN_EXPORT_TEXT.split('\n');
const pages = [];
for (let i = 0; i < allLines.length; i += LINES_PER_PAGE) {
  pages.push(allLines.slice(i, i + LINES_PER_PAGE));
}

// Build each page's content stream.
const contents = pages.map((lines) => {
  const body = lines
    .map((line, i) => {
      const y = PAGE_H - 60 - i * LEADING;
      // Non-ASCII would need a font-specific encoding; the fixture is ASCII.
      const safe = esc(line).replace(/[^\x20-\x7E]/g, '');
      return `BT /F1 ${FONT_SIZE} Tf ${MARGIN_X} ${y} Td (${safe}) Tj ET`;
    })
    .join('\n');
  return body;
});

// ── Assemble objects ──
const objects = [];
const pageCount = pages.length;

// 1: Catalog, 2: Pages, 3: Font, then per page: Page object + Content stream.
const firstPageObj = 4;
const pageObjIds = pages.map((_, i) => firstPageObj + i * 2);
const contentObjIds = pages.map((_, i) => firstPageObj + i * 2 + 1);

objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

pages.forEach((_, i) => {
  objects[pageObjIds[i]] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
    `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjIds[i]} 0 R >>`;
  const stream = contents[i];
  objects[contentObjIds[i]] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
});

// ── Serialise with a correct xref table ──
let pdf = '%PDF-1.4\n';
const offsets = [];

for (let id = 1; id < objects.length; id++) {
  if (!objects[id]) continue;
  offsets[id] = Buffer.byteLength(pdf, 'latin1');
  pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
}

const xrefStart = Buffer.byteLength(pdf, 'latin1');
const maxId = objects.length;
pdf += `xref\n0 ${maxId}\n0000000000 65535 f \n`;
for (let id = 1; id < maxId; id++) {
  const offset = offsets[id] ?? 0;
  pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${maxId} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

writeFileSync(out, Buffer.from(pdf, 'latin1'));
console.log(`wrote ${out}, ${pageCount} pages, ${Buffer.byteLength(pdf, 'latin1')} bytes`);
