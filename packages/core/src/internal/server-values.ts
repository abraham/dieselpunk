import { isServer } from 'lit';

let hydrating = false;

/**
 * Whether code must use only what a server can see (specs/ssr.md §3): true on the server, and in
 * the client render that hydrates its output (§5), which must match it exactly.
 */
export const serverValues = (): boolean => isServer || hydrating;

/** Marks the hydrating render. */
export function setHydrating(value: boolean): void {
  hydrating = value;
}

/** What `@dieselpunk/core/hydrate.js` installs into `PunkElement`. */
export interface Hydration {
  /** Whether to hydrate `element`'s server-rendered `root` rather than replace it. */
  claim(element: HTMLElement, root: ShadowRoot): boolean;
  /** Runs an update, as the hydrating one when it is the element's first after `claim`. */
  update(element: HTMLElement, run: () => void): void;
}

export let hydration: Hydration | undefined;

export function setHydration(value: Hydration): void {
  hydration = value;
}
