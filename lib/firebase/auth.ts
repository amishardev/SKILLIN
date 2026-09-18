'use client';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  type User,
} from 'firebase/auth';
import { getAuthClient } from './config';
import { browserTimezone, createUserDoc, getUserDoc } from './firestore';

const googleProvider = new GoogleAuthProvider();
// Always let the user choose, rather than silently reusing a signed-in account.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(getAuthClient(), email, password);
  return result.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(getAuthClient(), email, password);
  await updateProfile(result.user, { displayName: fullName });
  await createUserDoc(result.user.uid, {
    fullName,
    email,
    onboardingComplete: false,
    timezone: browserTimezone(),
  });
  return result.user;
}

/**
 * Give a Google account its SkillIn record, if it does not have one.
 *
 * Only on first sign-in, so a returning learner's saved onboarding state is
 * never reset back to the beginning.
 */
async function ensureUserDoc(user: User): Promise<void> {
  const existing = await getUserDoc(user.uid);
  if (existing) return;
  await createUserDoc(user.uid, {
    fullName: user.displayName ?? user.email?.split('@')[0] ?? 'Learner',
    email: user.email ?? '',
    avatarUrl: user.photoURL ?? undefined,
    onboardingComplete: false,
    timezone: browserTimezone(),
  });
}

/**
 * Failures that mean "this browser will not do popups", as opposed to "this
 * person changed their mind".
 *
 * A cancelled popup is a decision and must not silently restart sign-in as a
 * full page redirect. The rest are the environment refusing, and the only way
 * through is to hand the whole page to Google and come back.
 */
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/internal-error',
]);

/**
 * Sign in with Google, by popup where that works and by redirect where it does
 * not.
 *
 * Popups are blocked outright in most in-app browsers, the ones that open when
 * a link is tapped inside Instagram, LinkedIn or WhatsApp, and are unreliable
 * in iOS Safari with cross-site tracking prevention on. Offering only a popup
 * leaves those users with a button that appears to do nothing.
 *
 * Resolves to null when a redirect has been started: the page is navigating
 * away, and the result is picked up by completeGoogleRedirect on return.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const auth = getAuthClient();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    return result.user;
  } catch (err) {
    const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
    if (!POPUP_UNAVAILABLE.has(code)) throw err;

    await signInWithRedirect(auth, googleProvider);
    return null;
  }
}

/**
 * Finish a redirect sign-in, if this page load is the return leg of one.
 *
 * Called once when the session provider mounts, never per render. Returns null
 * on an ordinary page load, which is the common case and not an error.
 */
export async function completeGoogleRedirect(): Promise<User | null> {
  try {
    const result = await getRedirectResult(getAuthClient());
    if (!result) return null;
    await ensureUserDoc(result.user);
    return result.user;
  } catch {
    /*
     * A failed redirect must not take the app down with it. The auth listener
     * is the authority on whether anyone is signed in, and it will report that
     * nobody is, which lands the visitor on the login screen with the form
     * ready rather than on a blank page.
     */
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(getAuthClient());
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthClient(), email);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getAuthClient(), callback);
}

export function getCurrentUser(): User | null {
  return getAuthClient().currentUser;
}

/**
 * Delete the signed-in account.
 * Firebase requires a recent sign-in; the caller surfaces that to the user.
 */
export async function deleteAccount(): Promise<void> {
  const user = getAuthClient().currentUser;
  if (!user) throw new Error('Not signed in.');
  await deleteUser(user);
}

/** Human-readable messages for the Firebase auth error codes users actually hit. */
export function authErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'That email and password combination didn’t work.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email. Try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window, so we are trying again in this tab.';
    case 'auth/web-storage-unsupported':
      return 'This browser is blocking the storage sign-in needs. Try again in Safari or Chrome, or allow site data for this site.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Sign-in is not supported in this in-app browser. Open SkillIn in Safari or Chrome.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'We couldn’t reach the server. Check your connection.';
    case 'auth/requires-recent-login':
      return 'For security, sign in again before doing that.';
    case 'auth/operation-not-allowed':
      return 'That sign-in method is not enabled for this project yet.';
    case 'auth/unauthorized-domain':
      return 'This site is not on the Firebase project’s authorized domain list, so sign-in was refused. Add it in Firebase console, Authentication, Settings, Authorized domains.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'The Firebase API key for this site is missing or rejected. Check the NEXT_PUBLIC_FIREBASE_* variables where it is deployed.';
    default:
      // The code itself, rather than a shrug. An unmapped failure is exactly
      // when the person needs something they can search for or send on.
      return `Sign-in failed (${code}). Please try again.`;
  }
}
