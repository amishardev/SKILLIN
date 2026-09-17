'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * The immersive analysis screen.
 *
 * The steps are cosmetic pacing over work that has *already completed*, we
 * never claim to be doing something we are not. `onDone` fires when the
 * animation finishes, and the caller has the real result in hand before this
 * component is ever mounted.
 */
export default function AnalysisStep({
  steps,
  headline,
  doneLabel,
  onDone,
}: {
  steps: string[];
  headline: string;
  doneLabel: string;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(0);

  // With reduced motion the list is simply shown complete, so no state update
  // is needed to get there.
  const completed = reduceMotion ? steps.length : revealed;

  useEffect(() => {
    if (reduceMotion) {
      const timer = setTimeout(onDone, 300);
      return () => clearTimeout(timer);
    }

    // Slightly uneven pacing reads as work rather than a progress bar on a timer.
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    steps.forEach((_, index) => {
      elapsed += 340 + (index % 3) * 120;
      timers.push(setTimeout(() => setRevealed(index + 1), elapsed));
    });
    timers.push(setTimeout(onDone, elapsed + 900));
    return () => timers.forEach(clearTimeout);
  }, [steps, onDone, reduceMotion]);

  const finished = completed >= steps.length;

  return (
    <div
      className="stack-lg"
      style={{ width: '100%', maxWidth: 520 }}
      role="status"
      aria-live="polite"
    >
      <h1 className="title-lg">{finished ? doneLabel : headline}</h1>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 2 }}>
        {steps.map((step, index) => {
          const isDone = index < completed;
          const isCurrent = index === completed;
          return (
            <li
              key={step}
              className="row"
              style={{
                padding: '12px 4px',
                opacity: isDone ? 1 : isCurrent ? 0.85 : 0.35,
                transition: 'opacity .3s var(--ease)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'grid', placeItems: 'center',
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? 'var(--accent)' : 'transparent',
                  border: isDone ? 'none' : '1.5px solid var(--line-strong)',
                  color: 'var(--accent-ink)',
                }}
              >
                {isDone ? (
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'grid', placeItems: 'center' }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </motion.span>
                ) : isCurrent && !reduceMotion ? (
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-3)' }}
                  />
                ) : null}
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: isCurrent ? 600 : 400 }}>
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
