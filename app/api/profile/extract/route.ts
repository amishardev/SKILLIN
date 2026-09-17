import { NextResponse, type NextRequest } from 'next/server';
import {
  extractProfileFromPdf,
  extractProfileFromText,
  PdfExtractionError,
} from '@/lib/profile/extract';
import { MAX_PDF_BYTES } from '@/lib/pdf/extract';
import { sanitizePdfText } from '@/lib/pdf/extract';

/** PDF parsing needs Node APIs and can exceed the default edge time budget. */
export const runtime = 'nodejs';
export const maxDuration = 60;

/** User-facing copy for each failure mode. Never a blank screen. */
const FAILURE_COPY: Record<string, string> = {
  too_large: 'That PDF is over 10 MB. Try re-exporting it from LinkedIn.',
  not_a_pdf: "That file isn't a PDF. Use LinkedIn → Profile → Resources → Save to PDF.",
  encrypted: 'That PDF is password protected, so we cannot read it.',
  image_only:
    "We couldn't find any text in that PDF, it looks like a scan. Re-export it from LinkedIn, or paste your profile text instead.",
  too_many_pages: 'That PDF has more pages than a LinkedIn profile export usually does.',
  unreadable: "We couldn't read this PDF.",
};

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  try {
    // ── Pasted text fallback ──
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { text?: unknown };
      const text = typeof body.text === 'string' ? sanitizePdfText(body.text) : '';

      if (text.length < 40) {
        return NextResponse.json(
          { error: 'Paste a bit more of your profile so we have something to read.' },
          { status: 400 });
      }

      const result = await extractProfileFromText(text.slice(0, 60000), 'manual');
      return NextResponse.json(result);
    }

    // ── PDF upload ──
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Send a PDF file or profile text.' }, { status: 415 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: FAILURE_COPY.too_large }, { status: 413 });
    }

    const source = kind === 'resume' ? ('resume-pdf' as const) : ('linkedin-pdf' as const);
    const result = await extractProfileFromPdf(await file.arrayBuffer(), source);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PdfExtractionError) {
      return NextResponse.json(
        { error: FAILURE_COPY[err.reason] ?? err.message, reason: err.reason },
        { status: 422 });
    }
    console.error('[profile/extract]', err);
    return NextResponse.json(
      { error: "We couldn't analyze your profile right now. Please try again." },
      { status: 500 });
  }
}
