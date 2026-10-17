import { server, userEvent } from 'vitest/browser';

// Helpers for tests in Vitest's browser mode. The commands are defined by `./vitest`.

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Emulates `prefers-color-scheme`; `null` restores the browser default. */
    setColorScheme: (scheme: 'light' | 'dark' | null) => Promise<void>;
    /** Emulates `forced-colors`; `null` restores the browser default. */
    setForcedColors: (mode: 'active' | null) => Promise<void>;
    /** Emulates `prefers-reduced-motion`; `null` restores the browser default. */
    setReducedMotion: (mode: 'reduce' | null) => Promise<void>;
    /** Hovers the element matching `selector` and presses the primary button without releasing. */
    holdPointer: (selector: string) => Promise<void>;
    releasePointer: () => Promise<void>;
  }
}

const cleanups: Array<() => void> = [];

/** Appends `element` and removes it when `cleanup()` runs. */
export function track<T extends Element>(element: T, parent: Element = document.body): T {
  parent.append(element);
  cleanups.push(() => element.remove());
  return element;
}

export function cleanup(): void {
  while (cleanups.length > 0) cleanups.pop()?.();
}

/** Adds each stylesheet to the page's head until `cleanup()` runs. */
export function addStyles(...sheets: string[]): void {
  for (const css of sheets) {
    const style = document.createElement('style');
    style.textContent = css;
    track(style, document.head);
  }
}

export function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Focuses `element` the way a keyboard user would, so `:focus-visible` matches. WebKit on macOS
 * does not Tab to buttons by default, so there a keypress marks keyboard modality and `focus()`
 * does the rest. Elsewhere it presses Tab, so `element` must be the next tab stop.
 */
export async function focusWithKeyboard(element: HTMLElement): Promise<void> {
  if (server.browser === 'webkit') {
    // A modifier alone does not count as keyboard use, so an earlier mouse test would win.
    await userEvent.keyboard('{Escape}');
    element.focus();
  } else {
    // Headless Firefox starts without page focus, and Tab does nothing until the page has some.
    if (!document.hasFocus()) window.focus();
    await userEvent.tab();
  }
}
