import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';
import { token } from '../tokens/token.ts';
import { forcedColorsSurface } from './forced-colors.ts';
import { raisedSurface } from './surfaces.ts';

/**
 * The surface a window and a dialog share: a raised `<dialog>`, in flow when it is not modal and
 * in the top layer when it is, with a body that scrolls and a footer that stacks its actions at
 * 480px and below. `maxWidth` is the component's own property, such as `--punk-window-max-width`.
 */
export function modalSurfaceStyles(maxWidth: string, fallback: string): CSSResult {
  const width = unsafeCSS(`var(${maxWidth}, ${fallback})`);
  return css`
    :host {
      display: block;
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    dialog {
      ${raisedSurface}
      position: relative;
      inset: auto;
      box-sizing: border-box;
      container-type: inline-size;
      inline-size: min(100%, ${width});
      max-inline-size: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: ${token('radius')};
      color: ${token('color-text')};
      font: inherit;
      overflow: visible;
    }

    dialog[open] {
      display: flex;
      flex-direction: column;
    }

    /* Where showModal is missing the dialog is fixed in place, with the same size as the modal one. */
    dialog:modal,
    dialog[data-fallback] {
      position: fixed;
      inset: 0;
      margin: auto;
      inline-size: min(100% - 2 * ${token('space-4')}, ${width});
      max-block-size: calc(100% - 2 * ${token('space-4')});
      z-index: ${token('z-modal')};
    }

    dialog::backdrop {
      background: color-mix(in srgb, ${token('color-canvas')} 70%, transparent);
    }

    .body {
      flex: 1 1 auto;
      min-block-size: 0;
      padding: ${token('space-3')};
      overflow: auto;
      overflow-wrap: break-word;
    }

    .footer {
      display: flex;
      flex: none;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: ${token('space-2')};
      padding: ${token('space-3')};
    }

    [hidden] {
      display: none !important;
    }

    @container (max-inline-size: 480px) {
      .footer {
        flex-direction: column;
        align-items: stretch;
      }

      .footer ::slotted(*) {
        inline-size: 100%;
      }
    }

    ${forcedColorsSurface('dialog')}
  `;
}
