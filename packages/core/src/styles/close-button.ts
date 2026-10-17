import { css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { token } from '../tokens/token.ts';
import { focusRing } from './focus.ts';
import { forcedColorsSurface } from './forced-colors.ts';
import { raisedHoverShadow, raisedSurface } from './surfaces.ts';

// Native `<button>` with a drawn X, for a window or a toast. The shared styles keep both entries
// independent of `punk-icon-button` (specs/component-model.md §9).
export const closeButtonStyles = css`
  .close-button {
    ${raisedSurface}
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    inline-size: ${token('control-height-sm')};
    block-size: ${token('control-height-sm')};
    padding: 0;
    border: 0;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font: inherit;
    cursor: pointer;
  }

  .close-button:hover {
    box-shadow: ${raisedHoverShadow};
  }

  .close-button:active {
    background: ${token('color-panel-inset')};
  }

  .close-button .glyph {
    inline-size: ${token('icon-size-sm')};
    block-size: ${token('icon-size-sm')};
    background: currentColor;
    clip-path: polygon(
      10% 0,
      50% 40%,
      90% 0,
      100% 10%,
      60% 50%,
      100% 90%,
      90% 100%,
      50% 60%,
      10% 100%,
      0 90%,
      40% 50%,
      0 10%
    );
  }

  /* A coarse pointer gets a 40px target without a change to how the button looks. */
  @media (pointer: coarse) {
    .close-button::before {
      content: '';
      position: absolute;
      inset: calc((100% - 40px) / 2);
    }
  }

  ${focusRing('.close-button')}
  ${forcedColorsSurface('.close-button', { face: 'ButtonFace', text: 'ButtonText' })}

  /* A glyph drawn as a background is erased under forced colors unless it uses a system color. */
  @media (forced-colors: active) {
    .close-button .glyph {
      background: ButtonText;
    }
  }
`;

export interface CloseButtonOptions {
  part: string;
  /** The localized accessible name. */
  label: string;
  onClick: (event: Event) => void;
  disabled?: boolean;
}

export function renderCloseButton({
  part,
  label,
  onClick,
  disabled = false,
}: CloseButtonOptions): TemplateResult {
  return html`<button
    part=${part}
    class="close-button"
    type="button"
    aria-label=${label}
    ?disabled=${disabled}
    @click=${onClick}
  >
    <span class="glyph" aria-hidden="true"></span>
  </button>`;
}
