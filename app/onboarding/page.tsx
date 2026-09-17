'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSession } from '@/lib/client/session';
import UploadStep, { type ExtractionMeta } from '@/components/onboarding/UploadStep';
import AnalysisStep from '@/components/onboarding/AnalysisStep';
import ReviewStep from '@/components/onboarding/ReviewStep';
import CareerStep from '@/components/onboarding/CareerStep';
import PaceStep from '@/components/onboarding/PaceStep';
import type { StudentProfile } from '@/types';
import { LogoLockup } from '@/components/brand/Logo';

/**
 * The onboarding flow, in the exact order the product requires:
 *
 *   upload → analysis → review → transition → career → pace → building → done
 *
 * Nothing is asked of the learner before the PDF is read. College, branch,
 * skills and projects are only ever *confirmed*, never typed from scratch.
 */

type Stage =
  | 'upload'
  | 'analysing'
  | 'review'
  | 'transition'
  | 'career'
  | 'pace'
  | 'building'
  | 'done';

const PROFILE_STEPS = [
  'Reading your profile',
  'Extracting education and experience',
  'Finding projects and evidence',
  'Normalising skills',
  'Scoring what you can demonstrate',
];

const PATH_STEPS = [
  'Understanding your profile',
  'Mapping your skills',
  'Finding your skill gaps',
  'Checking prerequisites',
  'Matching learning resources',
  'Planning projects',
  'Building your timeline',
];

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { ready, user, profile, plan, setProfile, setPlan } = useSession();

  /*
   * Onboarding writes a profile, and a profile belongs to an account. Without
   * one there is nowhere to put the result, so this sends you to sign in first
   * rather than letting you do the work twice.
   */
  useEffect(() => {
    if (ready && !user) router.replace('/auth/login');
  }, [ready, user, router]);

  const [stage, setStage] = useState<Stage>('upload');
  const [draft, setDraft] = useState<StudentProfile | null>(null);
  const [meta, setMeta] = useState<ExtractionMeta | null>(null);
  const [careerId, setCareerId] = useState<string | null>(null);
  const [months, setMonths] = useState(12);
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [busy, setBusy] = useState(false);
  const [resumed, setResumed] = useState(false);

  /*
   * Resume where Firestore says you stopped.
   *
   * There is no separate "current step" field to keep in sync, because the
   * documents already say it: a stored profile means the CV is read and
   * confirmed, a stored plan means the goal and pace are chosen. Deriving the
   * step from the data cannot drift from the data, and it works on a second
   * device with no extra writes.
   */
  useEffect(() => {
    if (!ready || !user || resumed) return;
    setResumed(true);

    if (profile && plan) {
      router.replace('/app');
      return;
    }
    if (profile) {
      setDraft(profile);
      setStage('career');
    }
  }, [ready, user, profile, plan, resumed, router]);

  const handleExtracted = useCallback((profile: StudentProfile, extractionMeta: ExtractionMeta) => {
    setDraft(profile);
    setMeta(extractionMeta);
    setStage('analysing');
  }, []);

  const commit = useCallback(async () => {
    if (!draft || !careerId) return;
    // The profile is already stored from the review step; this writes it again
    // only if edits happened after it, which is cheap and keeps them.
    await setProfile(draft);
    await setPlan({ careerGoalId: careerId, timelineMonths: months, weeklyHours });
    router.push('/app');
  }, [draft, careerId, months, weeklyHours, setProfile, setPlan, router]);

  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] as const },
      };

  return (
    <div className="shell" style={{ flexDirection: 'column' }}>
      <header
        className="spread"
        style={{ padding: '22px 40px', borderBottom: '1px solid var(--line)' }}
      >
        <Link href="/" aria-label="SkillIn by Amish Sharma, home">
          <LogoLockup size={30} byline={false} />
        </Link>
        <ProgressTrail stage={stage} />
      </header>

      <main
        className="shell-main"
        style={{ display: 'flex', justifyContent: 'center', paddingTop: 52 }}
        id="main"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            {...fade}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            {stage === 'upload' ? (
              <UploadStep onExtracted={handleExtracted} onBusyChange={setBusy} />
            ) : null}

            {stage === 'analysing' ? (
              <AnalysisStep
                steps={PROFILE_STEPS}
                headline="Reading your profile…"
                doneLabel="Here's what we found."
                onDone={() => setStage('review')}
              />
            ) : null}

            {stage === 'review' && draft ? (
              <ReviewStep
                profile={draft}
                meta={meta}
                onChange={setDraft}
                onConfirm={async () => {
                  // Saved here rather than at the end, so closing the tab after
                  // confirming your profile does not lose it.
                  await setProfile(draft);
                  setStage('transition');
                }}
              />
            ) : null}

            {stage === 'transition' ? (
              <Transition onDone={() => setStage('career')} />
            ) : null}

            {stage === 'career' ? (
              <CareerStep
                selected={careerId}
                onSelect={setCareerId}
                onContinue={() => setStage('pace')}
              />
            ) : null}

            {stage === 'pace' ? (
              <PaceStep
                months={months}
                weeklyHours={weeklyHours}
                onMonths={setMonths}
                onWeeklyHours={setWeeklyHours}
                onBuild={() => setStage('building')}
              />
            ) : null}

            {stage === 'building' ? (
              <AnalysisStep
                steps={PATH_STEPS}
                headline="Finding the shortest path between where you are and where you're going…"
                doneLabel="Your path is ready."
                onDone={() => {
                  setStage('done');
                  void commit();
                }}
              />
            ) : null}

            {stage === 'done' ? (
              <div className="stack-md" style={{ textAlign: 'center', maxWidth: 420 }}>
                <h1 className="title-xl">Your path is ready.</h1>
                <p className="lede">Taking you to your dashboard…</p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {busy ? <span className="sr-only" role="status">Reading your profile</span> : null}
    </div>
  );
}

/** Full-screen beat between "where you are" and "where you're going". */
function Transition({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="stack-lg"
      style={{ maxWidth: 560, textAlign: 'center', paddingTop: 40 }}
      onAnimationComplete={onDone}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 2.1 }}
    >
      <motion.h1
        className="title-xl"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        You&apos;ve shown us where you are.
      </motion.h1>
      <motion.p
        className="display"
        style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        Now tell us where you want to go.
      </motion.p>
      <button type="button" className="btn btn-ghost" onClick={onDone}>
        Continue
      </button>
    </motion.div>
  );
}

const TRAIL: { stage: Stage; label: string }[] = [
  { stage: 'upload', label: 'Profile' },
  { stage: 'review', label: 'Review' },
  { stage: 'career', label: 'Goal' },
  { stage: 'pace', label: 'Pace' },
];

function ProgressTrail({ stage }: { stage: Stage }) {
  const order: Stage[] = [
    'upload', 'analysing', 'review', 'transition', 'career', 'pace', 'building', 'done',
  ];
  const current = order.indexOf(stage);

  return (
    <ol
      className="row"
      style={{ listStyle: 'none', margin: 0, padding: 0, gap: 20 }}
      aria-label="Onboarding progress"
    >
      {TRAIL.map((item) => {
        const index = order.indexOf(item.stage);
        const state = current > index ? 'done' : current >= index ? 'current' : 'upcoming';
        return (
          <li
            key={item.stage}
            aria-current={state === 'current' ? 'step' : undefined}
            className="row-tight"
            style={{
              fontSize: '0.8125rem',
              fontWeight: state === 'current' ? 600 : 400,
              color: state === 'upcoming' ? 'var(--ink-3)' : 'var(--ink)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background:
                  state === 'done' ? 'var(--ink)'
                  : state === 'current' ? 'var(--accent)'
                  : 'var(--line-strong)',
              }}
            />
            <span className="trail-label">{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
