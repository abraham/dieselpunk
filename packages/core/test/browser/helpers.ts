import { server, userEvent } from 'vitest/browser';
import { renderThemesCss, renderTokensCss } from '../../scripts/render-css.ts';

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

/** Loads the generated tokens.css and themes.css into the page. */
export function addStylesheets(): void {
  for (const css of [renderTokensCss(), renderThemesCss()]) {
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
    await userEvent.tab();
  }
}
