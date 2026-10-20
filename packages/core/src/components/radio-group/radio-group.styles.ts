import { css } from 'lit';
import { toggleBaseStyles } from '../../internal/toggle-base.styles.ts';
import { requiredMarkStyles } from '../../styles/required-mark.ts';
import { statusLensStyles, warningShapeStyles } from '../../styles/status-shape.ts';
import { raisedHoverShadow } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The ring is the control's boundary, `control-edge`, as a checkbox's box is. A checked ring holds
// a dot, so the state is a shape and not only a color.
export const radioStyles = css`
  ${toggleBaseStyles}

  .ring {
    flex: none;
    position: relative;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    inline-size: ${token('icon-size-md')};
    block-size: ${token('icon-size-md')};
    border: ${token('border-width')} solid ${token('color-control-edge')};
    border-radius: 50%;
    background: ${token('color-panel-inset')};
    box-shadow:
      inset 1px 1px 0 ${token('color-edge-dark')},
      inset -1px -1px 0 ${token('color-edge-light')};
  }

  .control:not(.disabled):hover .ring {
    border-color: ${token('color-text')};
  }

  .control:not(.disabled):active .ring {
    box-shadow: ${raisedHoverShadow};
  }

  .control {
    border-radius: 999px;
  }

  .dot {
    display: none;
    inline-size: 10px;
    block-size: 10px;
    border-radius: 50%;
    background: ${token('color-accent')};
  }

  .checked .dot {
    display: block;
  }

  .control.disabled .ring {
    border-color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
  }

  .control.disabled .dot {
    background: ${token('color-disabled-text')};
  }

  @media (forced-colors: active) {
    .ring {
      border-color: FieldText;
      background: Field;
      box-shadow: none;
    }

    .dot {
      background: Highlight;
    }

    .control.disabled .ring {
      border-color: GrayText;
    }

    .control.disabled .dot {
      background: GrayText;
    }
  }
`;

export const radioGroupStyles = css`
  :host {
    display: grid;
    gap: ${token('space-1')};
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  ${statusLensStyles}
  ${warningShapeStyles}

  .label {
    font-weight: 600;
    overflow-wrap: break-word;
  }

  ${requiredMarkStyles}

  .hint {
    color: ${token('color-text-muted')};
    font-size: 0.875em;
    overflow-wrap: break-word;
  }

  .radios {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${token('space-1')};
    min-inline-size: 0;
  }

  .radios.horizontal {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    column-gap: ${token('space-3')};
  }

  .radios.disabled + .message,
  :host([disabled]) .label {
    color: ${token('color-disabled-text')};
  }

  .message {
    display: flex;
    align-items: flex-start;
    gap: ${token('space-2')};
    overflow-wrap: break-word;
  }

  .word {
    text-transform: capitalize;
  }

  @media (forced-colors: active) {
    .hint,
    :host([disabled]) .label {
      color: GrayText;
    }
  }
`;
