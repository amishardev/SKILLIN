'use client';

import { useEffect, useState } from 'react';

/**
 * The SkillIn wordmark, animated.
 *
 * The wordmark is one connected cursive stroke, so it is treated as one
 * flexible object rather than a set of letters. The artwork is sliced into
 * vertical columns and each column runs the same motion on a small time offset,
 * which sends a single wave travelling left to right through the lettering: the
 * "s" leads, the middle follows, the "n" finishes. Columns lift, compress and
 * shear slightly as the wave passes, so the stroke behaves like a ribbon.
 *
 * Nothing is redrawn. Every column is the same PNG at a different offset, so
 * the letterforms, spacing and proportions are the supplied artwork exactly,
 * and at rest the columns line up into the untouched logo.
 *
 * The cycle is built so every column is back at rest before the slowest one
 * restarts, which is what makes the loop seamless without a reset flash.
 */

const WORDMARK_SRC = '/brand/skillin-wordmark.png';
const ICON_SRC = '/brand/skillin-icon.png';

/** Aspect ratio of the supplied wordmark artwork (2080 x 756). */
const WORDMARK_RATIO = 2080 / 756;

/**
 * Column count is a seam budget. The wave's amplitude divided by the number of
 * columns is the vertical step between two neighbours, and at thirty columns
 * that step stays under half a pixel at the loader's size, so the stroke reads
 * as continuous rather than sliced.
 */
const COLUMNS = 30;

export type MotionLogoVariant = 'fullscreen' | 'loader' | 'inline';

export default function SkillInMotionLogo({
  variant = 'loader',
  size,
  speed = 1,
  message,
  loop = true,
}: {
  variant?: MotionLogoVariant;
  /** Wordmark height in pixels. Defaults per variant. */
  size?: number;
  /** 1 is the designed tempo. Below 1 is slower, used for the offline state. */
  speed?: number;
  message?: string;
  loop?: boolean;
}) {
  const height = size ?? (variant === 'fullscreen' ? 56 : variant === 'loader' ? 40 : 22);
  const width = height * WORDMARK_RATIO;

  const mark = (
    <span
      className="mlogo"
      style={
        {
          width,
          height,
          '--mlogo-duration': `${3.6 / Math.max(0.2, speed)}s`,
          '--mlogo-iterations': loop ? 'infinite' : '1',
        } as React.CSSProperties
      }
      role="img"
      aria-label="SkillIn"
    >
      {Array.from({ length: COLUMNS }, (_, i) => (
        <span
          key={i}
          className="mlogo-col"
          aria-hidden="true"
          style={
            {
              '--i': i,
              backgroundImage: `url(${WORDMARK_SRC})`,
              backgroundSize: `${COLUMNS * 100}% 100%`,
              // Spread the columns across the artwork. The final column sits at
              // 100%, so the slice covers the full wordmark with no gap.
              backgroundPosition: `${(i / (COLUMNS - 1)) * 100}% center`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );

  if (variant === 'inline') return mark;

  const body = (
    <div className="mlogo-stage">
      <span className="mlogo-tile" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size local brand asset. */}
        <img src={ICON_SRC} alt="" width={height * 0.72} height={height * 0.72} />
      </span>
      {mark}
      {message ? (
        <p className="mlogo-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );

  if (variant === 'loader') return body;

  return (
    <div className="mlogo-fullscreen" aria-busy="true">
      {body}
    </div>
  );
}

/**
 * True once `active` has been true for `delay` ms, and false the instant it
 * stops. A loader that appears for 200ms is a flash, not a loading state, so
 * short waits show nothing at all and long ones show the animation immediately
 * on crossing the threshold.
 */
export function useSlowLoad(active: boolean, delay = 600): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return slow;
}
