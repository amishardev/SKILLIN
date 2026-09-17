'use client';

import { useSyncExternalStore } from 'react';

/** Nothing ever changes, so no subscriber is needed. */
const subscribe = () => () => {};

/**
 * True once running in the browser, false during server rendering.
 *
 * Used to gate values that depend on the viewer's clock or timezone, the
 * server cannot know either, and rendering a guess would cause a hydration
 * mismatch. `useSyncExternalStore` gives the correct value on the first client
 * render without a state update in an effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false);
}
