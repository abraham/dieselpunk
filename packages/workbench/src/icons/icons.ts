import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// Original demo icons for the workbench only; core ships none. 24x24 grid, drawn in `currentColor`.
// They are strings, not templates, so they can also be used as slot values in Storybook controls.
const svg = (shapes: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${shapes}</svg>`;

const teeth = [0, 45, 90, 135, 180, 225, 270, 315]
  .map(
    (angle) => `<rect x="10.5" y="2.5" width="3" height="4" transform="rotate(${angle} 12 12)"/>`,
  )
  .join('');

export const iconSvg = {
  gear: svg(
    `<path fill-rule="evenodd" d="M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/>${teeth}`,
  ),
  plus: svg(`<path d="M11 4h2v16h-2zM4 11h16v2H4z"/>`),
  close: svg(
    `<path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/>`,
  ),
  check: svg(`<path d="M4 12.5 6.1 10.4 10 14.3 17.9 6.4 20 8.5 10 18.5z"/>`),
  info: svg(
    `<path fill-rule="evenodd" d="M12 3 21 12 12 21 3 12zM11 10.5h2V17h-2zM11 7h2v2h-2z"/>`,
  ),
  warning: svg(`<path fill-rule="evenodd" d="M12 3 22 20H2zM11 9h2v6h-2zM11 16.5h2v2h-2z"/>`),
  more: svg(`<path d="M3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4z"/>`),
  fit: svg(`<path d="M3 3h7v2H5v5H3zM14 3h7v7h-2V5h-5zM3 14h2v5h5v2H3zM19 14h2v7h-7v-2h5z"/>`),
} as const;

export type IconName = keyof typeof iconSvg;

export const icon = (name: IconName): TemplateResult => html`${unsafeHTML(iconSvg[name])}`;
