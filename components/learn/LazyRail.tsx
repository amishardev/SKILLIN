'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Mounts its children only once the row is near the viewport.
 *
 * With ~13 rows of 18 cards, mounting everything at once would put 200+ cards
 * and their covers in the DOM before the learner has scrolled at all. This
 * keeps the initial render to the rows they can actually see, and reserves the
 * row's height so nothing jumps as rows appear.
 */
export default function LazyRail({
  children,
  /** Rows above the fold skip the observer entirely. */
  eager = false,
  minHeight = 268,
}: {
  children: ReactNode;
  eager?: boolean;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (older browsers, some test environments): render
    // everything rather than showing permanently empty rows. Scheduled on the
    // next frame so it is not a synchronous state update inside the effect.
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Start loading a screen early so a row is ready before it is reached.
      { rootMargin: '700px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
