import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { serverEnv, hasFirebaseAdmin, firebaseConfig } from '@/lib/env';

/**
 * Firebase Admin, used for server-authoritative writes.
 *
 * Optional by design. With `FIREBASE_SERVICE_ACCOUNT_KEY` set, the server owns
 * every write to the protected collections (streak, progress, activity) and
 * Security Rules can deny client writes outright, that is the fully locked
 * configuration described in the README.
 *
 * Without it the app still runs: streak and progress are still *computed*
 * server-side from a server clock, but persisted by the authenticated client.
 * `adminAvailable()` tells callers which mode they are in so the UI can be
 * honest rather than implying a guarantee it does not have.
 */

let app: App | null = null;
let initFailed = false;

function getAdminApp(): App | null {
  if (initFailed || !hasFirebaseAdmin()) return null;
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  try {
    const parsed = JSON.parse(serverEnv.firebaseServiceAccount) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('service account JSON is missing required fields');
    }

    app = initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        // Keys pasted into an env var arrive with literal \n sequences.
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      }),
      projectId: parsed.project_id || firebaseConfig.projectId,
    });
    return app;
  } catch (err) {
    console.error('[firebase-admin] initialisation failed:', err instanceof Error ? err.message : err);
    initFailed = true;
    return null;
  }
}

export function adminAvailable(): boolean {
  return getAdminApp() !== null;
}

export function adminDb(): Firestore | null {
  const instance = getAdminApp();
  return instance ? getFirestore(instance) : null;
}

export interface VerifiedUser {
  uid: string;
  email?: string;
}

/**
 * Verify a Firebase ID token from the Authorization header.
 *
 * Returns null when Admin is not configured or the token is invalid/expired.
 * Callers must treat null as unauthenticated, never as "trust the client".
 */
export async function verifyIdToken(authorization: string | null): Promise<VerifiedUser | null> {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;

  const instance = getAdminApp();
  if (!instance) return null;

  try {
    const decoded = await getAuth(instance).verifyIdToken(token, true);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
