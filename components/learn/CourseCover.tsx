'use client';

import { useState } from 'react';
import type { LearningResource } from '@/data/resources';
import { coverTheme } from '@/lib/catalog';
import GeneratedArt, { hash } from './GeneratedArt';

/**
 * A resource cover.
 *
 * Publisher artwork when the dataset supplied it; otherwise generated artwork
 * derived from the resource's own id and skill domain. We do not invent image
 * URLs to fill the gap, and a publisher image that fails to load falls back to
 * the generated treatment rather than leaving a blank card.
 */
export default function CourseCover({
  resource,
  eager,
}: {
  resource: LearningResource;
  eager?: boolean;
}) {
  const theme = coverTheme(resource);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(resource.thumbnail) && !imageFailed;

  // Stable per-resource variation so covers in a row are not all identical.
  const angle = 120 + (hash(resource.id) % 5) * 22;

  return (
    <div
      className="course-cover"
      style={{ background: `linear-gradient(${angle}deg, ${theme.from}, ${theme.to})` }}
    >
      {showImage ? (
        // Deliberately a plain <img>, not next/image: these are already-sized
        // publisher CDN images from an external host, and routing ~550 of them
        // through the optimiser would be metered on the free tier for no
        // visual gain. Lazy loading and async decoding give us what matters.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resource.thumbnail}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <GeneratedArt seedId={resource.id} glyph={theme.glyph} />
          <span
            style={{
              position: 'absolute',
              left: 12,
              bottom: 10,
              right: 12,
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(245,245,240,.62)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {resource.provider}
          </span>
        </>
      )}
    </div>
  );
}
