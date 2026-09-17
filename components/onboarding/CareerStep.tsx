'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { CAREER_CATEGORIES, CAREER_GOALS, type CareerGoal } from '@/data/careers';
import { skillName, skillShortName } from '@/data/skills';
import { Chip } from '@/components/ui/primitives';
import OnboardingContinue from './OnboardingContinue';

/**
 * Career explorer: searchable, grouped by field, with each role's real skill
 * requirements visible before the learner commits to it.
 */
export default function CareerStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: string | null;
  onSelect: (careerId: string) => void;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAREER_GOALS.filter((career) => {
      if (category !== 'all' && career.category !== category) return false;
      if (!q) return true;
      if (career.title.toLowerCase().includes(q)) return true;
      if (career.description.toLowerCase().includes(q)) return true;
      return career.skills.some((s) => skillName(s.skillId).toLowerCase().includes(q));
    });
  }, [query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, CareerGoal[]>();
    for (const career of results) {
      const list = map.get(career.category) ?? [];
      list.push(career);
      map.set(career.category, list);
    }
    return map;
  }, [results]);

  return (
    <div className="stack-lg onb-step" style={{ width: '100%', maxWidth: 900 }}>
      <div className="stack-sm">
        <h1 className="title-xl">What do you want to become?</h1>
        <p className="lede">
          Pick the role you&apos;re aiming at. Everything after this, your gaps, your
          roadmap, your projects, is measured against it.
        </p>
      </div>

      {/* ── Search ── */}
      <div className="row" style={{ position: 'relative' }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{ position: 'absolute', left: 14, color: 'var(--ink-3)', pointerEvents: 'none' }}
        />
        <input
          className="field"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roles or skills, try “transformers” or “security”"
          aria-label="Search career goals"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {/* ── Category filter ── */}
      <div className="wrap chip-row" role="tablist" aria-label="Career fields">
        <button
          type="button"
          role="tab"
          className="pill"
          aria-selected={category === 'all'}
          onClick={() => setCategory('all')}
        >
          All fields
        </button>
        {CAREER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            className="pill"
            aria-selected={category === cat.id}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Results ── */}
      {results.length === 0 ? (
        <div className="card">
          <p className="body">
            No roles match “{query}”. Try a broader term, or browse by field above.
          </p>
        </div>
      ) : (
        <div className="stack-lg">
          {CAREER_CATEGORIES.filter((cat) => grouped.has(cat.id)).map((cat) => (
            <section key={cat.id} className="stack-md">
              <h2 className="eyebrow">{cat.label}</h2>
              <div className="grid-2">
                {grouped.get(cat.id)!.map((career) => (
                  <CareerCard
                    key={career.id}
                    career={career}
                    selected={selected === career.id}
                    onSelect={() => onSelect(career.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <OnboardingContinue
        visible={Boolean(selected)}
        hint="Your goal"
        label={`Continue with ${CAREER_GOALS.find((c) => c.id === selected)?.title ?? ''}`}
        onClick={onContinue}
      />
    </div>
  );
}

function CareerCard({
  career,
  selected,
  onSelect,
}: {
  career: CareerGoal;
  selected: boolean;
  onSelect: () => void;
}) {
  const headline = career.skills.filter((s) => s.required).slice(0, 5);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      whileTap={{ scale: 0.99 }}
      className="card card-hover"
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        border: selected ? '2px solid var(--ink)' : '2px solid transparent',
        background: selected ? 'var(--card-alt)' : 'var(--card)',
        width: '100%',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 className="title-sm">{career.title}</h3>
        {career.demand === 'extreme' ? <Chip tone="accent">In demand</Chip> : null}
      </div>
      <p className="body" style={{ marginBottom: 14, fontSize: '0.875rem' }}>
        {career.description}
      </p>
      <div className="wrap" style={{ marginBottom: 12 }}>
        {headline.map((s) => (
          <Chip key={s.skillId} title={skillName(s.skillId)}>{skillShortName(s.skillId)}</Chip>
        ))}
        {career.skills.length > headline.length ? (
          <Chip>+{career.skills.length - headline.length} more</Chip>
        ) : null}
      </div>
      <div className="meta">Typically {career.typicalRamp} of focused study</div>
    </motion.button>
  );
}
