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
