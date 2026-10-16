import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';
import { token } from '../tokens/token.ts';

/**
 * A two-tone focus ring on `selector`, shown only for `:focus-visible`.
 *
 * It is drawn on `::after`, so it never competes with a bevel's `box-shadow`. The selector must
 * be positioned (`position: relative`). Forced colors fall back to a system `Highlight` outline.
 */
export function focusRing(selector: string): CSSResult {
  const target = unsafeCSS(selector);
  return css`
    ${target}:focus-visible {
      outline: none;
    }

    ${target}:focus-visible::after {
      content: '';
      position: absolute;
      inset: calc(-1 * ${token('border-width')});
      border-radius: inherit;
      pointer-events: none;
      box-shadow:
        0 0 0 2px ${token('color-focus-inner')},
        0 0 0 4px ${token('color-focus')};
    }

    @media (forced-colors: active) {
      ${target}:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 2px;
      }

      ${target}:focus-visible::after {
        display: none;
      }
    }
  `;
}
