import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractPdfText, sanitizePdfText, PdfExtractionError } from '@/lib/pdf/extract';
import { parseLinkedInText } from '@/lib/pdf/linkedin';

/**
 * End-to-end PDF test: a real PDF file goes through real PDF text extraction
 * and out the other side as a structured profile. This is the path an actual
 * LinkedIn export takes, not a simulation of it.
 */
const pdfPath = join(tmpdir(), 'skillin-pipeline-test.pdf');
execFileSync(process.execPath, ['scripts/make-test-pdf.mjs', pdfPath]);
const bytes = readFileSync(pdfPath);

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe('PDF extraction', () => {
  it('reads text out of a real multi-page PDF', async () => {
    const result = await extractPdfText(toArrayBuffer(bytes));
    expect(result.totalPages).toBe(2);
    expect(result.text).toContain('Aryan Mehta');
    expect(result.text).toContain('Acme Analytics');
  });

  it('rejects a file that is not a PDF', async () => {
    const notPdf = new TextEncoder().encode('just some text, definitely not a pdf');
    await expect(extractPdfText(toArrayBuffer(Buffer.from(notPdf)))).rejects.toMatchObject({
      reason: 'not_a_pdf',
    });
  });

  it('rejects an empty file', async () => {
    await expect(extractPdfText(new ArrayBuffer(0))).rejects.toBeInstanceOf(PdfExtractionError);
  });

  it('rejects a PDF that contains no extractable text', async () => {
    // A structurally valid PDF with an empty content stream: the image-only case.
    const blank = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
        'trailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF\n',
      'latin1');
    await expect(extractPdfText(toArrayBuffer(blank))).rejects.toMatchObject({
      reason: 'image_only',
    });
  });
});

let rawText = '';

describe('full pipeline: PDF file to structured profile', () => {
  it('produces the same profile as parsing the text directly', async () => {
    const { text } = await extractPdfText(toArrayBuffer(bytes));
    rawText = text;
    const { profile, isLinkedIn } = parseLinkedInText(sanitizePdfText(text), 'linkedin-pdf');

    expect(isLinkedIn).toBe(true);
    expect(profile.name).toBe('Aryan Mehta');
    expect(profile.email).toBe('aryan.mehta@example.com');
    expect(profile.education[0].institution).toBe('Indian Institute of Technology Bombay');
    expect(profile.experience.length).toBe(2);
    // Exactly the three real projects, no description fragments promoted to
    // titles by the wrapped-line heuristic.
    expect(profile.projects.map((p) => p.title)).toEqual([
      'Twitter Sentiment Analysis',
      'Customer Churn Prediction',
      'College FAQ Chatbot',
    ]);
    // And each keeps its own description rather than absorbing the next one.
    expect(profile.projects[1].description).toMatch(/XGBoost/);
    expect(profile.projects[1].description).toMatch(/SMOTE/);
    expect(profile.projects[2].description).toMatch(/Flask/);

    const declared = profile.declaredSkills.map((s) => s.skillId);
    expect(declared).toContain('python');
    expect(declared).toContain('machine-learning');
  });

  it('does not leak the identity block into achievements', () => {
    // LinkedIn prints the name, headline and location after the sidebar, so
    // they land inside whichever sidebar section was last open, usually
    // Honors-Awards. The learner's own name is not an award.
    const { profile } = parseLinkedInText(sanitizePdfText(rawText), 'linkedin-pdf');
    const titles = profile.achievements.map((a) => a.title);
    expect(titles).not.toContain('Aryan Mehta');
    expect(titles).not.toContain('Mumbai, Maharashtra, India');
    expect(titles.some((t) => t.includes('Data Science undergraduate'))).toBe(false);
    expect(titles).toEqual(
      expect.arrayContaining([expect.stringContaining('Hackathon')]));
    expect(profile.achievements.length).toBe(2);
  });

  it('does not leak the identity block into certifications or skills', () => {
    const { profile } = parseLinkedInText(sanitizePdfText(rawText), 'linkedin-pdf');
    expect(profile.certificates.map((c) => c.title)).not.toContain('Aryan Mehta');
    expect(profile.declaredSkills.map((s) => s.rawName)).not.toContain('Aryan Mehta');
  });
});
