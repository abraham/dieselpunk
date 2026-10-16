import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';

/** Replaces gradients, texture, and bevels on `selector` with a plain system-color border. */
export function forcedColorsSurface(selector: string): CSSResult {
  return css`
    @media (forced-colors: active) {
      ${unsafeCSS(selector)} {
        background: Canvas;
        color: CanvasText;
        border: 2px solid CanvasText;
        box-shadow: none;
      }
    }
  `;
}
