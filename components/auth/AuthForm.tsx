'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/client/session';
import { isInAppBrowser } from '@/lib/client/diagnostics';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  resetPassword,
  authErrorMessage,
} from '@/lib/firebase/auth';
import { ErrorNote } from '@/components/ui/primitives';
import { LogoLockup } from '@/components/brand/Logo';

/**
 * Shared sign-in / sign-up form.
 *
 * After authenticating, a learner with no profile goes to onboarding and an
 * existing one goes straight to their dashboard.
 */
export default function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const { ready, user, profile, plan } = useSession();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  /*
   * Read after mount, never during render: the user agent is a browser fact and
   * reading it while rendering produces markup the server cannot match.
   */
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => setEmbedded(isInAppBrowser()), []);

  const isSignup = mode === 'signup';

  /*
   * One authoritative navigation, and it waits.
   *
   * The form used to route the moment the credential call resolved, choosing
   * between /app and /onboarding from the `profile` it happened to be holding.
   * At that instant the auth listener has not fired, so profile was always null
   * and every returning learner was sent to onboarding. Worse, onboarding's own
   * guard then saw a still-null user and replaced the route with /auth/login,
   * so a correct password landed you back on the login screen. Whether it
   * happened at all came down to which resolved first on that device, which is
   * why it looked like only some phones were broken.
   *
   * Nothing is decided here until the session has actually resolved the account
   * that was just signed in, and the documents that say where it belongs.
   */
  useEffect(() => {
    if (!signedIn || !ready || !user) return;
    router.replace(profile && plan ? '/app' : '/onboarding');
  }, [signedIn, ready, user, profile, plan, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (isSignup) {
        if (fullName.trim().length < 2) {
          setError('Tell us your name so we can address you properly.');
          // Nothing was attempted, so the form has to come back to life. There
          // is no finally clause now: the success path stays busy until it
          // navigates, so every early exit has to release it itself.
          setBusy(false);
          return;
        }
        await registerWithEmail(email.trim(), password, fullName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      // Stays busy: the effect above navigates once the session resolves, and
      // re-enabling the form in between invites a second submission.
      setSignedIn(true);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function google() {
    setError('');
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      // Null means a redirect was started because this browser refused the
      // popup. The page is on its way to Google; there is nothing to navigate.
      if (result) setSignedIn(true);
      // No finally clearing busy: on success the effect navigates, and on a
      // redirect the page is leaving. Either way the form should stay locked.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setError('');
    try {
      await resetPassword(email.trim());
      setNotice('Check your inbox for a reset link.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <div className="shell" style={{ flexDirection: 'column' }}>
      <main
        className="shell-main"
        style={{ display: 'grid', placeItems: 'center', paddingTop: 48 }}
        id="main"
      >
        <div className="stack-lg" style={{ width: '100%', maxWidth: 400 }}>
          <Link href="/" aria-label="SkillIn by Amish Sharma, home">
            <LogoLockup size={32} />
          </Link>

          <div className="stack-sm">
            <h1 className="title-lg">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="body">
              {isSignup
                ? 'So your roadmap, progress and streak are saved to you.'
                : 'Pick up where you left off.'}
            </p>
          </div>

          <button type="button" className="btn btn-ghost btn-lg" onClick={google} disabled={busy}>
            <GoogleMark />
            Continue with Google
          </button>

          {/*
            Tapping a link inside Instagram, LinkedIn or WhatsApp opens their own
            browser, where Google sign-in frequently cannot complete and the
            button appears to do nothing. Saying so up front is the difference
            between a workaround and a dead end. Email sign-in below still works
            here, so this warns rather than blocks.
          */}
          {embedded ? (
            <p className="meta" style={{ textAlign: 'center' }}>
              You&apos;re in an in-app browser. For the most reliable sign-in, open SkillIn in
              Safari or Chrome.
            </p>
          ) : null}

          <div className="row" style={{ gap: 12 }}>
            <hr className="divider" style={{ flex: 1 }} />
            <span className="meta">or</span>
            <hr className="divider" style={{ flex: 1 }} />
          </div>

          <form onSubmit={submit} className="stack-md">
            {isSignup ? (
              <div>
                <label className="label" htmlFor="name">
                  Your name
                </label>
                <input
                  id="name"
                  className="field"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {isSignup ? <p className="meta" style={{ marginTop: 6 }}>At least 6 characters.</p> : null}
            </div>

            {error ? <ErrorNote>{error}</ErrorNote> : null}
            {notice ? (
              <p className="meta" role="status" style={{ color: 'var(--ok)' }}>
                {notice}
              </p>
            ) : null}

            <button type="submit" className="btn btn-dark btn-lg" disabled={busy}>
              {busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {!isSignup ? (
            <button type="button" className="btn btn-quiet" onClick={forgot}>
              Forgot your password?
            </button>
          ) : null}

          <div className="spread" style={{ flexWrap: 'wrap', gap: 10 }}>
            <p className="meta">
              {isSignup ? 'Already have an account?' : 'New to SkillIn?'}{' '}
              <Link href={isSignup ? '/auth/login' : '/auth/register'} style={{ fontWeight: 600 }}>
                {isSignup ? 'Sign in' : 'Create one'}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
