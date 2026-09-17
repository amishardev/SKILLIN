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
 * Firebase Web config. These values are public by design, Firebase identifies
 * the project with them and enforces access through Security Rules, not secrecy.
 * They are still read from the environment so a fork can point at its own project.
 */
export const firebaseConfig = {
  apiKey: read('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyAGoCEXe78uhcLTo-mIUv_8G3pp27qkT2M'),
  authDomain: read('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'studio-5637634634-d071b.firebaseapp.com'),
  projectId: read('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'studio-5637634634-d071b'),
  storageBucket: read('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'studio-5637634634-d071b.firebasestorage.app'),
  messagingSenderId: read('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '92462534820'),
  appId: read('NEXT_PUBLIC_FIREBASE_APP_ID', '1:92462534820:web:dcda35528847726e7cd631'),
} as const;

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
