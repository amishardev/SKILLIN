'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { WEEKS_PER_MONTH } from '@/lib/roadmap/planner';
import OnboardingContinue from './OnboardingContinue';

const TIMELINE_OPTIONS = [3, 6, 9, 12, 18, 24, 36] as const;
const HOURS_OPTIONS = [3, 5, 10, 15, 20, 25] as const;

/**
 * Timeline and weekly hours.
 *
 * Both genuinely drive the plan, the roadmap planner multiplies them into an
 * hour budget and refuses to schedule beyond it, so the total shown here is the
 * real constraint, not decoration.
 */
export default function PaceStep({
  months,
  weeklyHours,
  onMonths,
  onWeeklyHours,
  onBuild,
}: {
  months: number;
  weeklyHours: number;
  onMonths: (value: number) => void;
  onWeeklyHours: (value: number) => void;
  onBuild: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [customHours, setCustomHours] = useState('');

  const totalHours = Math.round(months * weeklyHours * WEEKS_PER_MONTH);

  return (
    <div className="stack-lg onb-step" style={{ width: '100%', maxWidth: 640 }}>
      {/* ── Timeline ── */}
      <section className="stack-lg">
        <div className="stack-sm">
          <h1 className="title-xl">How long do you want to give yourself?</h1>
          <p className="lede">Be realistic. A plan you can keep beats a plan that looks fast.</p>
        </div>

        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <motion.div
            key={months}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="display num"
            style={{ lineHeight: 1 }}
          >
            {months}
          </motion.div>
          <div className="eyebrow" style={{ marginTop: 10 }}>
            {months === 1 ? 'Month' : 'Months'}
          </div>
        </div>

        <div>
          <label className="sr-only" htmlFor="timeline-slider">
            Timeline in months
          </label>
          <input
            id="timeline-slider"
            type="range"
            min={0}
            max={TIMELINE_OPTIONS.length - 1}
            step={1}
            value={TIMELINE_OPTIONS.indexOf(months as (typeof TIMELINE_OPTIONS)[number])}
            onChange={(e) => onMonths(TIMELINE_OPTIONS[Number(e.target.value)])}
            aria-valuetext={`${months} months`}
            className="range"
          />
          <div className="spread" style={{ marginTop: 8 }}>
            {TIMELINE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onMonths(option)}
                className="meta"
                aria-pressed={months === option}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontWeight: months === option ? 700 : 400,
                  color: months === option ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Weekly hours ── */}
      <section className="stack-md">
        <div className="stack-sm">
          <h2 className="title-lg">How much time can you realistically learn each week?</h2>
          <p className="body">We&apos;ll shape your weekly schedule around this exact number.</p>
        </div>

        <div className="wrap">
          {HOURS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="pill"
              aria-pressed={weeklyHours === option}
              onClick={() => {
                onWeeklyHours(option);
                setCustomHours('');
              }}
              style={{ padding: '10px 20px', fontSize: '0.9375rem' }}
            >
              {option === 25 ? '25+ hrs' : `${option} hrs`}
            </button>
          ))}
        </div>

        <div className="row">
          <label className="label" htmlFor="custom-hours" style={{ margin: 0, whiteSpace: 'nowrap' }}>
            Or set your own
          </label>
          <input
            id="custom-hours"
            className="field"
            type="number"
            min={1}
            max={60}
            value={customHours}
            placeholder="hrs / week"
            style={{ maxWidth: 150 }}
            onChange={(e) => {
              setCustomHours(e.target.value);
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
                onWeeklyHours(Math.round(parsed));
              }
            }}
          />
        </div>
      </section>

      {/* ── The real budget ── */}
      <div className="card card-dark">
        <div className="spread" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="stack-sm">
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>
              Your budget
            </div>
            <div className="title-md num">
              {totalHours.toLocaleString()} hours of learning
            </div>
          </div>
          <div className="meta" style={{ color: 'var(--on-dark-2)', maxWidth: 280 }}>
            {months} months × {weeklyHours} hrs/week. We won&apos;t plan beyond this, and
            we&apos;ll tell you what it can&apos;t cover.
          </div>
        </div>
      </div>

      <OnboardingContinue
        hint={`${months} months at ${weeklyHours} hrs/week`}
        label="Build my path"
        onClick={onBuild}
      />
    </div>
  );
}
