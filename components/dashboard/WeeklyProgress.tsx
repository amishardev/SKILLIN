'use client';

import { useMemo } from 'react';
import { Eyebrow } from '@/components/ui/primitives';
import { useIsClient } from '@/lib/client/use-is-client';
import { localDate, shiftDate } from '@/lib/streak/engine';
import type { ActivityEvent, WeeklyPlan } from '@/types';

/**
 * Learning progress for the week.
 *
 * Two bars per day, drawn as elegant verticals rather than a chart library:
 *   - solid dark  = minutes actually recorded from verified activity
 *   - lime        = minutes the weekly plan asked for
 *
 * Planned-vs-actual is the honest comparison. Showing only "hours studied"
 * would hide whether the learner is keeping to the pace they chose.
 */
export default function WeeklyProgress({
  events,
  plan,
  timezone,
}: {
  events: ActivityEvent[] | null;
  plan: WeeklyPlan | null;
  timezone: string;
}) {
  // "This week" depends on the viewer's clock, which the server cannot know.
  const isClient = useIsClient();

  const days = useMemo(() => {
    if (!isClient) return [];

    const today = localDate(new Date(), timezone);
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

    // Minutes recorded per local day.
    const actual = new Map<string, number>();
    for (const event of events ?? []) {
      actual.set(event.localDate, (actual.get(event.localDate) ?? 0) + event.minutes);
    }

    // Minutes the plan asked for, per weekday.
    const planned = new Map<string, number>();
    for (const session of plan?.sessions ?? []) {
      planned.set(session.day, (planned.get(session.day) ?? 0) + session.minutes);
    }

    return labels.map((label, i) => {
      const date = shiftDate(today, i - mondayOffset);
      return {
        label,
        date,
        isToday: date === today,
        isFuture: i > mondayOffset,
        actual: actual.get(date) ?? 0,
        planned: planned.get(label) ?? 0,
      };
    });
  }, [isClient, events, plan, timezone]);

  const peak = Math.max(60, ...days.map((d) => Math.max(d.actual, d.planned)));
  const totalActual = days.reduce((sum, d) => sum + d.actual, 0);
  const totalPlanned = days.reduce((sum, d) => sum + d.planned, 0);

  return (
    <div className="card card-white">
      <div className="spread" style={{ marginBottom: 6, alignItems: 'flex-start' }}>
        <div className="stack-sm">
          <h2 className="title-md">Learning progress</h2>
          <p className="meta">This week, against the pace you chose.</p>
        </div>
        <div className="row" style={{ gap: 14 }}>
          <Legend swatch="var(--dark)" label="Recorded" />
          <Legend swatch="var(--accent)" label="Planned" />
        </div>
      </div>

      {days.length === 0 ? (
        <div className="skeleton" style={{ height: 150, marginTop: 20 }} aria-hidden="true" />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 10,
              alignItems: 'end',
              height: 150,
              marginTop: 22,
            }}
            role="img"
            aria-label={`${Math.round(totalActual / 6) / 10} hours recorded this week against ${Math.round(totalPlanned / 6) / 10} hours planned`}
          >
            {days.map((day) => (
              <div key={day.date} className="col" style={{ height: '100%', justifyContent: 'flex-end', gap: 4 }}>
                <div
                  className="row"
                  style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: '100%' }}
                >
                  <Bar
                    height={(day.actual / peak) * 100}
                    color="var(--dark)"
                    dim={day.isFuture}
                    title={`${day.label}: ${day.actual} min recorded`}
                  />
                  <Bar
                    height={(day.planned / peak) * 100}
                    color="var(--accent)"
                    dim={false}
                    title={`${day.label}: ${day.planned} min planned`}
                  />
                </div>
                <span
                  className="meta"
                  style={{
                    textAlign: 'center',
                    fontWeight: day.isToday ? 700 : 400,
                    color: day.isToday ? 'var(--ink)' : undefined,
                  }}
                >
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div className="spread" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <Total label="Recorded" minutes={totalActual} />
            <Total label="Planned" minutes={totalPlanned} />
            <Total
              label="On pace"
              minutes={null}
              display={totalPlanned === 0 ? ', ' : `${Math.round((totalActual / totalPlanned) * 100)}%`}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Bar({
  height,
  color,
  dim,
  title,
}: {
  height: number;
  color: string;
  dim: boolean;
  title: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: 'block',
        width: 11,
        // A zero-value bar still shows a 3px foot so the day is visible.
        height: `${Math.max(3, Math.min(100, height))}%`,
        borderRadius: 999,
        background: height <= 0 ? 'var(--line)' : color,
        opacity: dim ? 0.35 : 1,
        transition: 'height .5s var(--ease)',
      }}
    />
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="row-tight" style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: 999, background: swatch, display: 'block' }}
      />
      {label}
    </span>
  );
}

function Total({
  label,
  minutes,
  display,
}: {
  label: string;
  minutes: number | null;
  display?: string;
}) {
  const value =
    display ?? (minutes! >= 60 ? `${Math.round((minutes! / 60) * 10) / 10} hrs` : `${minutes} min`);
  return (
    <div className="stack-sm" style={{ gap: 2 }}>
      <Eyebrow>{label}</Eyebrow>
      <span className="title-sm num">{value}</span>
    </div>
  );
}
