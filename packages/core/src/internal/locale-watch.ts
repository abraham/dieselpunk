import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { LOCALE_STATUS_EVENT } from './localize.ts';

interface Host {
  requestUpdate(): void;
}

const hosts = new Set<Host>();
let listening = false;
let epoch = 0;

function onStatus(event: Event): void {
  if ((event as CustomEvent<{ status: string }>).detail.status !== 'ready') return;
  epoch++;
  for (const host of hosts) host.requestUpdate();
}

/** Counts the locales that have become ready, so a component can tell it missed one. */
export const localeEpoch = (): number => epoch;

/**
 * Re-renders `host` when the active locale becomes ready. Lit Localize's own controller adds a
 * `window` listener for every instance, so the library adds one, the first time a host arrives,
 * and shares it. The set holds a host only while it is connected.
 */
export function watchLocale(host: Host): () => void {
  if (!listening) {
    listening = true;
    window.addEventListener(LOCALE_STATUS_EVENT, onStatus);
  }
  hosts.add(host);
  return () => {
    hosts.delete(host);
  };
}

/**
 * Re-renders its host when the locale becomes ready, and when the host returns to the page after
 * one did. A component adds one if its render calls `msg()`, and no other component needs one.
 */
export class LocaleWatcher implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  #stop: (() => void) | undefined;
  #epochAtExit: number | undefined;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#epochAtExit !== undefined && this.#epochAtExit !== epoch) this.#host.requestUpdate();
    this.#stop ??= watchLocale(this.#host);
  }

  hostDisconnected(): void {
    this.#epochAtExit = epoch;
    this.#stop?.();
    this.#stop = undefined;
  }
}
