'use client';

import { useState } from 'react';
import {
  X, ExternalLink, Plus, Check, Search as SearchIcon, Lock, Play,
} from 'lucide-react';
import type { LearningResource } from '@/data/resources';
import { coverTheme } from '@/lib/catalog';
import GeneratedArt from './GeneratedArt';
import { skillName, skillShortName } from '@/data/skills';
import { unlockedBy } from '@/lib/recommendation/prerequisites';
import { explainRecommendation, scoreResource } from '@/lib/recommendation/engine';
import { formatHours } from '@/components/ui/primitives';
import type { Analysis } from '@/lib/analysis';
import { SKILL_CONFIRMED_THRESHOLD } from '@/types';

/**
 * Cinematic resource detail.
 *
 * Everything shown here is computed from the learner's own profile, the
 * "why", the prerequisite ticks, the skills gained and the roadmap position.
 * No generic marketing copy appears anywhere on this screen.
 */
export default function CourseDetail({
  resource,
  analysis,
  saved,
  completed,
  onClose,
  onToggleSave,
  onStart,
  onComplete,
  busy,
  notice,
}: {
  resource: LearningResource;
  analysis: Analysis;
  saved: boolean;
  completed: boolean;
  onClose?: () => void;
  onToggleSave: () => void;
  onStart: () => void;
  onComplete: () => void;
  busy?: boolean;
  notice?: string;
}) {
  const [tab, setTab] = useState<'about' | 'path'>('about');
  const theme = coverTheme(resource);

  const score = scoreResource(resource, {
    vector: analysis.vector,
    career: analysis.career,
    projectSkills: [],
    experienceSkills: [],
    academicSkills: [],
    certificateSkills: [],
  });
  const explanation = explainRecommendation(resource, score, analysis.skills, analysis.career);

  const prereqs = resource.prerequisites.map((id) => ({
    id,
    name: skillName(id),
    have: (analysis.vector.get(id) ?? 0) >= 0.4,
  }));
  const missing = prereqs.filter((p) => !p.have);

  const alreadyHave = resource.skills.filter(
    (s) => (analysis.vector.get(s) ?? 0) >= SKILL_CONFIRMED_THRESHOLD);
  const willGain = resource.skills.filter(
    (s) => (analysis.vector.get(s) ?? 0) < SKILL_CONFIRMED_THRESHOLD);
  const unlocks = [...new Set(resource.skills.flatMap((s) => unlockedBy(s)))]
    .filter((s) => !resource.skills.includes(s))
    .slice(0, 6);

  // Where this sits relative to the generated roadmap.
  const milestoneIndex = analysis.roadmap.milestones.findIndex((m) => m.resourceId === resource.id);
  const chain = buildChain(analysis, milestoneIndex, resource);

  return (
    <>
      {/* ── Hero ── */}
      <header
        className="detail-hero"
        style={{ background: `linear-gradient(145deg, ${theme.from}, ${theme.to})` }}
      >
        {resource.thumbnail ? (
          <div
            className="learn-hero-bg"
            style={{ backgroundImage: `url(${resource.thumbnail})` }}
            aria-hidden="true"
          />
        ) : (
          <div className="learn-hero-bg">
            <GeneratedArt seedId={resource.id} glyph={theme.glyph} scale="hero" />
          </div>
        )}
        <div className="learn-hero-scrim" aria-hidden="true" />

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-on-dark"
            aria-label="Close"
            style={{ position: 'absolute', top: 20, right: 24, padding: 9, zIndex: 3 }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}

        <div style={{ position: 'relative', maxWidth: 720 }}>
          <div className="wrap" style={{ marginBottom: 14, gap: 6 }}>
            <span className={`chip-dark ${resource.access === 'free' ? 'chip-dark-accent' : ''}`}>
              {resource.access === 'free' ? 'Free' : resource.access === 'audit' ? 'Free to audit' : 'Paid'}
            </span>
            <span className="chip-dark" style={{ textTransform: 'capitalize' }}>{resource.level}</span>
            <span className="chip-dark">{formatHours(resource.estimatedHours)}</span>
            <span className="chip-dark" style={{ textTransform: 'capitalize' }}>
              {resource.type.replace(/-/g, ' ')}
            </span>
            {resource.projectBased ? <span className="chip-dark chip-dark-gain">Project-based</span> : null}
          </div>

          <h1 className="learn-hero-title" style={{ marginBottom: 10 }}>
            {resource.title}
          </h1>
          <p style={{ color: 'var(--ink-l-2)', fontSize: '0.9375rem' }}>
            {resource.provider}
            {resource.rating ? ` · ${resource.rating.toFixed(1)}★` : ''}
            {resource.ratingCount ? ` (${formatCount(resource.ratingCount)} ratings)` : ''}
          </p>

          {/* ── Actions ── */}
          <div className="wrap detail-actions" style={{ marginTop: 22 }}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent btn-lg"
              onClick={onStart}
            >
              {resource.linkKind === 'search' ? (
                <>
                  <SearchIcon size={15} aria-hidden="true" />
                  Find on {resource.source}
                </>
              ) : (
                <>
                  <Play size={15} aria-hidden="true" />
                  Start learning
                </>
              )}
              <ExternalLink size={13} aria-hidden="true" />
            </a>

            <button type="button" className="btn btn-on-dark btn-lg" onClick={onToggleSave}>
              {saved ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              {saved ? 'In your list' : 'Add to list'}
            </button>

            <button
              type="button"
              className="btn btn-on-dark btn-lg"
              disabled={busy || completed}
              onClick={onComplete}
            >
              {completed ? (
                <>
                  <Check size={15} aria-hidden="true" />
                  Completed
                </>
              ) : busy ? (
                'Recording…'
              ) : (
                'Mark completed'
              )}
            </button>
          </div>

          {notice ? (
            <p role="status" style={{ marginTop: 12, fontSize: '0.8125rem', color: 'var(--accent)' }}>
              {notice}
            </p>
          ) : null}

          {resource.linkKind === 'search' ? (
            <p style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--ink-l-3)', maxWidth: 52 * 8 }}>
              This entry comes from an imported course dataset that does not include direct links,
              so this opens a {resource.source} search for the exact title.
            </p>
          ) : null}
        </div>
      </header>

      {/* ── Why this ── */}
      <div className="learn-pad" style={{ paddingTop: 28 }}>
        {missing.length > 0 ? (
          <div
            className="detail-card"
            style={{ borderColor: 'rgba(255, 104, 69, 0.3)', marginBottom: 16 }}
          >
            <div className="row-tight" style={{ marginBottom: 8 }}>
              <Lock size={15} aria-hidden="true" style={{ color: 'var(--brand)' }} />
              <strong style={{ fontSize: '0.9375rem' }}>Not ready yet</strong>
            </div>
            <p style={{ color: 'var(--ink-l-2)', fontSize: '0.875rem' }}>
              This assumes you already have {missing.map((m) => m.name).join(' and ')}. Close that
              first and it becomes a safe next step.
            </p>
          </div>
        ) : null}

        <div
          className="detail-card"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            borderColor: 'var(--accent)',
            marginBottom: 16,
          }}
        >
          <div className="eyebrow" style={{ color: 'inherit', opacity: 0.6, marginBottom: 10 }}>
            Why this is recommended
          </div>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '70ch' }}>{explanation.why}</p>
        </div>

        {/* ── Tabs ── */}
        <div className="pill-nav" style={{ background: 'var(--surface-l)', marginBottom: 16 }}>
          {(
            [
              ['about', 'About & skills'],
              ['path', 'Your roadmap position'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="pill"
              aria-selected={tab === id}
              role="tab"
              onClick={() => setTab(id)}
              style={{
                color: tab === id ? '#0B0B0C' : 'var(--ink-l-2)',
                background: tab === id ? 'var(--ink-l)' : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'about' ? (
          <div className="detail-grid">
            <div className="stack-md">
              <div className="detail-card">
                <div className="eyebrow" style={{ marginBottom: 10 }}>About</div>
                <p style={{ color: 'var(--ink-l-2)', fontSize: '0.9375rem', lineHeight: 1.65 }}>
                  {resource.description}
                </p>
              </div>

              <div className="detail-card">
                <div className="eyebrow" style={{ marginBottom: 12 }}>What changes for you</div>

                <Group label="You already have" items={alreadyHave.map(skillShortName)} tone="plain" />
                <Group label="You'll gain" items={willGain.map(skillShortName)} tone="gain" />
                <Group label="This unlocks" items={unlocks.map(skillShortName)} tone="plain" />
              </div>
            </div>

            <div className="stack-md">
              <div className="detail-card">
                <div className="eyebrow" style={{ marginBottom: 12 }}>Prerequisites</div>
                {prereqs.length === 0 ? (
                  <p style={{ color: 'var(--ink-l-2)', fontSize: '0.875rem' }}>
                    None, you can start this today.
                  </p>
                ) : (
                  <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
                    {prereqs.map((p) => (
                      <li key={p.id} className="spread" style={{ fontSize: '0.875rem' }}>
                        <span>{p.name}</span>
                        <span style={{ color: p.have ? 'var(--accent)' : 'var(--brand)', fontWeight: 600 }}>
                          {p.have ? '✓' : '✕'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* The ranking, made inspectable. Nobody has to take "AI
                  recommended this" on faith, the terms that produced the
                  score are on screen. */}
              <div className="detail-card">
                <div className="eyebrow" style={{ marginBottom: 4 }}>How this ranked</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-l-3)', marginBottom: 14 }}>
                  Score {Math.round(score.total * 100)} / 100 for your profile.
                </p>
                <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
                  {(
                    [
                      ['Closes your gap', score.skillGap],
                      ['Matches the role', score.careerMatch],
                      ['Near your gap (embedding)', score.gapAffinity],
                      ['Source quality', score.qualityScore],
                      ['Already known (penalty)', score.redundancyPenalty],
                    ] as const
                  ).map(([label, value]) => (
                    <li key={label}>
                      <div className="spread" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--ink-l-2)' }}>{label}</span>
                        <span className="num" style={{ color: 'var(--ink-l-3)' }}>
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255, 255, 255, 0.08)' }}>
                        <i
                          style={{
                            display: 'block',
                            height: '100%',
                            width: `${Math.round(Math.min(1, value) * 100)}%`,
                            borderRadius: 999,
                            background:
                              label === 'Already known (penalty)' ? 'var(--brand)' : 'var(--accent)',
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: '0.6875rem', color: 'var(--ink-l-3)', marginTop: 14 }}>
                  Popularity is not one of the inputs.
                </p>
              </div>

              <div className="detail-card">
                <div className="eyebrow" style={{ marginBottom: 12 }}>Source</div>
                <dl style={{ margin: 0, fontSize: '0.875rem' }}>
                  <Row label="Provider" value={resource.provider} />
                  <Row label="Platform" value={resource.source} />
                  <Row label="Type" value={resource.type.replace(/-/g, ' ')} />
                  <Row label="Access" value={accessLabel(resource.access)} />
                  <Row
                    label="Catalog"
                    value={resource.status === 'curated' ? 'Curated · link verified' : 'Imported dataset'}
                  />
                </dl>
              </div>
            </div>
          </div>
        ) : (
          <div className="detail-card" style={{ maxWidth: 560 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Your roadmap · {analysis.roadmap.timelineMonths} months to {analysis.career.title}
            </div>
            <div className="chain">
              {chain.map((node, i) => (
                <div key={`${node.label}-${i}`}>
                  {i > 0 ? <div className="chain-arrow" aria-hidden="true">↓</div> : null}
                  <div
                    className={`chain-node ${
                      node.state === 'current' ? 'chain-node-current' : node.state === 'done' ? 'chain-node-done' : ''
                    }`}
                  >
                    <span style={{ flex: 1 }}>{node.label}</span>
                    {node.note ? (
                      <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>{node.note}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {milestoneIndex < 0 ? (
              <p style={{ marginTop: 14, fontSize: '0.8125rem', color: 'var(--ink-l-2)' }}>
                This resource is not in your generated roadmap, it is shown here because it matches
                your goal and gaps. Add it to your list to keep track of it.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

interface ChainNode {
  label: string;
  state: 'done' | 'current' | 'upcoming';
  note?: string;
}

/** The roadmap, centred on this resource. */
function buildChain(analysis: Analysis, index: number, resource: LearningResource): ChainNode[] {
  const milestones = analysis.roadmap.milestones;

  if (index < 0) {
    // Not in the plan: show where it would sit relative to the next few steps.
    return [
      { label: 'You are here', state: 'done' },
      { label: resource.title, state: 'current', note: 'this resource' }, ...milestones.slice(0, 3).map((m) => ({ label: m.title, state: 'upcoming' as const })),
      { label: analysis.career.title, state: 'upcoming', note: 'target' },
    ];
  }

  const from = Math.max(0, index - 2);
  const slice = milestones.slice(from, index + 4);

  return [
    ...(from === 0 ? [{ label: 'You are here', state: 'done' as const }] : []), ...slice.map((m, i) => ({
      label: m.title,
      state: from + i === index ? ('current' as const) : from + i < index ? ('done' as const) : ('upcoming' as const),
      note: `Month ${m.month}`,
    })),
    { label: analysis.career.title, state: 'upcoming' as const, note: 'target' },
  ];
}

function Group({ label, items, tone }: { label: string; items: string[]; tone: 'gain' | 'plain' }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--ink-l-3)', marginBottom: 7 }}>{label}</div>
      <div className="wrap" style={{ gap: 6 }}>
        {items.map((item) => (
          <span key={item} className={`chip-dark ${tone === 'gain' ? 'chip-dark-gain' : ''}`}>
            {tone === 'gain' ? `+${item}` : item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-l)' }}>
      <dt style={{ color: 'var(--ink-l-3)' }}>{label}</dt>
      <dd style={{ margin: 0, textTransform: 'capitalize' }}>{value}</dd>
    </div>
  );
}

function accessLabel(access: LearningResource['access']): string {
  return access === 'free' ? 'Free' : access === 'audit' ? 'Free to audit' : 'Paid';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return String(n);
}
