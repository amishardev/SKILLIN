'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/client/session';
import { Card, Chip, Eyebrow, PageSkeleton, ErrorNote } from '@/components/ui/primitives';
import { CAREER_GOALS } from '@/data/careers';
import { deleteOwnedData } from '@/lib/firebase/firestore';
import { deleteAccount, authErrorMessage } from '@/lib/firebase/auth';

const TIMELINES = [3, 6, 9, 12, 18, 24, 36];
const HOURS = [3, 5, 10, 15, 20, 25];

/** Settings: change the plan, export data, delete the account. */
export default function SettingsPage() {
  const router = useRouter();
  const { plan, profile, analysis, user, setPlan, clearSession } = useSession();

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!plan || !profile || !analysis) return <PageSkeleton />;

  async function update(changes: Partial<typeof plan>) {
    await setPlan({ ...plan!, ...changes });
    setSaved(true);
  }

  /** Everything we hold about this user, as a single JSON file. */
  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      plan,
      skills: analysis!.skills,
      roadmap: analysis!.roadmap,
      recommendations: analysis!.recommendations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skillin-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function removeEverything() {
    setError('');
    try {
      if (user) {
        await deleteOwnedData(user.uid);
        await deleteAccount();
      }
      clearSession();
      router.push('/');
    } catch (err) {
      setError(authErrorMessage(err));
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="stack-lg">
      <header className="stack-sm">
        <Eyebrow>Settings</Eyebrow>
        <h1 className="title-xl">Your plan</h1>
        <p className="lede">Change any of this and your roadmap rebuilds immediately.</p>
      </header>

      {saved ? (
        <div className="card card-accent" role="status">
          <p style={{ fontSize: '0.9375rem' }}>Plan updated. Your roadmap has been rebuilt.</p>
        </div>
      ) : null}

      {/* ── Career goal ── */}
      <Card variant="white">
        <Eyebrow>Career goal</Eyebrow>
        <label className="sr-only" htmlFor="career-select">
          Career goal
        </label>
        <select
          id="career-select"
          className="field"
          style={{ marginTop: 12 }}
          value={plan.careerGoalId}
          onChange={(e) => void update({ careerGoalId: e.target.value })}
        >
          {CAREER_GOALS.map((career) => (
            <option key={career.id} value={career.id}>
              {career.title}
            </option>
          ))}
        </select>
        <p className="meta" style={{ marginTop: 10 }}>
          {analysis.career.description}
        </p>
      </Card>

      {/* ── Timeline ── */}
      <Card variant="white">
        <Eyebrow>Timeline</Eyebrow>
        <div className="wrap" style={{ marginTop: 14 }}>
          {TIMELINES.map((months) => (
            <button
              key={months}
              type="button"
              className="pill"
              aria-pressed={plan.timelineMonths === months}
              onClick={() => void update({ timelineMonths: months })}
            >
              {months} months
            </button>
          ))}
        </div>
      </Card>

      {/* ── Weekly hours ── */}
      <Card variant="white">
        <Eyebrow>Weekly hours</Eyebrow>
        <div className="wrap" style={{ marginTop: 14 }}>
          {HOURS.map((hours) => (
            <button
              key={hours}
              type="button"
              className="pill"
              aria-pressed={plan.weeklyHours === hours}
              onClick={() => void update({ weeklyHours: hours })}
            >
              {hours === 25 ? '25+ hrs' : `${hours} hrs`}
            </button>
          ))}
        </div>
        <p className="meta" style={{ marginTop: 14 }}>
          Current budget:{' '}
          <strong>
            {Math.round(plan.timelineMonths * plan.weeklyHours * 4.33).toLocaleString()} hours
          </strong>
          . {analysis.roadmap.uncovered.length > 0
            ? `${analysis.roadmap.uncovered.length} skills don't fit in this.`
            : 'This covers every skill the role needs.'}
        </p>
      </Card>

      {/* ── Start over ── */}
      <Card>
        <Eyebrow>Start over</Eyebrow>
        <p className="body" style={{ margin: '10px 0 14px' }}>
          Upload a different profile and rebuild everything from scratch.
        </p>
        <Link href="/onboarding" className="btn btn-ghost">
          Upload a new profile
        </Link>
      </Card>

      {/* ── Privacy ── */}
      <Card>
        <Eyebrow>Your data</Eyebrow>
        <p className="body" style={{ margin: '10px 0 16px' }}>
          Your profile is stored against your account and is never shown to other users. Your
          uploaded PDF is read in memory to extract text and is not stored.
        </p>
        <div className="wrap">
          <button type="button" className="btn btn-ghost" onClick={exportData}>
            Export my data
          </button>
          <Link href="/privacy" className="btn btn-quiet">
            Privacy notice
          </Link>
        </div>
      </Card>

      {/* ── Danger zone ── */}
      <Card>
        <Eyebrow>Delete everything</Eyebrow>
        <p className="body" style={{ margin: '10px 0 16px' }}>
          This permanently deletes your account, profile, roadmap and progress.
          It cannot be undone.
        </p>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        {confirmingDelete ? (
          <div className="wrap" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-dark" onClick={() => void removeEverything()}>
              Yes, delete permanently
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ borderColor: 'var(--err)', color: 'var(--err)' }}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete my account
          </button>
        )}
      </Card>

      {user ? (
        <p className="meta">
          Signed in as {user.email}
          {analysis.career ? ` · ${plan.timelineMonths} months to ${analysis.career.title}` : ''}
        </p>
      ) : null}
    </div>
  );
}
