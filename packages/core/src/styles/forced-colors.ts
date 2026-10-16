import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';

interface ForcedColors {
  /** System color for the surface fill. */
  face: string;
  /** System color for text and the border. */
  text: string;
}

/** Replaces gradients, texture, and bevels on `selector` with a plain system-color border. */
export function forcedColorsSurface(
  selector: string,
  { face, text }: ForcedColors = { face: 'Canvas', text: 'CanvasText' },
): CSSResult {
  return css`
    @media (forced-colors: active) {
      ${unsafeCSS(selector)} {
        background: ${unsafeCSS(face)};
        color: ${unsafeCSS(text)};
        border: 2px solid ${unsafeCSS(text)};
        box-shadow: none;
      }
    }
  `;
}
