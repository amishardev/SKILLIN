'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp } from 'lucide-react';
import CategoryFilter from '@/components/career/CategoryFilter';
import {
  CAREER_CATEGORIES, CAREER_GOALS,
  type CareerGoal, type CareerCategoryId, type CareerGroupId,
} from '@/data/careers';
import { skillName, skillShortName } from '@/data/skills';
import { Chip } from '@/components/ui/primitives';
import OnboardingContinue from './OnboardingContinue';
import { roleSalary } from '@/data/salaries';

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
  const [group, setGroup] = useState<CareerGroupId | 'all'>('all');
  const [category, setCategory] = useState<CareerCategoryId | 'all'>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inGroup = new Set(
      CAREER_CATEGORIES.filter((x) => group === 'all' || x.group === group).map((x) => x.id),
    );
    return CAREER_GOALS.filter((career) => {
      if (!inGroup.has(career.category)) return false;
      if (category !== 'all' && career.category !== category) return false;
      if (!q) return true;
      if (career.title.toLowerCase().includes(q)) return true;
      if (career.description.toLowerCase().includes(q)) return true;
      return career.skills.some((s) => skillName(s.skillId).toLowerCase().includes(q));
    });
  }, [query, category, group]);

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
      <CategoryFilter
        group={group}
        category={category}
        onGroup={setGroup}
        onCategory={setCategory}
      />

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
  const salary = roleSalary(career.id);

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

      {/*
        Salary appears here and nowhere else in the product. It is context for
        choosing a goal, not a number worth staring at afterwards, and a figure
        repeated on every screen quietly becomes a promise.

        Only roles with a verified source show anything. The other 35 show
        nothing at all rather than a placeholder.

        Two numbers, deliberately, and the order is the point. The figure worth
        aiming at leads, because someone choosing a career should be looking at
        what the work can pay rather than at the midpoint of today's job ads.

        It is phrased as a target and not as a report. It carries a flat SkillIn
        adjustment, so it is nobody's published figure and is never attributed
        to one. The sourced average follows, named, because a publisher's name
        may only ever sit beside the number that publisher actually gave.
      */}
      {salary ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="row-tight" style={{ alignItems: 'baseline', gap: 7 }}>
            <TrendingUp size={15} strokeWidth={2.2} aria-hidden="true" />
            <span style={{ fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-0.02em' }}>
              {'₹'}{salary.displayLpa.toFixed(1)} LPA
            </span>
            <span className="meta" style={{ fontWeight: 500 }}>to aim for</span>
          </div>
          <div className="meta" style={{ marginTop: 2 }}>
            {salary.source} puts the average today at {'₹'}{salary.averageLpa} LPA
          </div>
        </div>
      ) : null}

      {career.credential ? (
        <div className="meta" style={{ marginTop: 6, color: 'var(--warn)' }}>
          {career.credential}
        </div>
      ) : null}
    </motion.button>
  );
}
