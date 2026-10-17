import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Original demo item art for the workbench only; applications supply their own
// (specs/visual-system.md §10). 24x24 grid, geometric, drawn in `currentColor` so it follows the theme.
const svg = (shapes: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${shapes}</svg>`;

const teeth = [0, 60, 120, 180, 240, 300]
  .map(
    (angle) =>
      `<rect x="10" y="2" width="4" height="5" rx="0.5" transform="rotate(${angle} 12 12)"/>`,
  )
  .join('');

const pins = [8, 11, 14]
  .flatMap((offset) => [
    `<rect x="${offset}" y="3" width="2" height="4"/>`,
    `<rect x="${offset}" y="17" width="2" height="4"/>`,
    `<rect x="3" y="${offset}" width="4" height="2"/>`,
    `<rect x="17" y="${offset}" width="4" height="2"/>`,
  ])
  .join('');

export const itemSvg = {
  gear: svg(
    `<path fill-rule="evenodd" d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>${teeth}`,
  ),
  plate: svg(
    `<path d="M12 4 21 8l-9 4-9-4z"/>` +
      `<path fill-opacity=".6" d="M3 8v3l9 4v-3z"/><path fill-opacity=".35" d="M21 8v3l-9 4v-3z"/>` +
      `<path fill-opacity=".6" d="M3 13v3l9 4v-3z"/><path fill-opacity=".35" d="M21 13v3l-9 4v-3z"/>`,
  ),
  circuit: svg(
    `<path fill-rule="evenodd" d="M4 4h16v16H4zM6 6v12h12V6z"/>` +
      `<rect x="8" y="8" width="2" height="2"/><rect x="14" y="8" width="2" height="2"/>` +
      `<rect x="8" y="14" width="2" height="2"/><rect x="14" y="14" width="2" height="2"/>` +
      `<path d="M10 11h4v2h-4z"/>`,
  ),
  module: svg(`<path fill-rule="evenodd" d="M7 7h10v10H7zM10 10v4h4v-4z"/>${pins}`),
  coil: svg(
    `<rect x="2" y="3" width="2.5" height="18"/><rect x="19.5" y="3" width="2.5" height="18"/>` +
      [4, 8.5, 13, 17.5]
        .map((y) => `<rect x="4.5" y="${y}" width="15" height="2.5" rx="1.25"/>`)
        .join(''),
  ),
} as const;

export type ItemName = keyof typeof itemSvg;
export const itemNames = Object.keys(itemSvg) as ItemName[];

/** What each item is called in the demos. */
export const itemLabels: Record<ItemName, string> = {
  gear: 'Gear',
  plate: 'Iron plate',
  circuit: 'Circuit',
  module: 'Speed module',
  coil: 'Copper coil',
};

/** The art as a string, for slot arguments in Storybook controls. `slot` names the slot it fills. */
export const itemMarkup = (name: ItemName, slot?: string): string =>
  slot ? itemSvg[name].replace('<svg ', `<svg slot="${slot}" `) : itemSvg[name];

export const item = (name: ItemName, slot?: string): TemplateResult =>
  html`${unsafeHTML(itemMarkup(name, slot))}`;
