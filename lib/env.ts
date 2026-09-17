/**
 * Environment configuration.
 *
 * SkillIn is designed to run with zero mandatory paid infrastructure. Every
 * optional integration degrades to a deterministic local implementation, so a
 * missing key never produces a blank screen or a fabricated result.
 */

function read(name: string, fallback = ''): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * Firebase Web config.
 *
 * These values are not secrets: the browser receives all of them, and access is
 * enforced by Security Rules rather than by keeping them hidden. They are still
 * not committed. A hardcoded project id turns every fork and every clone into
 * traffic against one person's Firebase project, and a key in a public repo is
 * a key that gets scraped and used for quota, whatever it protects.
 *
 * So there is no fallback. Set them in `.env.local` locally and in the host's
 * environment for a deploy. `.env.example` lists them.
 */
export const firebaseConfig = {
  apiKey: read('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: read('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: read('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: read('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: read('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: read('NEXT_PUBLIC_FIREBASE_APP_ID'),
} as const;

/**
 * True when the Firebase config is actually present. The client uses this to
 * say what is wrong rather than throwing an opaque Firebase error.
 */
export const hasFirebaseConfig = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/** Server-only secrets. Never import this object into a Client Component. */
export const serverEnv = {
  geminiApiKey: read('GEMINI_API_KEY'),
  /** Free-tier Gemini model. Override to trade cost for capability. */
  geminiModel: read('GEMINI_MODEL', 'gemini-2.0-flash'),
  youtubeApiKey: read('YOUTUBE_API_KEY'),
  /** Raw service-account JSON. Enables server-authoritative writes (streak, progress). */
  firebaseServiceAccount: read('FIREBASE_SERVICE_ACCOUNT_KEY'),
};

/** A placeholder is not a key. Treat `your_gemini_api_key` as absent. */
function isRealKey(value: string): boolean {
  if (value.length < 12) return false;
  return !/^(your[_-]|xxx|placeholder|changeme|todo)/i.test(value);
}

export const hasGemini = () => isRealKey(serverEnv.geminiApiKey);
export const hasYoutube = () => isRealKey(serverEnv.youtubeApiKey);
export const hasFirebaseAdmin = () => serverEnv.firebaseServiceAccount.trim().startsWith('{');
