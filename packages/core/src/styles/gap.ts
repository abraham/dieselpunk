import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';
import { token } from '../tokens/token.ts';

export type LayoutGap = '0' | '1' | '2' | '3' | '4' | '5';

/**
 * The `gap` attribute of the layout primitives: `0` and the spacing tokens `1` to `5`, so density
 * follows. `property` is the component's own override, such as `--punk-stack-gap`, and an unknown
 * value matches none of the rules and leaves the default. `--_gap` is private.
 */
export function gapStyles(property: string): CSSResult {
  return css`
    :host {
      --_gap: ${token('space-2')};
      gap: var(${unsafeCSS(property)}, var(--_gap));
    }

    :host([gap='0']) {
      --_gap: 0px;
    }

    :host([gap='1']) {
      --_gap: ${token('space-1')};
    }

    :host([gap='3']) {
      --_gap: ${token('space-3')};
    }

    :host([gap='4']) {
      --_gap: ${token('space-4')};
    }

    :host([gap='5']) {
      --_gap: ${token('space-5')};
    }
  `;
}
