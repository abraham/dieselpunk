import { css } from 'lit';
import { toggleBaseStyles } from '../../internal/toggle-base.styles.ts';
import { raisedHoverShadow } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The box is the control's boundary, `control-edge`, which meets 3:1 on every surface. A checked or
// mixed box is filled with `accent`, and the mark is a shape, so state never rests on color.
export const checkboxStyles = css`
  ${toggleBaseStyles}

  .box {
    flex: none;
    position: relative;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    inline-size: ${token('icon-size-md')};
    block-size: ${token('icon-size-md')};
    border: ${token('border-width')} solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow:
      inset 1px 1px 0 ${token('color-edge-dark')},
      inset -1px -1px 0 ${token('color-edge-light')};
  }

  .control:not(.disabled):hover .box {
    border-color: ${token('color-text')};
  }

  .control:not(.disabled):active .box {
    box-shadow: ${raisedHoverShadow};
  }

  .checked .box,
  .mixed .box {
    background: ${token('color-accent')};
  }

  .mark {
    display: none;
    inline-size: 12px;
    block-size: 12px;
    background: ${token('color-accent-text')};
  }

  .checked .mark {
    display: block;
    clip-path: polygon(14% 50%, 0 64%, 36% 100%, 100% 24%, 86% 10%, 36% 72%);
  }

  .mixed .mark {
    display: block;
    clip-path: polygon(0 38%, 100% 38%, 100% 62%, 0 62%);
  }

  .control.disabled .box {
    border-color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
  }

  .control.disabled .mark {
    background: ${token('color-disabled-text')};
  }

  @media (forced-colors: active) {
    .box {
      border-color: FieldText;
      background: Field;
      box-shadow: none;
    }

    .checked .box,
    .mixed .box {
      background: Highlight;
    }

    .mark {
      background: HighlightText;
    }

    .control.disabled .box {
      border-color: GrayText;
      background: Field;
    }

    .control.disabled .mark {
      background: GrayText;
    }
  }
`;
