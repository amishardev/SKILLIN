'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The one way forward, on every onboarding step.
 *
 * It docks to the bottom of the viewport rather than sitting at the end of the
 * content. The career list is fifteen screens of cards, and a CTA that lives
 * after the last one is a CTA you have to go looking for: you have chosen, the
 * next move should be under your thumb, not at the bottom of the document.
 *
 * It appears only once the step's requirement is met, so it never reads as a
 * disabled button daring you to press it.
 */
export default function OnboardingContinue({
  label,
  visible = true,
  onClick,
  hint,
}: {
  label: string;
  /** The step's requirement is met. Hidden entirely when false. */
  visible?: boolean;
  onClick: () => void | Promise<void>;
  /** A short line above the button, for context such as the current choice. */
  hint?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  async function handle() {
    // A second click while the first is still writing would create a duplicate
    // profile or plan, so the button closes behind the first one.
    if (busy) return;
    setBusy(true);
    try {
      await onClick();
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="onb-cta"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="onb-cta-inner">
        {hint ? <span className="meta onb-cta-hint">{hint}</span> : null}
        <button
          type="button"
          className="btn btn-accent btn-block-mobile"
          onClick={() => void handle()}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Working' : label}
        </button>
      </div>
    </motion.div>
  );
}
