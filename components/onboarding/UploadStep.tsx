'use client';

import { useRef, useState, type DragEvent } from 'react';
import { motion } from 'framer-motion';
import SkillInMotionLogo from '@/components/brand/MotionLogo';
import { FileText, Upload, Clipboard } from 'lucide-react';
import { ErrorNote } from '@/components/ui/primitives';
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

const MAX_MB = 10;

/**
 * The first real product action: upload the LinkedIn profile PDF.
 *
 * The LinkedIn export is the primary path and is visually dominant. A generic
 * résumé and pasted text are offered as fallbacks, deliberately quieter.
 */
export default function UploadStep({ onExtracted, onBusyChange }: Props) {
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [pasted, setPasted] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't read that. Please try again.");
        return;
      }
      onExtracted(data.profile as StudentProfile, data.meta as ExtractionMeta);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  async function handleFile(file: File | undefined, kind: 'linkedin' | 'resume') {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    await send(form);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0], 'linkedin');
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
          <motion.label
            htmlFor="linkedin-pdf"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            animate={{ scale: dragging ? 1.01 : 1 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              padding: '52px 28px',
              borderRadius: 'var(--r-lg)',
              border: `2px dashed ${dragging ? 'var(--ink)' : 'var(--line-strong)'}`,
              background: dragging ? 'var(--card)' : 'var(--card-alt)',
              cursor: busy ? 'progress' : 'pointer',
              textAlign: 'center',
            }}
          >
            {busy ? (
              /* Reading a PDF and running it through extraction takes seconds,
                 which is exactly the kind of wait the motion logo is for. */
              <SkillInMotionLogo variant="loader" message="Reading your profile" />
            ) : (
              <>
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
                  <span className="title-sm">Drop your LinkedIn PDF here</span>
                  <span className="meta">PDF · up to {MAX_MB} MB</span>
                </span>
              </>
            )}
            <input
              ref={inputRef}
              id="linkedin-pdf"
              type="file"
              accept="application/pdf.pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => void handleFile(e.target.files?.[0], 'linkedin')}
            />
          </motion.label>

          <div className="wrap">
            <button
              type="button"
              className="btn btn-dark"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={16} aria-hidden="true" />
              Choose PDF
            </button>
          </div>

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
          <button
            type="button"
            className="btn btn-quiet"
            style={{ padding: '6px 12px' }}
            onClick={() => {
              const el = document.createElement('input');
              el.type = 'file';
              el.accept = 'application/pdf.pdf';
              el.onchange = () => void handleFile(el.files?.[0], 'resume');
              el.click();
            }}
          >
            Upload a résumé PDF
          </button>
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
