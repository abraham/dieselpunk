import { css } from 'lit';
import { hostFocusRing } from '../styles/focus.ts';
import { requiredMarkStyles } from '../styles/required-mark.ts';
import { token } from '../tokens/token.ts';

// What a checkbox and a switch share: the host, the row of control and label, the focus ring, the
// disabled look, and a larger target for a coarse pointer. The control itself is each one's own.
export const toggleBaseStyles = css`
  :host {
    display: inline-flex;
    max-inline-size: 100%;
    vertical-align: middle;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  :host([hidden]) {
    display: none;
  }

  ${requiredMarkStyles}

  [hidden] {
    display: none !important;
  }

  .control {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: ${token('space-2')};
    min-inline-size: 0;
    max-inline-size: 100%;
    min-block-size: ${token('control-height-sm')};
    box-sizing: border-box;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    user-select: none;
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .control.disabled {
    color: ${token('color-disabled-text')};
    cursor: default;
  }

  @media (pointer: coarse) {
    .control {
      min-block-size: 40px;
    }
  }

  ${hostFocusRing('.control')}

  @media (forced-colors: active) {
    .control.disabled {
      color: GrayText;
    }
  }
`;
