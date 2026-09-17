'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/client/session';
import { useIsClient } from '@/lib/client/use-is-client';
import { Card, Chip, Eyebrow, PageSkeleton, EmptyState, formatHours } from '@/components/ui/primitives';
import StreakCard from '@/components/dashboard/StreakCard';
import WeeklyProgress from '@/components/dashboard/WeeklyProgress';
import { shiftDate, localDate } from '@/lib/streak/engine';
import type { ActivityEvent } from '@/types';

/** Activity: streak, totals, heatmap and a real event timeline. */
export default function ActivityPage() {
  const { analysis, progress, user, timezone } = useSession();
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!user) {
        setEvents([]);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/activity?tz=${encodeURIComponent(timezone)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setFailed(true);
          setEvents([]);
          return;
        }
        const data = await res.json();
        setEvents(data.events as ActivityEvent[]);
      } catch {
        setFailed(true);
        setEvents([]);
      }
    })();
  }, [user, timezone]);

  if (!analysis) return <PageSkeleton />;

  const activeDates = new Set((events ?? []).map((e) => e.localDate));

  return (
    <div className="stack-lg">
      <header className="stack-sm">
        <Eyebrow>Activity</Eyebrow>
        <h1 className="title-xl">Keep going.</h1>
        <p className="lede">Only real learning counts here, opening a page never does.</p>
      </header>

      <section className="grid-asym">
        <div className="stack-md">
          <Card variant="white">
            <h2 className="title-md" style={{ marginBottom: 20 }}>
              Totals
            </h2>
            <div className="grid-3">
              <Metric label="Hours learned" value={formatHours(progress?.hoursLearned ?? 0)} />
              <Metric label="Resources completed" value={String(progress?.resourcesCompleted.length ?? 0)} />
              <Metric label="Projects built" value={String(progress?.projectsCompleted.length ?? 0)} />
            </div>
            <div className="grid-3" style={{ marginTop: 22 }}>
              <Metric label="Skills acquired" value={String(progress?.skillsAcquired.length ?? 0)} />
              <Metric
                label="Roadmap milestones"
                value={`${analysis.roadmap.milestones.length}`}
              />
              <Metric
                label="Career readiness"
                value={`${Math.round(analysis.readiness.overall * 100)}%`}
              />
            </div>
          </Card>

          <Heatmap activeDates={activeDates} timezone={timezone} />
        </div>

        <StreakCard />
      </section>

      <WeeklyProgress events={events} plan={analysis.weeklyPlan} timezone={timezone} />

      {/* ── Timeline ── */}
      <section>
        <h2 className="title-md" style={{ marginBottom: 16 }}>
          Recent activity
        </h2>

        {events === null ? (
          <Card>
            <p className="meta">Loading your activity…</p>
          </Card>
        ) : failed ? (
          <Card>
            <p className="body">
              We couldn&apos;t load your activity right now. Your recorded progress is safe, try refreshing in a moment.
            </p>
          </Card>
        ) : events.length === 0 ? (
          <EmptyState
            title={user ? 'Nothing recorded yet' : 'Activity needs an account'}
            body={
              user
                ? 'Complete a resource or a project and it will appear here.'
                : 'Sign in so your learning is recorded on the server rather than in this browser.'
            }
          />
        ) : (
          <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
            {events.slice(0, 40).map((event) => (
              <li
                key={event.id}
                className="spread"
                style={{ padding: '14px 0', borderBottom: '1px solid var(--line)', gap: 16 }}
              >
                <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{event.label}</span>
                  <div className="wrap">
                    <Chip>{event.type.replace(/_/g, ' ')}</Chip>
                    {event.minutes > 0 ? <Chip>{event.minutes} min</Chip> : null}
                  </div>
                </div>
                <span className="meta">{relativeDay(event.localDate, timezone)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack-sm">
      <Eyebrow>{label}</Eyebrow>
      <div className="title-md num">{value}</div>
    </div>
  );
}

/** Twelve weeks of activity, Monday-first. */
function Heatmap({ activeDates, timezone }: { activeDates: Set<string>; timezone: string }) {
  // "Today" depends on the viewer's clock, which the server cannot know.
  const isClient = useIsClient();

  const days = useMemo(() => {
    if (!isClient) return [];
    const today = localDate(new Date(), timezone);
    const total = 12 * 7;
    return Array.from({ length: total }, (_, i) => shiftDate(today, i - (total - 1)));
  }, [isClient, timezone]);

  if (days.length === 0) return null;

  return (
    <Card>
      <Eyebrow>Last 12 weeks</Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'repeat(7, 1fr)',
          gridAutoFlow: 'column',
          gap: 3,
          marginTop: 16,
          overflowX: 'auto',
        }}
        role="img"
        aria-label={`Activity heatmap: ${activeDates.size} active days in the last 12 weeks`}
      >
        {days.map((date) => (
          <span
            key={date}
            title={date}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: activeDates.has(date) ? 'var(--ok)' : 'var(--line)',
            }}
          />
        ))}
      </div>
      <p className="meta" style={{ marginTop: 14 }}>
        {activeDates.size} active {activeDates.size === 1 ? 'day' : 'days'}
      </p>
    </Card>
  );
}

function relativeDay(date: string, timezone: string): string {
  const today = localDate(new Date(), timezone);
  if (date === today) return 'Today';
  if (date === shiftDate(today, -1)) return 'Yesterday';
  return date;
}
