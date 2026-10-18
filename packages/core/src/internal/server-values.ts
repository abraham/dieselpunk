import { isServer } from 'lit';

let hydrating = false;

/**
 * Whether code must use only what a server can see (specs/ssr.md §3): true on the server, and in
 * the client render that hydrates its output (§5), which must match it exactly.
 */
export const serverValues = (): boolean => isServer || hydrating;

/** Marks the hydrating render, which `PunkElement` runs synchronously. */
export function setHydrating(value: boolean): void {
  hydrating = value;
}
