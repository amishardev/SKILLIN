'use client';

import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { Bar, Card, Eyebrow, PageSkeleton, EmptyState, formatHours } from '@/components/ui/primitives';
import NextMoveCard from '@/components/dashboard/NextMoveCard';
import StreakCard from '@/components/dashboard/StreakCard';
import { catalogResource } from '@/lib/catalog';

/**
 * Dashboard: where you are, where you're going, and the single next step.
 *
 * Laid out for one glance rather than one scroll: header, a three card context
 * strip, then two continuous columns. The answer and the skill analysis on the
 * left, everything that reports status on the right. Anything deeper (the full
 * skill map, the week by week chart, the whole project list) lives on its own
 * page instead of being previewed at full size here.
 */
export default function DashboardPage() {
  const { analysis, profile, plan, progress } = useSession();

  if (!analysis || !profile || !plan) return <PageSkeleton />;

  const { career, gaps, readiness, nextMove, roadmap, recommendations, projects } = analysis;
  const completedCount = progress?.resourcesCompleted.length ?? 0;
  const hoursLearned = progress?.hoursLearned ?? 0;

  const confirmed = gaps.filter((g) => g.status === 'confirmed').length;
  const developing = gaps.filter((g) => g.status === 'developing').length;
  const missing = gaps.filter((g) => g.status === 'missing').length;

  // Strongest first, then the largest gaps: the six rows that tell you where
  // you stand without opening the full map.
  const headline = [...gaps]
    .sort((a, b) => b.current - a.current)
    .slice(0, 3)
    .concat([...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3))
    .filter((g, i, all) => all.findIndex((o) => o.skillId === g.skillId) === i)
    .slice(0, 6);

  const builtIds = new Set(progress?.projectsCompleted ?? []);
  const upcomingProjects = projects.filter((p) => !builtIds.has(p.id)).slice(0, 3);

  return (
    <div className="board-page">
      {/* ── Heading ── */}
      <header className="spread page-head" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div className="stack-sm">
          <Eyebrow>{profile.name ? `Hello, ${profile.name.split(' ')[0]}` : 'Your path'}</Eyebrow>
          <h1 className="title-xl">
            Becoming {article(career.title)} {career.title}
          </h1>
          <p className="meta">Your roadmap adapts as you learn.</p>
        </div>

        {nextMove ? (
          <Link href={`/app/learn/${nextMove.resource.id}`} className="btn btn-dark">
            <Play size={15} aria-hidden="true" />
            Continue Learning
          </Link>
        ) : null}
      </header>

      {/* ── Context strip ── */}
      <section className="strip" aria-label="Your context">
        <Card>
          <Eyebrow>Your background</Eyebrow>
          <div className="title-sm">{profile.branch || profile.degree || 'Your profile'}</div>
          <div className="meta">
            {profile.college || `${profile.projects.length} projects · ${profile.experience.length} roles`}
          </div>
        </Card>
        <Card>
          <Eyebrow>Your goal</Eyebrow>
          <div className="title-sm">{career.title}</div>
          <div className="meta">{roadmap.milestones.length} milestones planned</div>
        </Card>
        <Card>
          <Eyebrow>Your pace</Eyebrow>
          <div className="title-sm num">
            {plan.timelineMonths} months · {plan.weeklyHours} hrs/week
          </div>
          <div className="meta">
            {career.skills.filter((s) => s.required).length} core skills required
          </div>
        </Card>
      </section>

      {/*
        One grid, not two. When the hero and the status column were separate
        sections the shorter column left dead space until the next section
        started, so the gap under "your next move" was larger than the gap
        between any two cards. Everything is now two continuous columns with a
        single 16px rhythm.
      */}
      <section className="board">
        <div className="board-col">
          {nextMove ? (
            <NextMoveCard
              resource={nextMove.resource}
              recommendation={nextMove.recommendation}
              weeklyHours={plan.weeklyHours}
              compact
            />
          ) : (
            <EmptyState
              title="We couldn't find a strong next step yet"
              body="Add a project or a skill to your profile and we'll have more to work with."
              action={
                <Link href="/app/profile" className="btn btn-dark">
                  Edit your profile
                </Link>
              }
            />
          )}

          <Card>
            <div className="spread">
              <div>
                <h2 className="title-sm">Skill analysis</h2>
                <p className="meta">
                  <span style={{ color: 'var(--confirmed)' }}>{confirmed} confirmed</span>{' '}
                  · <span style={{ color: 'var(--developing)' }}>{developing} developing</span>{' '}
                  · {missing} missing
                </p>
              </div>
              <Link href="/app/skills" className="btn btn-quiet btn-sm">
                Full skill map
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <ul className="rows skill-grid" style={{ marginTop: 14 }}>
              {headline.map((gap) => (
                <li key={gap.skillId} className="meter-row">
                  <span className="line-row-name">{gap.skillName}</span>
                  <Bar
                    value={gap.current}
                    tone={gap.status === 'confirmed' ? 'ok' : gap.status === 'developing' ? 'warn' : 'dark'}
                    label={`${gap.skillName}: ${Math.round(gap.current * 100)} percent of what ${career.title} needs`}
                  />
                  <span className="meta num">{Math.round(gap.current * 100)}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="board-col">
          <StreakCard />

          <Card variant="white">
            <div className="spread">
              <Eyebrow>Career readiness</Eyebrow>
              <span
                className="num readiness-figure"
                title={`A measure of your progress toward ${career.title}, not a hiring prediction.`}
              >
                {Math.round(readiness.overall * 100)}%
              </span>
            </div>
            <ul className="rows" style={{ marginTop: 12 }}>
              {(
                [
                  ['Skills', readiness.components.skills],
                  ['Projects', readiness.components.projects],
                  ['Experience', readiness.components.experience],
                  ['Prerequisites', readiness.components.prerequisites],
                ] as const
              ).map(([label, value]) => (
                <li key={label} className="meter-row">
                  <span className="meta">{label}</span>
                  <Bar value={value} label={`${label} readiness`} />
                  <span className="meta num">{Math.round(value * 100)}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="grid-3">
              <Metric label="Hours learned" value={formatHours(hoursLearned)} />
              <Metric
                label="Resources done"
                value={`${completedCount} / ${roadmap.milestones.filter((m) => m.kind === 'resource').length}`}
              />
              <Metric
                label="Projects built"
                value={`${progress?.projectsCompleted.length ?? 0} / ${projects.length}`}
              />
            </div>
          </Card>

          {recommendations.length > 1 ? (
            <Card>
              <div className="spread">
                <h2 className="title-sm">Also worth your time</h2>
                <Link href="/app/learn" className="meta">
                  All
                </Link>
              </div>
              <ul className="rows" style={{ marginTop: 10 }}>
                {recommendations.slice(1, 4).map((rec) => {
                  const resource = catalogResource(rec.resourceId);
                  if (!resource) return null;
                  return (
                    <li key={rec.resourceId}>
                      <Link href={`/app/learn/${resource.id}`} className="line-row">
                        <span className="line-row-name">{resource.title}</span>
                        <span className="meta">+{rec.score.skillsGained.length}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {upcomingProjects.length > 0 ? (
            <Card>
              <div className="spread">
                <h2 className="title-sm">Build next</h2>
                <Link href="/app/projects" className="meta">
                  All
                </Link>
              </div>
              <ul className="rows" style={{ marginTop: 10 }}>
                {upcomingProjects.map((project) => (
                  <li key={project.id}>
                    <Link href="/app/projects" className="line-row">
                      <span className="line-row-name">{project.title}</span>
                      <span className="meta">{project.difficulty}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="title-sm num" style={{ marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

/** "an AI Engineer" vs "a Data Scientist". */
function article(title: string): string {
  return /^[AEIOU]/.test(title) ? 'an' : 'a';
}
