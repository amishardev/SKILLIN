'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * The last line of defence.
 *
 * Without this file a thrown render anywhere under /app takes the whole tree
 * with it and the visitor gets a white page, which is indistinguishable from
 * the site being down. React needs somewhere to land; this is it.
 *
 * Deliberately plain. It must not depend on the session, on Firebase or on
 * anything that could be the thing that just failed.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe handle on a production failure: the message
    // is minified server side and carries no user data.
    console.error('[skillin] render failed', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="shell" style={{ flexDirection: 'column' }}>
      <main className="shell-main" style={{ display: 'grid', placeItems: 'center' }} id="main">
        <div className="stack-md" style={{ maxWidth: 400, textAlign: 'center' }}>
          <h1 className="title-lg">Something went wrong.</h1>
          <p className="body">
            This page failed to load. Your account and your saved work are not affected.
          </p>
          <div className="wrap" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-dark"
              style={{ minHeight: 44 }}
              onClick={reset}
            >
              Try again
            </button>
            <Link className="btn btn-quiet" style={{ minHeight: 44 }} href="/">
              Go home
            </Link>
          </div>
          {error.digest ? (
            <p className="meta">Reference: {error.digest}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
