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

// `--_h` and `--_icon` are private aliases set per size, and `--_fill` per filled variant; they are
// not part of the public API.
export const buttonBaseStyles = css`
  :host {
    display: inline-flex;
    position: relative;
    vertical-align: middle;
    /* A long label wraps instead of widening the page, which would fail reflow at 200% zoom. */
    max-inline-size: 100%;
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
    min-block-size: var(--_h);
    margin: 0;
    padding-block: 0;
    padding-inline: var(--punk-button-padding-inline, ${token('space-3')});
    border: 0;
    border-radius: ${token('radius')};
    appearance: none;
    font: inherit;
    font-weight: 600;
    overflow-wrap: break-word;
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
    min-inline-size: 0;
    text-align: center;
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
    --_fill: ${token('color-accent')};
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
    --_fill: ${token('color-danger')};
    background: var(--_fill);
    color: ${token('color-danger-text')};
  }

  .variant-confirm {
    --_fill: ${token('color-success')};
    background: var(--_fill);
    color: ${token('color-success-text')};
  }

  /* Default gets its bevel from raisedSurface; the filled variants only differ in fill and text. */
  .filled {
    box-shadow: ${raisedShadow};
  }

  .interactive:hover {
    box-shadow: ${raisedHoverShadow};
  }

  .interactive:active {
    box-shadow: ${insetShadow};
  }

  /* Hover lights the default button with the accent; press mixes the fill toward the text. */
  .variant-default.interactive:hover {
    background: ${token('color-accent')};
    color: ${token('color-accent-text')};
  }

  .variant-default.interactive:active {
    background: color-mix(in srgb, ${token('color-accent')}, ${token('color-text')} 45%);
    color: ${token('color-accent-text')};
  }

  /* The contrast gate checks each fill's text on these two mixes (visual-system.md §4.1). */
  .filled.interactive:hover {
    background: color-mix(in srgb, var(--_fill), ${token('color-text')} 25%);
  }

  .filled.interactive:active {
    background: color-mix(in srgb, var(--_fill), ${token('color-text')} 45%);
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

  /* A disabled filled button keeps a trace of its fill, so its kind still shows. */
  .disabled.filled {
    background: color-mix(in srgb, var(--_fill) 30%, ${token('color-disabled-fill')});
    color: color-mix(in srgb, var(--_fill) 45%, ${token('color-disabled-text')});
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
    .disabled,
    .disabled.filled {
      color: GrayText;
      border-color: GrayText;
    }

    /* Colors are not available here, so the variants differ by border instead. */
    .variant-primary {
      border-width: 4px;
    }

    .variant-danger {
      border-style: dashed;
    }

    .variant-confirm {
      border-width: 4px;
      border-style: double;
    }
  }
`;
