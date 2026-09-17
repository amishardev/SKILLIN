'use client';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  type User,
} from 'firebase/auth';
import { auth } from './config';
import { browserTimezone, createUserDoc, getUserDoc } from './firestore';

const googleProvider = new GoogleAuthProvider();
// Always let the user choose, rather than silently reusing a signed-in account.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: fullName });
  await createUserDoc(result.user.uid, {
    fullName,
    email,
    onboardingComplete: false,
    timezone: browserTimezone(),
  });
  return result.user;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Create the account record on first sign-in only, so a returning user's
  // saved onboarding state is never reset.
  const existing = await getUserDoc(user.uid);
  if (!existing) {
    await createUserDoc(user.uid, {
      fullName: user.displayName ?? user.email?.split('@')[0] ?? 'Learner',
      email: user.email ?? '',
      avatarUrl: user.photoURL ?? undefined,
      onboardingComplete: false,
      timezone: browserTimezone(),
    });
  }
  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Delete the signed-in account.
 * Firebase requires a recent sign-in; the caller surfaces that to the user.
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
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
      return 'Your browser blocked the sign-in popup. Allow popups and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'We couldn’t reach the server. Check your connection.';
    case 'auth/requires-recent-login':
      return 'For security, sign in again before doing that.';
    case 'auth/operation-not-allowed':
      return 'That sign-in method isn’t enabled for this project yet.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
