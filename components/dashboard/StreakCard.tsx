'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSession } from '@/lib/client/session';
import { useIsClient } from '@/lib/client/use-is-client';
import {
  projectStreak,
  streakMessage,
  weekStrip,
  type WeekDay,
} from '@/lib/streak/engine';

/**
 * Learning streak, as one line.
 *
 * Reads only. The number shown is whatever the server last returned, projected
 * onto today so a stale streak is never displayed as current. Nothing here can
 * increment it, that only happens when the server accepts a qualifying
 * activity.
 *
 * It used to be a tall card with its own headline number and a paragraph. A
 * streak is one figure, so it is now a strip: flame, count, week. The full
 * message moved to the tooltip and to the Activity page, where there is room
 * for it.
 */
export default function StreakCard() {
  const { streak, user, timezone } = useSession();
  const reduceMotion = useReducedMotion();
  // The strip depends on the viewer's clock and timezone, neither of which the
  // server knows, so it is computed only once we are running in the browser.
  const isClient = useIsClient();

  const projected = streak ? projectStreak(streak, new Date()) : null;

  // Depends directly on session state rather than an intermediate, so the
  // memo's inputs are values React can track.
  const week = useMemo<WeekDay[]>(() => {
    if (!isClient) return [];
    const last = streak?.lastActivityDate;
    return weekStrip(last ? [last] : [], new Date(), timezone);
  }, [isClient, streak, timezone]);

  if (!user) {
    return (
      <div
        className="card card-dark streak-strip"
        title="Streaks need an account, so your progress is recorded on the server rather than in this browser."
      >
        <span className="streak-flame streak-flame-off" aria-hidden="true">
          🔥
        </span>
        <div className="streak-figure">
          <span className="streak-count">Off</span>
          <span className="eyebrow">Streak</span>
        </div>
        <p className="meta streak-note">Sign in to track it.</p>
      </div>
    );
  }

  const days = projected?.currentStreak ?? 0;
  const status = projected?.status ?? 'new';

  return (
    <div className="card card-dark streak-strip" title={streakMessage(status)}>
      <span
        className={`streak-flame ${status === 'active' ? '' : 'streak-flame-off'}`.trim()}
        aria-hidden="true"
      >
        🔥
      </span>

      <div className="streak-figure">
        <motion.span
          key={days}
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="streak-count num"
        >
          {days}
        </motion.span>
        <span className="eyebrow">{days === 1 ? 'Day streak' : 'Day streak'}</span>
      </div>

      {status === 'at_risk' ? <span className="chip chip-warn">At risk</span> : null}

      <ul className="streak-week" aria-label="This week's activity">
        {week.map((day) => (
          <li key={day.date}>
            <span
              aria-hidden="true"
              className="streak-dot"
              style={{
                background:
                  day.state === 'filled' ? 'var(--accent)'
                  : day.state === 'current' ? 'transparent'
                  : '#ffffff12',
                border: day.state === 'current' ? '1.5px dashed var(--accent)' : 'none',
              }}
            />
            <span className="sr-only">
              {day.day}: {day.state === 'filled' ? 'completed' : day.state === 'current' ? 'today, not yet' : 'no activity'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
