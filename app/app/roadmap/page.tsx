'use client';

import Link from 'next/link';
import { BookOpen, Hammer, Check } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { Card, Chip, Eyebrow, PageSkeleton, formatHours } from '@/components/ui/primitives';
import { byMonth } from '@/lib/roadmap/planner';
import { skillName, skillShortName, skillShortLabel } from '@/data/skills';

/** The month-by-month plan, plus this week's concrete schedule. */
export default function RoadmapPage() {
  const { analysis, plan, progress } = useSession();
  if (!analysis || !plan) return <PageSkeleton />;

  const { roadmap, learningPath, weeklyPlan, career } = analysis;
  const months = byMonth(roadmap);

  const isDone = (milestoneResourceId?: string, milestoneProjectId?: string) =>
    (milestoneResourceId && progress?.resourcesCompleted.includes(milestoneResourceId)) ||
    (milestoneProjectId && progress?.projectsCompleted.includes(milestoneProjectId));

  const firstIncomplete = roadmap.milestones.find((m) => !isDone(m.resourceId, m.projectId));

  return (
    <div className="stack-lg">
      <header className="stack-sm">
        <Eyebrow>Roadmap</Eyebrow>
        <h1 className="title-xl">Your roadmap</h1>
        <p className="lede">
          {plan.timelineMonths} months to {career.title}, at {plan.weeklyHours} hours a week.
        </p>
      </header>

      {/* ── Learning path as a skill sequence ── */}
      <Card variant="white">
        <Eyebrow>Your learning path</Eyebrow>
        <ol
          className="wrap path-chain"
          style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', alignItems: 'center' }}
        >
          <li>
            <Chip tone="ok">You are here</Chip>
          </li>
          {learningPath.slice(0, 10).map((skill) => (
            <li key={skill} className="row-tight">
              <span aria-hidden="true" className="meta path-arrow">
                →
              </span>
              <Chip title={skill}>{skillShortLabel(skill)}</Chip>
            </li>
          ))}
          <li className="row-tight">
            <span aria-hidden="true" className="meta path-arrow">
              →
            </span>
            <Chip tone="accent">{career.title}</Chip>
          </li>
        </ol>
      </Card>

      {/* ── This week ── */}
      {weeklyPlan ? (
        <Card>
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="stack-sm">
              <h2 className="title-md">This week</h2>
              <p className="meta">{weeklyPlan.milestoneTitle}</p>
            </div>
            <Chip>{Math.round(weeklyPlan.totalMinutes / 60)} hrs planned</Chip>
          </div>
          <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
            {weeklyPlan.sessions.map((session, i) => (
              <li
                key={`${session.day}-${i}`}
                className="spread"
                style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}
              >
                <span style={{ fontWeight: 600, width: 46, fontSize: '0.875rem' }}>{session.day}</span>
                <span className="body" style={{ flex: 1, fontSize: '0.875rem' }}>
                  {session.focus}
                </span>
                <span className="meta num">
                  {session.minutes >= 60
                    ? `${Math.round((session.minutes / 60) * 10) / 10} hrs`
                    : `${session.minutes} min`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ── Month by month ── */}
      <section className="stack-lg" aria-label="Month by month plan">
        {months.map(({ month, milestones }) => (
          <div key={month} className="stack-md">
            <div className="row">
              <h2 className="title-md">Month {month}</h2>
              <hr className="divider" style={{ flex: 1 }} />
            </div>

            <ul className="stack-md" style={{ listStyle: 'none', padding: 0 }}>
              {milestones.map((milestone) => {
                const done = isDone(milestone.resourceId, milestone.projectId);
                const current = firstIncomplete?.id === milestone.id;

                return (
                  <li key={milestone.id}>
                    <Card
                      variant={current ? 'white' : 'default'}
                      style={current ? { border: '2px solid var(--ink)' } : undefined}
                    >
                      <div className="spread" style={{ alignItems: 'flex-start', gap: 16 }}>
                        <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
                          <div className="row-tight" style={{ flexWrap: 'wrap' }}>
                            <span
                              aria-hidden="true"
                              style={{
                                display: 'grid', placeItems: 'center', width: 26, height: 26,
                                borderRadius: 8,
                                background: done ? 'var(--ok)' : 'var(--app)',
                                color: done ? '#fff' : 'var(--ink-2)',
                              }}
                            >
                              {done ? (
                                <Check size={14} strokeWidth={3} />
                              ) : milestone.kind === 'project' ? (
                                <Hammer size={14} />
                              ) : (
                                <BookOpen size={14} />
                              )}
                            </span>
                            <Chip>
                              Weeks {milestone.weekStart}, {milestone.weekEnd}
                            </Chip>
                            {current ? <Chip tone="accent">Current</Chip> : null}
                            {done ? <Chip tone="ok">Done</Chip> : null}
                          </div>

                          <h3 className="title-sm">{milestone.title}</h3>
                          <p className="meta">
                            {milestone.subtitle} · {formatHours(milestone.hours)}
                          </p>

                          <div className="wrap" style={{ marginTop: 4 }}>
                            {milestone.skillsGained.slice(0, 6).map((s) => (
                              <Chip key={s} title={skillName(s)}>{skillShortName(s)}</Chip>
                            ))}
                          </div>
                        </div>

                        {milestone.resourceId ? (
                          <Link href={`/app/learn/${milestone.resourceId}`} className="btn btn-ghost">
                            Open
                          </Link>
                        ) : (
                          <Link href="/app/projects" className="btn btn-ghost">
                            Open
                          </Link>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {roadmap.uncovered.length > 0 ? (
        <Card>
          <Eyebrow>Beyond this timeline</Eyebrow>
          <p className="body" style={{ margin: '10px 0 14px' }}>
            These {career.title} skills don&apos;t fit in {plan.timelineMonths} months at{' '}
            {plan.weeklyHours} hrs/week. Extend your timeline in Settings to include them.
          </p>
          <div className="wrap">
            {roadmap.uncovered.map((s) => (
              <Chip key={s} title={skillName(s)}>{skillShortName(s)}</Chip>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
