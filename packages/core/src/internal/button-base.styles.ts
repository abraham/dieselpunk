import { css } from 'lit';
import { focusRing } from '../styles/focus.ts';
import { forcedColorsSurface } from '../styles/forced-colors.ts';
import {
  insetShadow,
  outlineShadow,
  raisedHoverShadow,
  raisedShadow,
  raisedSurface,
} from '../styles/surfaces.ts';
import { token } from '../tokens/token.ts';

// `--_h` and `--_icon` are private aliases set per size; they are not part of the public API.
export const buttonBaseStyles = css`
  :host {
    display: inline-flex;
    position: relative;
    vertical-align: middle;
  }

  /* An author display value would otherwise defeat the UA rule for [hidden]. */
  [hidden] {
    display: none !important;
  }

  .visually-hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .button {
    position: relative;
    flex: 1 1 auto;
    min-inline-size: 0;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${token('space-2')};
    block-size: var(--_h);
    margin: 0;
    padding-block: 0;
    padding-inline: var(--punk-button-padding-inline, ${token('space-3')});
    border: 0;
    border-radius: ${token('radius')};
    appearance: none;
    font: inherit;
    font-weight: 600;
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
  }

  .size-sm {
    --_h: ${token('control-height-sm')};
    --_icon: ${token('icon-size-sm')};
  }

  .size-md {
    --_h: ${token('control-height-md')};
    --_icon: ${token('icon-size-md')};
  }

  .size-lg {
    --_h: ${token('control-height-lg')};
    --_icon: ${token('icon-size-lg')};
  }

  .content {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${token('space-2')};
  }

  /* The label keeps its width while loading so the button does not resize. */
  .loading .content {
    opacity: 0;
  }

  .variant-default {
    ${raisedSurface}
    color: ${token('color-text')};
  }

  .variant-primary {
    background: linear-gradient(
      to bottom,
      color-mix(
        in srgb,
        ${token('color-accent-strong')} calc(${token('surface-gradient-strength')} * 100%),
        ${token('color-accent')}
      ),
      ${token('color-accent')}
    );
    color: ${token('color-accent-text')};
  }

  .variant-danger {
    background: ${token('color-danger')};
    color: ${token('color-danger-text')};
  }

  /* Default gets its bevel from raisedSurface; the filled variants only differ in fill and text. */
  .variant-primary,
  .variant-danger {
    box-shadow: ${raisedShadow};
  }

  .interactive:hover {
    box-shadow: ${raisedHoverShadow};
  }

  .interactive:active {
    box-shadow: ${insetShadow};
  }

  .variant-default.interactive:active {
    background: ${token('color-panel-inset')};
  }

  /* Pressed: content moves 1px down and toward the inline end. */
  .interactive:active .content {
    inset-block-start: 1px;
    inset-inline-start: 1px;
  }

  .disabled {
    background: ${token('color-disabled-fill')};
    box-shadow: ${outlineShadow};
    color: ${token('color-disabled-text')};
    cursor: not-allowed;
  }

  .loading:not(.disabled) {
    cursor: progress;
  }

  ${focusRing('.button')}

  .spinner {
    position: absolute;
    inset: 0;
    margin: auto;
    box-sizing: border-box;
    inline-size: var(--_icon);
    block-size: var(--_icon);
    border: 3px dashed currentcolor;
    border-radius: 50%;
    animation: punk-spin 1s linear infinite;
  }

  @keyframes punk-spin {
    to {
      transform: rotate(1turn);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }

  /* Extends the pointer target to 40px on touch without changing the visual size. */
  @media (pointer: coarse) {
    .button::before {
      content: '';
      position: absolute;
      inset-inline: 0;
      inset-block: min(0px, calc((var(--_h) - 40px) / 2));
    }
  }

  ${forcedColorsSurface('.button', { face: 'ButtonFace', text: 'ButtonText' })}

  @media (forced-colors: active) {
    .disabled {
      color: GrayText;
      border-color: GrayText;
    }
  }
`;
