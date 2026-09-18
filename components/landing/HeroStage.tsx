'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';

/**
 * Showcase runs of the product, one per kind of learner.
 *
 * Three rather than one, because the reach of the product is the thing the hero
 * has to establish and a single data scientist establishes the opposite.
 *
 * Every card in the stage belongs to one of these, and they rotate together.
 * Rotating the profile alone was worse than not rotating at all: it put an
 * actor and director next to a target of AI Engineer and a next move of Deep
 * Learning, which reads as the product ignoring what it was just told. The
 * whole stage is one worked example, so the whole stage changes at once.
 *
 * The roles, skills and counts are the real ones from the taxonomy: AI Engineer
 * does require 9 skills, Product Manager 11, Filmmaker 6. Illustrations, but
 * not invented ones.
 */
const SCENARIOS = [
  {
    profile: {
      initials: 'AS',
      name: 'Amish Sharma',
      background: 'BS Data Science & AI',
      skills: ['Python', 'Machine Learning', 'NLP'],
    },
    target: { role: 'AI Engineer', note: '9 core skills required' },
    gap: [
      ['Deep Learning', 20],
      ['Transformers', 0],
      ['MLOps', 10],
    ],
    nextMove: { title: 'Deep Learning', note: '4 weeks · +4 skills · prerequisite-safe' },
    pace: { span: '12 months', effort: '10 hrs / week' },
    blocked: { title: 'Advanced Transformers', reason: 'Learn Deep Learning first.' },
  },
  {
    profile: {
      initials: 'AJ',
      name: 'Aditya Johri',
      background: 'Management / Business',
      skills: ['Strategy', 'Marketing', 'Product Management'],
    },
    target: { role: 'Product Manager', note: '11 core skills required' },
    gap: [
      ['Product Analytics', 15],
      ['Market Research', 0],
      ['Agile', 25],
    ],
    nextMove: { title: 'Product Analytics', note: '5 weeks · +3 skills · prerequisite-safe' },
    pace: { span: '9 months', effort: '8 hrs / week' },
    blocked: { title: 'Pricing Strategy', reason: 'Learn Product Analytics first.' },
  },
  {
    profile: {
      initials: 'BK',
      name: 'Bhupesh Kumar',
      background: 'Actor & Director',
      skills: ['Acting', 'Filmmaking', 'Storytelling'],
    },
    target: { role: 'Filmmaker', note: '6 core skills required' },
    gap: [
      ['Screenwriting', 10],
      ['Video Editing', 0],
      ['Sound Design', 20],
    ],
    nextMove: { title: 'Screenwriting', note: '6 weeks · +3 skills · prerequisite-safe' },
    pace: { span: '18 months', effort: '6 hrs / week' },
    blocked: { title: 'Colour Grading', reason: 'Learn Video Editing first.' },
  },
] as const;

type Scenario = (typeof SCENARIOS)[number];

/**
 * How long a profile holds, and how one hands over to the next.
 *
 * The two halves are deliberately asymmetric. A symmetric crossfade leaves both
 * profiles half visible for most of its duration, and since they occupy the same
 * cell the result is two names printed over each other. Letting the old one
 * clear before the new one arrives costs about 20ms of empty card, which nobody
 * sees, and reads as a handover rather than a double exposure.
 */
const HOLD_MS = 3000;
const OUT_S = 0.22;
const IN_S = 0.34;
const IN_DELAY_S = 0.24;
const CYCLE_MS = HOLD_MS + (IN_DELAY_S + IN_S) * 1000;

/**
 * One card's worth of content, crossfading between scenarios.
 *
 * Every scenario is rendered into the same grid cell rather than swapped in and
 * out. Labels of different lengths and chip sets that wrap to different numbers
 * of lines would otherwise resize the card three times per loop, on a hero.
 * Stacking makes the cell as tall as the tallest scenario once, and nothing
 * moves again.
 *
 * The caller passes the active index, so all six cards turn over on the same
 * frame from a single timer rather than six that drift apart.
 */
function Rotate({
  active,
  reduceMotion,
  children,
}: {
  active: number;
  reduceMotion: boolean | null;
  children: (scenario: Scenario) => ReactNode;
}) {
  // With motion suppressed there is nothing to rotate, so only the first is
  // rendered. A hidden copy of the other two would still reach a screen reader.
  const scenarios = reduceMotion ? SCENARIOS.slice(0, 1) : SCENARIOS;

  return (
    <div style={{ display: 'grid' }}>
      {scenarios.map((scenario, index) => {
        const isActive = index === active;
        /*
         * Where an inactive layer waits. The one that just left rests above and
         * the one due next waits below, so the sequence always reads downward
         * instead of every scenario arriving from the same direction.
         */
        const parked = index === (active - 1 + scenarios.length) % scenarios.length ? -6 : 6;

        /*
         * Plain CSS transitions rather than a motion component. These layers
         * only move between two fixed states on a timer, which is what a
         * transition is for, and it avoids adding a second animation system to
         * cards that already carry one for their entrance.
         */
        const ms = (isActive ? IN_S : OUT_S) * 1000;
        const delay = isActive ? IN_DELAY_S * 1000 : 0;
        const eased = `${ms}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}ms`;

        return (
          <div
            key={scenario.profile.name}
            aria-hidden={!isActive}
            style={{
              gridArea: '1 / 1',
              opacity: isActive ? 1 : 0,
              transform: `translateY(${isActive ? 0 : parked}px)`,
              filter: isActive ? 'blur(0px)' : 'blur(1.5px)',
              transition: reduceMotion
                ? undefined
                : `opacity ${eased}, transform ${eased}, filter ${eased}`,
              pointerEvents: isActive ? undefined : 'none',
              willChange: 'opacity, transform',
            }}
          >
            {children(scenario)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The hero's product preview.
 *
 * Deliberately not a stock illustration: it is a composed set of the actual
 * cards the product produces, arranged so the loop reads left to right:
 * current state, target, gap, next move. Someone should understand what
 * SkillIn does without reading a word of body copy.
 *
 * Absolute positioning on desktop, an honest stacked grid below 1080px.
 */
export default function HeroStage() {
  const reduceMotion = useReducedMotion();

  /*
   * One timer for the whole stage. Six independent ones would drift apart
   * within a minute and leave the cards describing different learners, which is
   * the state this rotation exists to avoid.
   */
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setActive((i) => (i + 1) % SCENARIOS.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const rotate = { active, reduceMotion };

  const float = (delay: number, y = 14) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] as const },
        };

  return (
    <div className="lp-stage">
      <div className="lp-stage-flow">
        {/* ── 1. Who you are ── */}
        <motion.div
          className="lp-float lp-card lp-card-cream"
          style={{ top: 0, left: 0, width: 262 }}
          {...float(0.05)}
        >
          <div className="lp-eyebrow" style={{ marginBottom: 12 }}>
            Your profile
          </div>

          <Rotate {...rotate}>
            {({ profile }) => (
              <>
                <div className="row-tight" style={{ marginBottom: 12 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: 999,
                      background: '#17191D',
                      color: '#EFEAD9',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {profile.initials}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{profile.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B675C' }}>{profile.background}</div>
                  </div>
                </div>

                <div className="wrap" style={{ gap: 5 }}>
                  {profile.skills.map((s) => (
                    <span key={s} className="lp-tag">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Rotate>

          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--rule)',
              fontSize: '0.6875rem',
              color: '#6B675C',
            }}
          >
            Read from your LinkedIn PDF
          </div>
        </motion.div>

        {/* ── 2. Where you're going ── */}
        <motion.div
          className="lp-float lp-card"
          style={{ top: 0, right: 0, width: 206 }}
          {...float(0.14)}
        >
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>
            Target
          </div>
          <Rotate {...rotate}>
            {({ target }) => (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
                  {target.role}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-panel-2)', marginTop: 4 }}>
                  {target.note}
                </div>
              </>
            )}
          </Rotate>
        </motion.div>

        {/* ── 3. What's missing ── */}
        <motion.div
          className="lp-float lp-card"
          style={{ top: 196, left: 0, width: 250 }}
          {...float(0.23)}
        >
          <div className="lp-eyebrow" style={{ marginBottom: 10 }}>
            Skill gap
          </div>
          <Rotate {...rotate}>
            {({ gap }) => (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
                {gap.map(([label, pct]) => (
                  <li key={label}>
                    <div className="spread" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                      <span>{label}</span>
                      <span style={{ color: 'var(--on-panel-2)' }} className="num">
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: 'var(--rule-dark)' }}>
                      <i
                        style={{
                          display: 'block',
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: 999,
                          background: 'var(--orange)',
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Rotate>
        </motion.div>

        {/* ── 4. What to do about it ── */}
        <motion.div
          className="lp-float lp-card lp-card-orange"
          style={{ top: 112, right: 0, width: 244 }}
          {...float(0.32)}
        >
          <div className="lp-eyebrow" style={{ marginBottom: 8, opacity: 0.7 }}>
            Your next move
          </div>
          <Rotate {...rotate}>
            {({ nextMove }) => (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.375rem', letterSpacing: '-0.02em' }}>
                  {nextMove.title}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: 6 }}>
                  {nextMove.note}
                </div>
              </>
            )}
          </Rotate>
          <div
            className="row-tight"
            style={{ marginTop: 12, fontSize: '0.8125rem', fontWeight: 600 }}
          >
            Start learning
            <ArrowRight size={14} aria-hidden="true" />
          </div>
        </motion.div>

        {/* ── 5. Pace ── */}
        <motion.div
          className="lp-float lp-card lp-card-accent"
          style={{ top: 302, right: 16, width: 186 }}
          {...float(0.41)}
        >
          <div className="lp-eyebrow" style={{ marginBottom: 6, opacity: 0.6 }}>
            Your pace
          </div>
          <Rotate {...rotate}>
            {({ pace }) => (
              <>
                <div
                  className="num"
                  style={{ fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em' }}
                >
                  {pace.span}
                </div>
                <div className="num" style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                  {pace.effort}
                </div>
              </>
            )}
          </Rotate>
        </motion.div>

        {/* ── 6. The guarantee that defines the product ── */}
        <motion.div
          className="lp-float lp-card"
          style={{ bottom: 0, left: 18, width: 232 }}
          {...float(0.5)}
        >
          <div className="row-tight" style={{ marginBottom: 6 }}>
            <Lock size={12} aria-hidden="true" style={{ color: 'var(--on-panel-2)' }} />
            <span className="lp-eyebrow">Blocked</span>
          </div>
          <Rotate {...rotate}>
            {({ blocked }) => (
              <>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{blocked.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-panel-2)', marginTop: 4 }}>
                  {blocked.reason}
                </div>
              </>
            )}
          </Rotate>
        </motion.div>
      </div>
    </div>
  );
}
