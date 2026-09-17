'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Play, Plus, Check, Info } from 'lucide-react';
import { useSession } from '@/lib/client/session';
import { PageSkeleton, EmptyState, formatHours } from '@/components/ui/primitives';
import CourseRail from '@/components/learn/CourseRail';
import CourseCard from '@/components/learn/CourseCard';
import LazyRail from '@/components/learn/LazyRail';
import GeneratedArt from '@/components/learn/GeneratedArt';
import { buildRails, featuredResource } from '@/lib/catalog/rails';
import { searchCatalog, catalogProviders, coverTheme, type CatalogFilters } from '@/lib/catalog';
import { checkReadiness } from '@/lib/recommendation/prerequisites';
import { skillName } from '@/data/skills';
import { SKILL_CONFIRMED_THRESHOLD } from '@/types';
import type { LearningResource, ResourceLevel, ResourceType } from '@/data/resources';
import type { ScoringContext } from '@/lib/recommendation/engine';

/**
 * The Learn catalog.
 *
 * Dark and immersive by design, browsing is a different mode from reviewing
 * your own progress, so it gets a different personality from the dashboard.
 *
 * Every row is generated from the learner's profile, goal, gaps and history.
 * There is no "trending overall" row: popularity is not an input anywhere.
 */
export default function LearnPage() {
  const router = useRouter();
  const { analysis, profile, plan, progress, savedIds, toggleSaved } = useSession();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>({ freeOnly: false, level: 'all', type: 'all' });

  const context = useMemo<ScoringContext | null>(() => {
    if (!analysis || !profile) return null;
    return {
      vector: analysis.vector,
      career: analysis.career,
      projectSkills: profile.projects.flatMap((p) => p.technologies),
      experienceSkills: profile.experience.flatMap((e) => e.technologies),
      academicSkills: [],
      certificateSkills: profile.certificates.flatMap((c) => c.skills),
      completedResourceIds: progress?.resourcesCompleted ?? [],
    };
  }, [analysis, profile, progress]);

  const rails = useMemo(() => {
    if (!analysis || !context) return [];
    return buildRails({
      context,
      career: analysis.career,
      skills: analysis.skills,
      gaps: analysis.gaps,
      vector: analysis.vector,
      progress: progress ?? undefined,
      savedIds,
    });
  }, [analysis, context, progress, savedIds]);

  const hero = useMemo(() => {
    if (!analysis || !context) return null;
    return featuredResource({
      context,
      career: analysis.career,
      skills: analysis.skills,
      gaps: analysis.gaps,
      vector: analysis.vector,
      progress: progress ?? undefined,
    });
  }, [analysis, context, progress]);

  const results = useMemo(() => {
    const q = deferredQuery.trim();
    const hasFilter =
      filters.freeOnly || (filters.level && filters.level !== 'all') || (filters.type && filters.type !== 'all');
    if (!q && !hasFilter) return null;
    // Cap the rendered result set; the catalog is ~2,400 items and nobody
    // scrolls past a few dozen.
    return searchCatalog(q, filters).slice(0, 60);
  }, [deferredQuery, filters]);

  const open = useCallback(
    (resource: LearningResource) => router.push(`/app/learn/${resource.id}`),
    [router]);

  const gainsFor = useCallback(
    (r: LearningResource) =>
      analysis ? r.skills.filter((s) => (analysis.vector.get(s) ?? 0) < SKILL_CONFIRMED_THRESHOLD) : [],
    [analysis]);

  const blockedFor = useCallback(
    (r: LearningResource) => {
      if (!analysis) return undefined;
      const readiness = checkReadiness(r.prerequisites, analysis.vector);
      return readiness.ready ? undefined : readiness.missingNames;
    },
    [analysis]);

  const progressFor = useCallback(
    (r: LearningResource) => {
      if (progress?.resourcesCompleted.includes(r.id)) return 1;
      if (progress?.resourcesStarted.includes(r.id)) return 0.35;
      return undefined;
    },
    [progress]);

  if (!analysis || !plan) return <PageSkeleton />;

  const heroGains = hero ? gainsFor(hero) : [];
  const heroTheme = hero ? coverTheme(hero) : null;

  return (
    <div className="learn">
      {/* ── Search bar ── */}
      <div className="learn-bar">
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 520 }}>
          <Search
            size={16}
            aria-hidden="true"
            style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-l-3)' }}
          />
          <input
            className="field-dark"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, skills or careers…"
            aria-label="Search the learning catalog"
          />
        </div>

        <button
          type="button"
          className="btn btn-on-dark"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
        </button>

        {results ? (
          <span style={{ fontSize: '0.8125rem', color: 'var(--ink-l-2)' }}>
            {results.length === 60 ? '60+' : results.length} result{results.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {/* ── Filter panel ── */}
      {showFilters ? (
        <div className="learn-pad" style={{ paddingBottom: 18 }}>
          <div className="detail-card">
            <div className="wrap" style={{ gap: 14, alignItems: 'center' }}>
              <Select
                label="Level"
                value={filters.level ?? 'all'}
                options={['all', 'beginner', 'intermediate', 'advanced']}
                onChange={(v) => setFilters((f) => ({ ...f, level: v as ResourceLevel | 'all' }))}
              />
              <Select
                label="Type"
                value={filters.type ?? 'all'}
                options={['all', 'course', 'documentation', 'book', 'playlist', 'lecture-series', 'tutorial', 'practice', 'project']}
                onChange={(v) => setFilters((f) => ({ ...f, type: v as ResourceType | 'all' }))}
              />
              <Select
                label="Provider"
                value={String(filters.provider ?? 'all')}
                options={['all', ...catalogProviders(14)]}
                onChange={(v) => setFilters((f) => ({ ...f, provider: v }))}
              />
              <Select
                label="Max hours"
                value={String(filters.maxHours ?? 'all')}
                options={['all', '5', '20', '50', '100']}
                onChange={(v) =>
                  setFilters((f) => ({ ...f, maxHours: v === 'all' ? 'all' : Number(v) }))
                }
              />
              <label className="row-tight" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(filters.freeOnly)}
                  onChange={(e) => setFilters((f) => ({ ...f, freeOnly: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Free only
              </label>
              <button
                type="button"
                className="btn btn-on-dark"
                style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
                onClick={() => setFilters({ freeOnly: false, level: 'all', type: 'all' })}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Search results, or the personalised catalog ── */}
      {results ? (
        <div className="learn-pad">
          {results.length === 0 ? (
            <div style={{ maxWidth: 460, marginTop: 40 }}>
              <h2 className="rail-title" style={{ marginBottom: 8 }}>
                Nothing matched
              </h2>
              <p className="rail-reason">
                No resource matches “{query}” with these filters. Try a broader term, or reset the
                filters.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 16,
                paddingTop: 8,
              }}
            >
              {results.map((resource, i) => (
                <CourseCard
                  key={resource.id}
                  resource={resource}
                  blockedBy={blockedFor(resource)}
                  progress={progressFor(resource)}
                  onOpen={open}
                  eager={i < 8}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Featured hero ── */}
          {hero && heroTheme ? (
            <header
              className="learn-hero"
              style={{ background: `linear-gradient(145deg, ${heroTheme.from}, ${heroTheme.to})` }}
            >
              {hero.thumbnail ? (
                <div
                  className="learn-hero-bg"
                  style={{ backgroundImage: `url(${hero.thumbnail})` }}
                  aria-hidden="true"
                />
              ) : (
                <div className="learn-hero-bg">
                  <GeneratedArt seedId={hero.id} glyph={heroTheme.glyph} scale="hero" />
                </div>
              )}
              <div className="learn-hero-scrim" aria-hidden="true" />

              <div style={{ position: 'relative', maxWidth: 640 }}>
                <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 14 }}>
                  Your next move
                </div>
                <h1 className="learn-hero-title" style={{ marginBottom: 14 }}>
                  {hero.title}
                </h1>

                <div className="wrap" style={{ marginBottom: 16, gap: 6 }}>
                  <span className="chip-dark">{hero.provider}</span>
                  <span className="chip-dark" style={{ textTransform: 'capitalize' }}>{hero.level}</span>
                  <span className="chip-dark">{formatHours(hero.estimatedHours)}</span>
                  {hero.access === 'free' ? (
                    <span className="chip-dark chip-dark-accent">Free</span>
                  ) : null}
                  {heroGains.length > 0 ? (
                    <span className="chip-dark chip-dark-gain">+{heroGains.length} skills</span>
                  ) : null}
                </div>

                <p style={{ color: 'var(--ink-l-2)', fontSize: '0.9375rem', maxWidth: '58ch', marginBottom: 20 }}>
                  {heroGains.length > 0
                    ? `Closes your ${heroGains.slice(0, 3).map(skillName).join(', ')} gap for ${analysis.career.title}.`
                    : hero.description}
                </p>

                <div className="wrap">
                  <a
                    href={hero.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent btn-lg"
                  >
                    <Play size={15} aria-hidden="true" />
                    Start learning
                  </a>
                  <button
                    type="button"
                    className="btn btn-on-dark btn-lg"
                    onClick={() => void toggleSaved(hero.id)}
                  >
                    {savedIds.includes(hero.id) ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Plus size={15} aria-hidden="true" />
                    )}
                    {savedIds.includes(hero.id) ? 'In your list' : 'Add to list'}
                  </button>
                  <button type="button" className="btn btn-on-dark btn-lg" onClick={() => open(hero)}>
                    <Info size={15} aria-hidden="true" />
                    More info
                  </button>
                </div>
              </div>
            </header>
          ) : null}

          {/* ── Rails ── */}
          <div style={{ paddingTop: hero ? 26 : 8 }}>
            {rails.length === 0 ? (
              <div className="learn-pad">
                <EmptyState
                  title="Nothing to show yet"
                  body="Confirm your profile and pick a career goal, and this catalog will rebuild around them."
                />
              </div>
            ) : (
              rails.map((rail, i) => (
                <LazyRail key={rail.id} eager={i < 2}>
                  <CourseRail
                    rail={rail}
                    blockedFor={rail.locked ? blockedFor : undefined}
                    progressFor={progressFor}
                    onOpen={open}
                    eager={i === 0}
                  />
                </LazyRail>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `f-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <div className="row-tight">
      <label htmlFor={id} style={{ fontSize: '0.75rem', color: 'var(--ink-l-3)' }}>
        {label}
      </label>
      <select id={id} className="select-dark" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'all' ? 'Any' : o.replace(/-/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
