'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';

/**
 * The hero's product preview.
 *
 * Deliberately not a stock illustration: it is a composed set of the actual
 * cards the product produces, arranged so the loop reads left to right, * current state → target → gap → next move. Someone should understand what
 * SkillIn does without reading a word of body copy.
 *
 * Absolute positioning on desktop, an honest stacked grid below 1080px.
 */
export default function HeroStage() {
  const reduceMotion = useReducedMotion();

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

          <div className="row-tight" style={{ marginBottom: 12 }}>
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 38,
                height: 38,
                borderRadius: 999,
                background: '#17191D',
                color: '#EFEAD9',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              AS
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Amish Sharma</div>
              <div style={{ fontSize: '0.75rem', color: '#6B675C' }}>BS Data Science &amp; AI</div>
            </div>
          </div>

          <div className="wrap" style={{ gap: 5 }}>
            {['Python', 'Machine Learning', 'NLP'].map((s) => (
              <span key={s} className="lp-tag">
                {s}
              </span>
            ))}
          </div>

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
          <div style={{ fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
            AI Engineer
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-panel-2)', marginTop: 4 }}>
            9 core skills required
          </div>
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
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
            {[
              ['Deep Learning', 20],
              ['Transformers', 0],
              ['MLOps', 10],
            ].map(([label, pct]) => (
              <li key={label as string}>
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
          <div style={{ fontWeight: 600, fontSize: '1.375rem', letterSpacing: '-0.02em' }}>
            Deep Learning
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: 6 }}>
            4 weeks · +4 skills · prerequisite-safe
          </div>
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
          <div className="num" style={{ fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            12 months
          </div>
          <div className="num" style={{ fontSize: '0.75rem', opacity: 0.75 }}>
            10 hrs / week
          </div>
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
          <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Advanced Transformers</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-panel-2)', marginTop: 4 }}>
            Learn Deep Learning first.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
