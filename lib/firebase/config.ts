'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
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

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getAuthClient(): Auth {
  authInstance ??= getAuth(app());
  return authInstance;
}

export function getDb(): Firestore {
  dbInstance ??= getFirestore(app());
  return dbInstance;
}
