import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';
import { token } from '../tokens/token.ts';

/** `focused` receives the outline reset and the forced-colors outline; `ringed` gets the ring. */
function ring(focused: string, ringed: string): CSSResult {
  const host = unsafeCSS(focused);
  const target = unsafeCSS(ringed);
  return css`
    ${host} {
      outline: none;
    }

    ${target}::after {
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
      ${host} {
        outline: 2px solid Highlight;
        outline-offset: 2px;
      }

      ${target}::after {
        display: none;
      }
    }
  `;
}

/**
 * A two-tone focus ring on `selector`, shown only for `:focus-visible`.
 *
 * It is drawn on `::after`, so it never competes with a bevel's `box-shadow`. The selector must
 * be positioned (`position: relative`). Forced colors fall back to a system `Highlight` outline.
 */
export function focusRing(selector: string): CSSResult {
  return ring(`${selector}:focus-visible`, `${selector}:focus-visible`);
}

/**
 * The same ring for a host that is itself the focus target: it is drawn on `selector`, an
 * element inside the shadow tree that fills the host and is positioned, while the host holds
 * focus. In forced colors the outline goes on the host.
 */
export function hostFocusRing(selector: string): CSSResult {
  return ring(':host(:focus-visible)', `:host(:focus-visible) ${selector}`);
}
