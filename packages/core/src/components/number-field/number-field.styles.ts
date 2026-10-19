import { css } from 'lit';
import { fieldStyles } from '../../styles/field.ts';
import { raisedHoverShadow, raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The steppers are for a pointer: the arrow keys and typing already serve everyone else. They sit at
// the end of the box, flush with its edge, and are 40px targets under a coarse pointer.
export const numberFieldStyles = css`
  ${fieldStyles}

  .control {
    appearance: textfield;
    -moz-appearance: textfield;
    font-variant-numeric: tabular-nums;
  }

  .control::-webkit-inner-spin-button,
  .control::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .steppers {
    align-self: stretch;
    flex: none;
    display: flex;
    flex-direction: column;
    margin-inline-end: calc(-1 * ${token('space-2')});
    border-inline-start: 1px solid ${token('color-control-edge')};
  }

  .steppers[hidden] {
    display: none;
  }

  .stepper {
    ${raisedSurface}
    position: relative;
    flex: 1 1 0;
    display: grid;
    place-items: center;
    inline-size: 28px;
    min-block-size: 0;
    padding: 0;
    border: 0;
    color: ${token('color-text')};
    cursor: pointer;
  }

  .stepper + .stepper {
    border-block-start: 1px solid ${token('color-control-edge')};
  }

  .stepper:hover {
    box-shadow: ${raisedHoverShadow};
  }

  .stepper:active {
    background: ${token('color-panel-inset')};
  }

  .stepper .glyph {
    inline-size: 10px;
    block-size: 6px;
    background: currentColor;
  }

  .stepper.up .glyph {
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  .stepper.down .glyph {
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .field.disabled .stepper,
  .field.readonly .stepper {
    cursor: default;
    color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
  }

  @media (pointer: coarse) {
    .stepper {
      inline-size: 40px;
    }
  }

  @media (forced-colors: active) {
    .steppers,
    .stepper + .stepper {
      border-color: FieldText;
    }

    .stepper {
      background: ButtonFace;
      color: ButtonText;
      box-shadow: none;
    }

    .stepper .glyph {
      background: ButtonText;
    }

    .field.disabled .stepper,
    .field.readonly .stepper {
      color: GrayText;
    }

    .field.disabled .stepper .glyph,
    .field.readonly .stepper .glyph {
      background: GrayText;
    }
  }
`;
