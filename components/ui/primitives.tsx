'use client';

import type { CSSProperties, ReactNode } from 'react';

/** Small, unopinionated building blocks shared across the app. */

export function Card({
  children,
  variant = 'default',
  hover = false,
  style,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  variant?: 'default' | 'white' | 'dark' | 'accent';
  hover?: boolean;
  style?: CSSProperties;
  /** For layout classes the card itself should not know about, such as `board-scroll`. */
  className?: string;
  as?: 'div' | 'article' | 'section' | 'li';
}) {
  const variantClass =
    variant === 'white' ? 'card-white' : variant === 'dark' ? 'card-dark' : variant === 'accent' ? 'card-accent' : '';
  return (
    <Tag className={`card ${variantClass} ${hover ? 'card-hover' : ''} ${className ?? ''}`.trim()} style={style}>
      {children}
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Chip({
  children,
  tone = 'default',
  title,
}: {
  children: ReactNode;
  tone?: 'default' | 'solid' | 'accent' | 'ok' | 'warn' | 'err';
  title?: string;
}) {
  const toneClass = tone === 'default' ? '' : `chip-${tone}`;
  return (
    <span className={`chip ${toneClass}`.trim()} title={title}>
      {children}
    </span>
  );
}

export function Bar({
  value,
  tone = 'dark',
  label,
}: {
  /** 0-1. */
  value: number;
  tone?: 'dark' | 'accent' | 'ok' | 'warn';
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const toneClass = tone === 'dark' ? '' : `bar-${tone}`;
  return (
    <div
      className={`bar ${toneClass}`.trim()}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="stack-sm">
      <Eyebrow>{label}</Eyebrow>
      <div className="title-md num">{value}</div>
      {sub ? <div className="meta">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <div className="stack-sm" style={{ textAlign: 'center', padding: '24px 8px' }}>
        <div className="title-sm">{title}</div>
        <p className="body" style={{ maxWidth: 420, margin: '0 auto' }}>
          {body}
        </p>
        {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
      </div>
    </Card>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        background: 'color-mix(in srgb, var(--err) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--err) 22%, transparent)',
        color: 'var(--err)',
        borderRadius: 'var(--r-sm)',
        padding: '10px 14px',
        fontSize: '0.875rem',
      }}
    >
      {children}
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%' }: { height?: number; width?: number | string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />;
}

/**
 * Page-level loading state used while the session hydrates.
 *
 * It mirrors the dashboard's own layout: header, context strip, then the two
 * columns. A skeleton that is shorter than the page it stands in for leaves a
 * block of dead space inside a full height shell, which reads as a broken
 * layout rather than as loading.
 */
export function PageSkeleton() {
  return (
    <div className="board-page" aria-busy="true" aria-label="Loading">
      <div className="spread page-head" style={{ alignItems: 'flex-end', gap: 16 }}>
        <div className="stack-sm" style={{ flex: 1, maxWidth: 520 }}>
          <Skeleton height={12} width="18%" />
          <Skeleton height={38} width="70%" />
          <Skeleton height={14} width="40%" />
        </div>
        <Skeleton height={42} width={168} />
      </div>

      <div className="strip">
        <Skeleton height={104} />
        <Skeleton height={104} />
        <Skeleton height={104} />
      </div>

      <div className="board">
        <div className="board-col">
          <Skeleton height={378} />
          <Skeleton height={180} />
        </div>
        <div className="board-col">
          <Skeleton height={65} />
          <Skeleton height={168} />
          <Skeleton height={96} />
          <Skeleton height={140} />
        </div>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="spread" style={{ marginBottom: 4 }}>
      <div className="stack-sm">
        <h2 className="title-lg">{title}</h2>
        {subtitle ? <p className="body">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Skill status pip used on the skill map and gap lists. */
export function SkillStatus({ status }: { status: 'confirmed' | 'developing' | 'missing' }) {
  const config = {
    confirmed: { label: 'Confirmed', tone: 'ok' as const, mark: '✓' },
    developing: { label: 'Developing', tone: 'warn' as const, mark: '△' },
    missing: { label: 'Missing', tone: 'default' as const, mark: '✕' },
  }[status];

  return (
    <Chip tone={config.tone}>
      <span aria-hidden="true">{config.mark}</span>
      {config.label}
    </Chip>
  );
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 10) return `${Math.round(hours * 10) / 10} hrs`;
  return `${Math.round(hours)} hrs`;
}

export function formatDuration(hours: number, weeklyHours: number): string {
  const weeks = Math.max(1, Math.ceil(hours / Math.max(1, weeklyHours)));
  if (weeks === 1) return '1 week';
  if (weeks < 8) return `${weeks} weeks`;
  const months = Math.round(weeks / 4.33);
  return `${months} month${months === 1 ? '' : 's'}`;
}
