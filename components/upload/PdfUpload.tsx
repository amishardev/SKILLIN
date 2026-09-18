'use client';

import { useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import {
  PDF_ACCEPT,
  REJECTION_COPY,
  formatFileSize,
  validatePdfFile,
} from '@/lib/upload/pdf-file';

interface Props {
  /** Which upload this is. Only affects copy and the input id. */
  kind: 'linkedin' | 'resume';
  /** A large dashed target, or a plain button in a row of them. */
  variant?: 'dropzone' | 'button';
  /** True while the parent is uploading and parsing the chosen file. */
  busy?: boolean;
  /** Fires only for a file that passed validation. */
  onFileSelected: (file: File) => void;
  /** Fires with copy fit to show the user, never a raw error. */
  onError: (message: string) => void;
  /** What the dropzone shows while the parent is working. */
  busyNode?: ReactNode;
  /** Idle contents of the dropzone. */
  children?: ReactNode;
  /** Label on the button that opens the picker. */
  buttonLabel?: ReactNode;
}

/**
 * The one way a PDF gets into SkillIn.
 *
 * Both the LinkedIn export and the plain résumé go through this, because the
 * two used to be picked in different ways and only one of them worked on a
 * phone. The résumé button built an input with document.createElement, never
 * attached it, and called click() on it. A detached input opens no picker in
 * iOS Safari, so that route was dead on iPhone regardless of anything else.
 *
 * Three details here are load bearing on mobile:
 *
 *  - The input carries a real accept list and no `capture`, so the OS opens
 *    Files, Drive, Downloads and iCloud rather than the camera.
 *  - It stays in the document, hidden with the clip technique rather than
 *    display:none, which some mobile browsers treat as not interactable.
 *  - The picker opens inside the tap itself. iOS Safari discards the user
 *    gesture across an await, so nothing asynchronous may come first.
 */
export default function PdfUpload({
  kind,
  variant = 'dropzone',
  busy = false,
  onFileSelected,
  onError,
  busyNode,
  children,
  buttonLabel,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<{ name: string; size: number } | null>(null);

  function accept(file: File | undefined) {
    if (!file) return; // The user cancelled the picker. Not an error.

    const rejection = validatePdfFile(file);
    if (rejection) {
      setChosen(null);
      onError(REJECTION_COPY[rejection]);
      return;
    }

    setChosen({ name: file.name, size: file.size });
    onFileSelected(file);
  }

  /*
   * Clearing the value is what lets someone pick the same file again after a
   * failure. Without it the input holds the old selection, the value never
   * changes, and the second tap fires no event at all, which reads as the
   * button being dead.
   */
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    accept(file);
  }

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      name={`${kind}-pdf`}
      accept={PDF_ACCEPT}
      className="sr-only"
      /*
       * Disabled only while a file is actually being processed. Anything
       * broader, such as waiting on auth, leaves a picker that never opens and
       * no way for the user to tell why.
       */
      disabled={busy}
      onChange={onChange}
    />
  );

  const openPicker = () => inputRef.current?.click();

  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          className="btn btn-quiet"
          style={{ padding: '6px 12px', minHeight: 44 }}
          disabled={busy}
          onClick={openPicker}
        >
          {buttonLabel}
        </button>
        {input}
      </>
    );
  }

  return (
    <>
      {/*
        A label bound to the input, so the whole area opens the picker natively
        with no JavaScript involved. On mobile that is the most reliable trigger
        there is. The separate button below calls click() on the ref, which is
        what the spec asks for and what keyboard users get.
      */}
      <label
        htmlFor={inputId}
        onDragOver={(e: DragEvent<HTMLLabelElement>) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent<HTMLLabelElement>) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
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
          // Drag and drop is a desktop nicety. Touch must never depend on it,
          // and this keeps the browser from treating a scroll as a drag.
          touchAction: 'manipulation',
        }}
      >
        {busy ? busyNode : children}
      </label>

      {input}

      <div className="wrap" style={{ alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="btn btn-dark"
          style={{ minHeight: 44 }}
          disabled={busy}
          onClick={openPicker}
        >
          {buttonLabel}
        </button>

        {chosen ? (
          <span className="meta" aria-live="polite">
            {chosen.name} · {formatFileSize(chosen.size)}
            {busy ? ' · Reading...' : null}
          </span>
        ) : null}
      </div>

    </>
  );
}
