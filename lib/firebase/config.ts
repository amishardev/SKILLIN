'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig, hasFirebaseConfig } from '@/lib/env';

/**
 * The Firebase client, created on first use rather than on import.
 *
 * `'use client'` does not mean "browser only". A client component is still
 * rendered on the server during the production build, so anything constructed
 * at module scope runs there too. This file used to call `initializeApp` and
 * `getAuth` at the top level, which meant prerendering `/goals` and
 * `/_not-found` tried to start Firebase Auth with no config and the build died
 * with `auth/invalid-api-key`.
 *
 * Nothing here runs until a browser calls one of these, which is what the
 * Firebase Web SDK is for in the first place.
 */

function app(): FirebaseApp {
  if (!hasFirebaseConfig()) {
    throw new Error(
      'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, ' +
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, ' +
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ' +
        'and NEXT_PUBLIC_FIREBASE_APP_ID. See .env.example.',
    );
  }
  // getApp() reuses the instance across Fast Refresh, which would otherwise
  // re-initialize on every edit and drop the auth listener.
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

/**
 * Auth, with somewhere to keep the session that this browser will actually
 * allow.
 *
 * getAuth() defaults to IndexedDB. That is the right first choice and the wrong
 * only choice: Safari with website data blocked, Firefox in strict mode, an
 * in-app browser inside Instagram or LinkedIn, and any private window that
 * refuses storage will all fail it. A session that cannot be written is a user
 * who signs in, gets bounced back to the login screen by the route guard, and
 * reports that login does not work on their phone.
 *
 * Passing the list lets the SDK walk it in order and settle on the first store
 * that works. In memory is last and always succeeds: the session then lasts
 * until the tab closes, which is a worse experience than staying signed in and
 * a far better one than not being able to sign in.
 *
 * The resolver has to be passed explicitly. initializeAuth, unlike getAuth,
 * installs no default, and without it signInWithPopup and signInWithRedirect
 * both throw auth/argument-error.
 */
function createAuth(instance: FirebaseApp): Auth {
  try {
    return initializeAuth(instance, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    /*
     * Already initialized, which happens on every Fast Refresh, or the
     * environment refused even the in-memory store. getAuth returns the
     * existing instance in the first case and a usable one in the second, so
     * either way this is recoverable and must not throw.
     */
    return getAuth(instance);
  }
}

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getAuthClient(): Auth {
  authInstance ??= createAuth(app());
  return authInstance;
}

export function getDb(): Firestore {
  dbInstance ??= getFirestore(app());
  return dbInstance;
}
