import { css } from 'lit';
import { token } from '../tokens/token.ts';
import { forcedColorsSurface } from './forced-colors.ts';
import { requiredMarkStyles } from './required-mark.ts';
import { statusLensStyles, warningShapeStyles } from './status-shape.ts';

// The shape of a text, number, or select field:
//
//   .field > .label, .box > (.prefix, .control, .suffix), .hint, .message
//
// The boundary is `control-edge`, which meets 3:1 on every surface, because an empty field has no
// text to identify it (specs/visual-system.md §4.2). It is 1px, so the deeper inner bevel leads
// and the field reads as a recessed well rather than an outlined input. Invalid is a `danger` frame
// plus a dashed boundary under forced colors, and the message is drawn in `text`: `danger` is below
// 3:1 on the panel surfaces, so it is never used for text (specs/visual-system.md §4.2).
export const fieldStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  .field {
    display: grid;
    gap: ${token('space-1')};
    min-inline-size: 0;
  }

  .label {
    font-weight: 600;
    overflow-wrap: break-word;
  }

  ${requiredMarkStyles}

  .box {
    --_frame: 0 0 0 0 transparent;
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    min-inline-size: 0;
    min-block-size: ${token('control-height-md')};
    padding-inline: ${token('space-2')};
    box-sizing: border-box;
    border: 1px solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    color: ${token('color-text')};
    box-shadow:
      var(--_frame),
      inset 0 2px 0 ${token('color-edge-dark')},
      inset 1px 0 0 ${token('color-edge-dark')},
      inset 0 -1px 0 ${token('color-edge-light')};
  }

  .field:not(.disabled) .box:hover {
    border-color: ${token('color-text')};
  }

  .control {
    flex: 1 1 auto;
    inline-size: 100%;
    min-inline-size: 3ch;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .control::placeholder {
    color: ${token('color-text-muted')};
    opacity: 1;
  }

  /* An affix takes at most half the box and wraps within it, rather than push the box wider. */
  .prefix,
  .suffix {
    flex: none;
    display: flex;
    align-items: center;
    max-inline-size: 50%;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    color: ${token('color-text-muted')};
  }

  .hint {
    color: ${token('color-text-muted')};
    font-size: 0.875em;
    overflow-wrap: break-word;
  }

  .message {
    display: flex;
    align-items: flex-start;
    gap: ${token('space-2')};
    color: ${token('color-text')};
    overflow-wrap: break-word;
  }

  .word {
    text-transform: capitalize;
  }

  .field.invalid .box {
    --_frame: inset 0 0 0 2px ${token('color-danger')};
  }

  .field.readonly .box {
    border-style: dashed;
  }

  .field.disabled .box {
    border-color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
    color: ${token('color-disabled-text')};
  }

  .field.disabled .label {
    color: ${token('color-disabled-text')};
  }

  /* The ring is on the box, which holds the native control and the prefix and suffix together. */
  .box::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
  }

  .box:has(.control:focus-visible)::after {
    box-shadow:
      0 0 0 2px ${token('color-focus-inner')},
      0 0 0 4px ${token('color-focus')};
  }

  @media (pointer: coarse) {
    .box {
      min-block-size: max(40px, ${token('control-height-md')});
    }
  }

  ${statusLensStyles}
  ${warningShapeStyles}
  ${forcedColorsSurface('.box', { face: 'Field', text: 'FieldText' })}

  @media (forced-colors: active) {
    .box:has(.control:focus-visible) {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }

    .box:has(.control:focus-visible)::after {
      display: none;
    }

    .field.invalid .box {
      border-style: dashed;
    }

    .field.readonly .box {
      border-style: dotted;
    }

    .field.disabled .box,
    .field.disabled .label {
      border-color: GrayText;
      color: GrayText;
    }

    .control::placeholder {
      color: GrayText;
    }
  }
`;
