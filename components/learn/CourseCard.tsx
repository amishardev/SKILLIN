'use client';

import { Lock } from 'lucide-react';
import type { LearningResource } from '@/data/resources';
import CourseCover from './CourseCover';
import { formatHours } from '@/components/ui/primitives';

export interface CourseCardProps {
  resource: LearningResource;
  /** Missing prerequisite names, when the learner cannot start it yet. */
  blockedBy?: string[];
  /** 0-1 completion, when in progress. */
  progress?: number;
  onOpen: (resource: LearningResource) => void;
  /** Rendered eagerly for the first row; everything else defers. */
  eager?: boolean;
}

/**
 * A catalog card.
 *
 * The cover is either the publisher's real image or a deterministic gradient
 * derived from the resource's own skill domain, so a rail with mixed sources
 * still reads as one designed set rather than a broken image grid.
 *
 * The whole card is one click target. It used to grow a hover panel carrying
 * skill chips and its own Details and Save buttons, which sat over the card and
 * swallowed the click that was meant to open it. Everything that panel held is
 * on the detail page the card opens, so the panel is gone rather than patched.
 */
export default function CourseCard({
  resource,
  blockedBy,
  progress,
  onOpen,
  eager,
}: CourseCardProps) {
  const locked = Boolean(blockedBy?.length);

  return (
    <div className="course-card">
      <button
        type="button"
        onClick={() => onOpen(resource)}
        style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
        aria-label={`${resource.title}, ${resource.provider}`}
      >
        <div style={{ position: 'relative' }}>
          <CourseCover resource={resource} eager={eager} />

          {locked ? (
            <span className="course-badge course-badge-lock">
              <Lock size={10} aria-hidden="true" style={{ marginRight: 3, verticalAlign: '-1px' }} />
              Locked
            </span>
          ) : resource.access === 'free' ? (
            <span className="course-badge">Free</span>
          ) : null}

          {progress !== undefined && progress > 0 ? (
            <span className="course-progress">
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          ) : null}
        </div>

        <div className="course-meta">
          <div className="course-name">{resource.title}</div>
          <div className="course-sub">
            <span>{resource.provider}</span>
            <span aria-hidden="true">·</span>
            <span>{formatHours(resource.estimatedHours)}</span>
            <span aria-hidden="true">·</span>
            <span style={{ textTransform: 'capitalize' }}>{resource.level}</span>
          </div>
        </div>
      </button>

    </div>
  );
}
