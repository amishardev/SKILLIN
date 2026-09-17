'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Chip, Eyebrow, formatDuration } from '@/components/ui/primitives';
import { skillName, skillShortLabel } from '@/data/skills';
import type { LearningResource } from '@/data/resources';
import type { Recommendation } from '@/types';

/**
 * "Your next move", the single dominant card.
 *
 * There is exactly one of these. The whole product exists to answer one
 * question, so the answer gets the largest surface on the page.
 */
export default function NextMoveCard({
  resource,
  recommendation,
  weeklyHours,
  compact = false,
}: {
  resource: LearningResource;
  recommendation: Recommendation;
  weeklyHours: number;
  /**
   * For the dashboard board, where the card shares one screen with everything
   * else. It drops the reasoning paragraph, which is the first thing on the
   * detail page behind "Why this?", and keeps the three skill groups, which are
   * the part you cannot get anywhere else at a glance.
   */
  compact?: boolean;
}) {
  const { explanation, score } = recommendation;
  const gap = compact ? 12 : 22;

  return (
    <article className="card card-accent" style={{ padding: compact ? 22 : 30 }}>
      <div className="spread" style={{ marginBottom: compact ? 12 : 20, flexWrap: 'wrap', gap: 12 }}>
        <Eyebrow>Your next move</Eyebrow>
        <div className="row-tight">
          <span className="chip chip-solid">Free</span>
          <span className="chip chip-solid">{resource.level}</span>
        </div>
      </div>

      <h2 className={compact ? 'title-lg' : 'title-xl'} style={{ marginBottom: 10, maxWidth: 640 }}>
        {resource.title}
      </h2>

      <div className="row" style={{ marginBottom: gap, flexWrap: 'wrap', gap: 18 }}>
        <Meta label="Provider" value={resource.provider} />
        <Meta label="Time" value={formatDuration(resource.estimatedHours, weeklyHours)} />
        <Meta
          label="New skills"
          value={`+${score.skillsGained.length}`}
        />
      </div>

      {compact ? null : (
        <p style={{ fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: 22, maxWidth: 640 }}>
          {explanation.why}
        </p>
      )}

      <div className="grid-3" style={{ gap: compact ? 12 : 20, marginBottom: compact ? 16 : 26 }}>
        <SkillGroup title="You already know" items={explanation.youKnow} />
        <SkillGroup title="You're missing" items={explanation.youAreMissing} />
        <SkillGroup title="This unlocks" items={explanation.unlocks} />
      </div>

      <div className="wrap">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn-dark ${compact ? '' : 'btn-lg'}`.trim()}
        >
          Start learning
          <ExternalLink size={15} aria-hidden="true" />
        </a>
        <Link
          href={`/app/learn/${resource.id}`}
          className={`btn btn-ghost ${compact ? '' : 'btn-lg'}`.trim()}
          style={{ borderColor: 'var(--accent-ink)' }}
        >
          Why this?
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack-sm" style={{ gap: 2 }}>
      <span className="eyebrow" style={{ color: 'inherit', opacity: 0.55 }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{value}</span>
    </div>
  );
}

function SkillGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="stack-sm">
      <span className="eyebrow" style={{ color: 'inherit', opacity: 0.55 }}>
        {title}
      </span>
      <div className="wrap">
        {items.slice(0, 4).map((item) => (
          /* Short form in the chip, full name in the tooltip. */
          <Chip key={item} tone="solid" title={item}>
            {skillShortLabel(item)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** Shared helper so lists of skill ids render as names consistently. */
export function names(ids: readonly string[]): string[] {
  return ids.map(skillName);
}
