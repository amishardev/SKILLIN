'use client';

import { useState } from 'react';
import SkillInMotionLogo from '@/components/brand/MotionLogo';
import { FileText, Upload, Clipboard } from 'lucide-react';
import { ErrorNote } from '@/components/ui/primitives';
import PdfUpload from '@/components/upload/PdfUpload';
import { MAX_UPLOAD_MB } from '@/lib/upload/pdf-file';
import type { StudentProfile } from '@/types';

export interface ExtractionMeta {
  totalPages: number;
  isLinkedIn: boolean;
  sectionsFound: string[];
  aiAssisted: boolean;
  aiFallback: boolean;
  characters: number;
}

interface Props {
  onExtracted: (profile: StudentProfile, meta: ExtractionMeta) => void;
  onBusyChange: (busy: boolean) => void;
}

/**
 * The first real product action: upload the LinkedIn profile PDF.
 *
 * The LinkedIn export is the primary path and is visually dominant. A generic
 * résumé and pasted text are offered as fallbacks, deliberately quieter.
 */
export default function UploadStep({ onExtracted, onBusyChange }: Props) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [pasted, setPasted] = useState('');

  function setWorking(value: boolean) {
    setBusy(value);
    onBusyChange(value);
  }

  async function send(body: FormData | string) {
    setError('');
    setWorking(true);
    try {
      const res = await fetch('/api/profile/extract', {
        method: 'POST', ...(typeof body === 'string'
          ? { headers: { 'Content-Type': 'application/json' }, body }
          : { body }),
      });

      /*
       * A rejection by the host rather than the route arrives as HTML or as
       * nothing at all, and parsing it as JSON throws. That used to surface as
       * "we couldn't reach the server", which is wrong and unactionable: the
       * server was reached and it refused the body.
       */
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error ??
            (res.status === 413
              ? 'Upload failed, that file is too large to send. Try a smaller PDF.'
              : 'Upload failed. Please try again.'));
        return;
      }
      if (!data?.profile) {
        setError('Upload failed. Please try again.');
        return;
      }
      onExtracted(data.profile as StudentProfile, data.meta as ExtractionMeta);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  /** The file has already been validated by the picker that produced it. */
  async function handleFile(file: File, kind: 'linkedin' | 'resume') {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    await send(form);
  }

  return (
    <div className="stack-lg" style={{ width: '100%', maxWidth: 620 }}>
      <div className="stack-sm">
        <h1 className="title-xl">Start with your LinkedIn profile.</h1>
        <p className="lede">
          Upload your LinkedIn Profile PDF and we&apos;ll understand what you&apos;ve already
          studied, built and experienced.
        </p>
      </div>

      {mode === 'upload' ? (
        <>
          <PdfUpload
            kind="linkedin"
            busy={busy}
            onFileSelected={(file) => void handleFile(file, 'linkedin')}
            onError={setError}
            buttonLabel={
              <>
                <Upload size={16} aria-hidden="true" />
                Choose PDF
              </>
            }
            busyNode={
              /* Reading a PDF and running it through extraction takes seconds,
                 which is exactly the kind of wait the motion logo is for. */
              <SkillInMotionLogo variant="loader" message="Reading your profile" />
            }
          >
            <span
              aria-hidden="true"
              style={{
                display: 'grid', placeItems: 'center', width: 54, height: 54,
                borderRadius: 16, background: '#0A66C218', color: '#0A66C2',
              }}
            >
              <FileText size={24} strokeWidth={1.8} />
            </span>
            <span className="stack-sm">
              <span className="title-sm">Choose your LinkedIn PDF</span>
              <span className="meta">PDF · up to {MAX_UPLOAD_MB} MB</span>
            </span>
          </PdfUpload>

          <details className="card" style={{ padding: '16px 20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem' }}>
              How do I get my LinkedIn PDF?
            </summary>
            <ol className="body" style={{ margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.9 }}>
              <li>Open your LinkedIn profile</li>
              <li>
                Click <strong>More</strong> (or <strong>Resources</strong>)
              </li>
              <li>
                Choose <strong>Save to PDF</strong>
              </li>
              <li>Upload the file here</li>
            </ol>
          </details>
        </>
      ) : (
        <div className="stack-md">
          <label className="label" htmlFor="pasted-profile">
            Paste your profile text
          </label>
          <textarea
            id="pasted-profile"
            className="field"
            rows={12}
            value={pasted}
            disabled={busy}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={'Paste the text of your LinkedIn profile or résumé here, education, experience, projects, skills.'}
            style={{ resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' }}
          />
          <div className="wrap">
            <button
              type="button"
              className="btn btn-dark"
              disabled={busy || pasted.trim().length < 40}
              onClick={() => void send(JSON.stringify({ text: pasted }))}
            >
              Read my profile
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setMode('upload')}>
              Back to upload
            </button>
          </div>
        </div>
      )}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {mode === 'upload' ? (
        <div
          className="wrap"
          style={{ borderTop: '1px solid var(--line)', paddingTop: 18, alignItems: 'center' }}
        >
          <span className="meta">No LinkedIn PDF?</span>
          <PdfUpload
            kind="resume"
            variant="button"
            busy={busy}
            onFileSelected={(file) => void handleFile(file, 'resume')}
            onError={setError}
            buttonLabel="Upload a résumé PDF"
          />
          <button
            type="button"
            className="btn btn-quiet"
            style={{ padding: '6px 12px' }}
            onClick={() => setMode('paste')}
          >
            <Clipboard size={14} aria-hidden="true" />
            Paste text instead
          </button>
        </div>
      ) : null}
    </div>
  );
}
