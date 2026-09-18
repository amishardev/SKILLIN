'use client';

/**
 * What this browser can actually do, for working out why sign-in failed on
 * someone's phone when it works on yours.
 *
 * Nothing here is collected or sent anywhere. It reads capabilities already
 * visible to any script on the page and returns them to the caller, which today
 * is a console helper used while debugging. It deliberately reads no user
 * identity, no account data and no storage contents, only whether the stores
 * can be opened at all.
 */

export interface AuthEnvironment {
  /** Whether window exists at all, so this is safe to call during SSR. */
  browser: boolean;
  /** localStorage can be written and read back. */
  localStorage: boolean;
  /** sessionStorage can be written and read back. */
  sessionStorage: boolean;
  /** The IndexedDB API is present. Firebase's default auth store needs it. */
  indexedDb: boolean;
  /** Cookies are enabled. */
  cookies: boolean;
  /** The browser reports itself online. */
  online: boolean;
  /** Running inside an app's embedded browser rather than a real one. */
  inAppBrowser: boolean;
  /** Launched from a home screen icon rather than a browser tab. */
  standalone: boolean;
}

function canUse(store: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const key = '__skillin_probe__';
    window[store].setItem(key, '1');
    const ok = window[store].getItem(key) === '1';
    window[store].removeItem(key);
    return ok;
  } catch {
    // Access itself throws when site data is blocked, so this is the answer.
    return false;
  }
}

/*
 * Tokens that only appear in the user agent of a browser embedded in another
 * app. These are the environments where an OAuth popup will not open and where
 * storage is often partitioned or discarded.
 */
const IN_APP_TOKENS =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|WhatsApp|LinkedInApp|Snapchat|Twitter|TikTok|Pinterest/i;

/** True when the page is running inside another app's browser. */
export function isInAppBrowser(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
  return IN_APP_TOKENS.test(ua);
}

/** A snapshot of what sign-in has to work with here. */
export function readAuthEnvironment(): AuthEnvironment {
  if (typeof window === 'undefined') {
    return {
      browser: false,
      localStorage: false,
      sessionStorage: false,
      indexedDb: false,
      cookies: false,
      online: false,
      inAppBrowser: false,
      standalone: false,
    };
  }

  let cookies = false;
  try {
    cookies = navigator.cookieEnabled;
  } catch {
    cookies = false;
  }

  let indexedDb = false;
  try {
    indexedDb = typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
  } catch {
    // Firefox in strict mode throws on the property access itself.
    indexedDb = false;
  }

  let standalone = false;
  try {
    standalone = window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    standalone = false;
  }

  return {
    browser: true,
    localStorage: canUse('localStorage'),
    sessionStorage: canUse('sessionStorage'),
    indexedDb,
    cookies,
    online: navigator.onLine,
    inAppBrowser: isInAppBrowser(),
    standalone,
  };
}
