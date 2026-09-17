'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/client/session';
import SkillInMotionLogo from '@/components/brand/MotionLogo';

/**
 * The landing page's way in, which decides where you belong before it moves.
 *
 * Sending everybody to the sign-up form and discovering afterwards that they
 * already have an account is the worst version of this: a returning learner
 * gets asked to create the account they are already signed into, and then to
 * upload the CV the app already has.
 *
 * So the destination comes from resolved state, never from a guess:
 *
 *   signed out                       sign up
 *   signed in, profile and plan      the app
 *   signed in, anything missing      onboarding, which resumes at the step
 *                                    the missing piece belongs to
 *
 * If the session has not resolved yet the click is held, not guessed at, and
 * the motion logo covers the wait so nothing flashes.
 */
export default function StartButton({
  children,
  className = 'btn btn-dark',
  signedInLabel,
}: {
  children: ReactNode;
  className?: string;
  /** Replaces the label once we know the person already has an account. */
  signedInLabel?: ReactNode;
}) {
  const router = useRouter();
  const { ready, user, profile, plan } = useSession();
  const [waiting, setWaiting] = useState(false);

  const destination = useCallback(() => {
    if (!user) return '/auth/register';
    return profile && plan ? '/app' : '/onboarding';
  }, [user, profile, plan]);

  function go() {
    if (!ready) {
      // The listener is still resolving. Show the loader rather than routing on
      // an assumption we are about to find out is wrong.
      setWaiting(true);
      return;
    }
    router.push(destination());
  }

  /*
   * The click arrived before the session resolved, so it is still pending. This
   * has to be an effect: navigating is a side effect, and calling router.push
   * while rendering asks the router to update during another component's render,
   * which React reports as a setState-in-render error.
   */
  useEffect(() => {
    if (waiting && ready) router.push(destination());
  }, [waiting, ready, router, destination]);

  return (
    <>
      <button type="button" className={className} onClick={go}>
        {ready && user && signedInLabel ? signedInLabel : children}
      </button>
      {waiting && !ready ? (
        <SkillInMotionLogo variant="fullscreen" message="Loading SkillIn" />
      ) : null}
    </>
  );
}
