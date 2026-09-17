'use client';

import { useEffect, useRef, useState } from 'react';
import type { LearningResource } from '@/data/resources';
import type { Rail } from '@/lib/catalog/rails';
import CourseCard from './CourseCard';

/**
 * A recommendation row.
 *
 * Two behaviours, one component:
 *
 *   desktop  a responsive grid. One row, as many cards as the width fits, and
 *            a button to show the rest. Nothing scrolls sideways, so the wheel
 *            and the trackpad keep doing what they always do.
 *   phone    a horizontal rail with snap points, because 390px fits one card
 *            and a grid would be a very long column.
 *
 * The grid is the default on desktop on purpose. Copying a streaming service's
 * visual language is worth doing; copying a row of hidden content behind a pair
 * of arrows is not, and it was the main thing making this page tiring to browse.
 */
export default function CourseRail({
  rail,
  blockedFor,
  progressFor,
  onOpen,
  eager,
}: {
  rail: Rail;
  blockedFor?: (r: LearningResource) => string[] | undefined;
  progressFor?: (r: LearningResource) => number | undefined;
  onOpen: (r: LearningResource) => void;
  eager?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  /**
   * How many cards one row holds, read from the resolved grid. Null means the
   * track is not a grid, which is the phone rail, where every card is rendered
   * and the row scrolls.
   *
   * Cards beyond the first row are not rendered rather than hidden, so nothing
   * invisible is left in the tab order.
   */
  const [columns, setColumns] = useState<number | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      if (style.display !== 'grid') {
        setColumns(null);
        return;
      }
      setColumns(style.gridTemplateColumns.split(' ').filter(Boolean).length);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const perRow = columns ?? rail.resources.length;
  const shown = expanded ? rail.resources.slice(0, perRow * 3) : rail.resources.slice(0, perRow);
  const hidden = rail.resources.length - shown.length;

  return (
    <section className="rail-section" aria-labelledby={`rail-${rail.id}`}>
      <div className="rail-head learn-pad">
        <div>
          <h2 className="rail-title" id={`rail-${rail.id}`}>
            {rail.title}
          </h2>
          <p className="rail-reason">{rail.reason}</p>
        </div>

        {columns !== null && (hidden > 0 || expanded) ? (
          <button
            type="button"
            className="btn btn-on-dark btn-sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show less' : `Show ${hidden} more`}
          </button>
        ) : null}
      </div>

      <div className="rail-track" ref={trackRef}>
        {shown.map((resource, i) => (
          <CourseCard
            key={resource.id}
            resource={resource}
            blockedBy={blockedFor?.(resource)}
            progress={progressFor?.(resource)}
            onOpen={onOpen}
            eager={eager && i < 5}
          />
        ))}
      </div>
    </section>
  );
}
