'use client';

import Link from 'next/link';
import { useSession } from '@/lib/client/session';
import { Bar, Card, Chip, Eyebrow, PageSkeleton } from '@/components/ui/primitives';

/**
 * Skill map: confirmed, developing, missing, overlaid on the target role.
 *
 * Built for scanning. A confirmed skill is one row: name, bar, figure, and the
 * evidence types that back it. Missing skills carry no evidence, so they go in
 * a two column grid of current against required. The point is to see where you
 * stand in a glance, not to page through fifteen tall cards.
 */
export default function SkillsPage() {
  const { analysis, plan } = useSession();
  if (!analysis || !plan) return <PageSkeleton />;

  const { skills, gaps, career, roadmap } = analysis;

  const confirmed = gaps.filter((g) => g.status === 'confirmed');
  const developing = gaps.filter((g) => g.status === 'developing');
  const missing = gaps.filter((g) => g.status === 'missing');

  // Skills the learner has that the target role doesn't ask for, still real.
  const targetIds = new Set(gaps.map((g) => g.skillId));
  const extra = skills.filter((s) => !targetIds.has(s.skillId) && s.score >= 0.5);

  return (
    <div className="stack-md">
      <header className="spread page-head" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div className="stack-sm">
          <Eyebrow>Skill map</Eyebrow>
          <h1 className="title-xl">Where you stand.</h1>
          <p className="meta">
            Every skill {career.title} needs, measured against what your profile actually shows.
          </p>
        </div>

        <div className="count-strip" aria-label="Summary">
          <Count label="Confirmed" value={confirmed.length} tone="var(--confirmed)" />
          <Count label="Developing" value={developing.length} tone="var(--developing)" />
          <Count label="Missing" value={missing.length} tone="var(--ink-3)" />
        </div>
      </header>

      <EvidenceGroup
        title="Confirmed"
        subtitle="You can defend these in an interview."
        gaps={confirmed}
        evidence={skills}
      />
      <EvidenceGroup
        title="Developing"
        subtitle="Mentioned, but not yet demonstrated at the level the role needs."
        gaps={developing}
        evidence={skills}
      />

      {missing.length > 0 ? (
        <Card variant="white">
          <div className="spread">
            <div>
              <h2 className="title-sm">Missing</h2>
              <p className="meta">These are what your roadmap is built to close.</p>
            </div>
            <Link href="/app/roadmap" className="btn btn-quiet btn-sm">
              See the plan
            </Link>
          </div>

          <ul className="rows gap-grid" style={{ marginTop: 14 }}>
            {missing.map((gap) => (
              <li key={gap.skillId} className="gap-cell">
                <div className="spread">
                  <span className="line-row-name">{gap.skillName}</span>
                  <span className="meta num">
                    {Math.round(gap.current * 100)}% / {Math.round(gap.required * 100)}%
                  </span>
                </div>
                <Bar value={gap.current / Math.max(0.01, gap.required)} label={`${gap.skillName} progress`} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/*
        Moved here from the dashboard: it is a statement about the skill set, so
        it belongs beside the skills rather than under the next move.
      */}
      {roadmap.uncovered.length > 0 ? (
        <Card>
          <div className="spread">
            <div>
              <h2 className="title-sm">Not covered in this timeline</h2>
              <p className="meta">
                At {plan.weeklyHours} hrs/week over {plan.timelineMonths} months, your plan
                cannot reach everything {career.title} needs.
              </p>
            </div>
            <Link href="/app/settings" className="btn btn-quiet btn-sm">
              Adjust timeline
            </Link>
          </div>
          <div className="wrap" style={{ marginTop: 12 }}>
            {roadmap.uncovered.map((skillId) => (
              <Chip key={skillId}>{skillId.replace(/-/g, ' ')}</Chip>
            ))}
          </div>
        </Card>
      ) : null}

      {extra.length > 0 ? (
        <Card>
          <h2 className="title-sm">Beyond this role</h2>
          <p className="meta">
            Skills you have that {career.title} does not specifically require.
          </p>
          <div className="wrap" style={{ marginTop: 12 }}>
            {extra.map((s) => (
              <Chip key={s.skillId} title={s.evidence[0]}>
                {s.skillName}
              </Chip>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="count-cell">
      <span className="num" style={{ color: tone }}>
        {value}
      </span>
      <Eyebrow>{label}</Eyebrow>
    </div>
  );
}

function EvidenceGroup({
  title,
  subtitle,
  gaps,
  evidence,
}: {
  title: string;
  subtitle: string;
  gaps: Array<{ skillId: string; skillName: string; current: number; required: number; status: 'confirmed' | 'developing' | 'missing' }>;
  evidence: Array<{ skillId: string; evidence: string[]; evidenceTypes: string[] }>;
}) {
  if (gaps.length === 0) return null;

  return (
    <Card variant="white">
      <div className="spread">
        <div>
          <h2 className="title-sm">{title}</h2>
          <p className="meta">{subtitle}</p>
        </div>
      </div>

      <ul className="rows skill-grid" style={{ marginTop: 14 }}>
        {gaps.map((gap) => {
          const source = evidence.find((e) => e.skillId === gap.skillId);
          return (
            <li key={gap.skillId} className="skill-cell">
              <div className="spread">
                <span className="line-row-name">{gap.skillName}</span>
                <span className="meta num">
                  {Math.round(gap.current * 100)}% / {Math.round(gap.required * 100)}%
                </span>
              </div>
              <Bar
                value={gap.current / Math.max(0.01, gap.required)}
                tone={gap.status === 'confirmed' ? 'ok' : 'warn'}
                label={`${gap.skillName} progress`}
              />
              {source && source.evidenceTypes.length > 0 ? (
                <div className="evidence-row">
                  {source.evidenceTypes.map((type) => (
                    <span key={type} className="evidence-tag">
                      ✓ {type}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
