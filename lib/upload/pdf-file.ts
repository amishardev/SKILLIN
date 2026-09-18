/**
 * One definition of an acceptable PDF upload, shared by the picker in the
 * browser and the route that parses what it produces.
 *
 * Keeping the limit and the accept string in one place is not tidiness. The
 * copy under the dropzone, the check before the request leaves the device and
 * the check on the server all quoted their own number before, which is how a
 * file gets accepted by the page and then rejected by the route.
 */

export const MAX_UPLOAD_MB = 20;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * What the file input offers the operating system picker.
 *
 * Both forms are needed. Android Chrome and iOS Safari filter the document
 * picker strictly on this value, and plenty of providers hand over a PDF with
 * an empty or vendor specific MIME type, so the extension has to be listed
 * alongside the type.
 *
 * This replaced the single malformed value "application/pdf.pdf", which is one
 * MIME type that nothing on earth reports. Desktop pickers let you switch to
 * All Files and so hid the fault; on a phone there is no such escape and every
 * document appeared greyed out, which is exactly what was reported.
 *
 * Note the absence of `capture`. Setting it would send the user to the camera
 * instead of their files.
 */
export const PDF_ACCEPT = '.pdf,application/pdf';

export type PdfRejection = 'not-pdf' | 'too-large' | 'empty';

/** What the user is told. Never a raw browser or parser message. */
export const REJECTION_COPY: Record<PdfRejection, string> = {
  'not-pdf': 'Please upload a PDF file.',
  'too-large': `File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`,
  empty: 'That file is empty. Please choose another one.',
};

/**
 * Whether a chosen file is one we can try to read, or null when it is fine.
 *
 * The name is checked alongside the MIME type rather than instead of it. The
 * iOS Files app and Android content providers both deliver perfectly good PDFs
 * with an empty `type` often enough that trusting the type alone turns valid
 * files away. The server still checks the %PDF signature, so a file that lies
 * about its extension is caught there rather than waved through.
 */
export function validatePdfFile(file: File): PdfRejection | null {
  const looksLikePdf =
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!looksLikePdf) return 'not-pdf';
  if (file.size === 0) return 'empty';
  if (file.size > MAX_UPLOAD_BYTES) return 'too-large';
  return null;
}

/** "2.4 MB", for the line shown under a chosen file. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
