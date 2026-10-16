import { css } from 'lit';
import { toggleBaseStyles } from '../../internal/toggle-base.styles.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The track is the control's boundary, `control-edge`. On is the thumb at the end with a bar and an
// `accent` track, off is the thumb at the start with a ring, so the state is a position and a shape.
export const switchStyles = css`
  ${toggleBaseStyles}

  .track {
    flex: none;
    position: relative;
    box-sizing: border-box;
    inline-size: 44px;
    block-size: 24px;
    border: ${token('border-width')} solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow:
      inset 1px 1px 0 ${token('color-edge-dark')},
      inset -1px -1px 0 ${token('color-edge-light')};
  }

  .control:not(.disabled):hover .track {
    border-color: ${token('color-text')};
  }

  .on .track {
    background: ${token('color-accent')};
  }

  .thumb {
    ${raisedSurface}
    position: absolute;
    inset-block: 2px;
    inset-inline-start: 2px;
    inline-size: 18px;
    display: grid;
    place-items: center;
    border-radius: ${token('radius')};
    transition: inset-inline-start ${token('duration-fast')} ease-out;
  }

  .on .thumb {
    inset-inline-start: calc(100% - 20px);
  }

  .mark {
    box-sizing: border-box;
    inline-size: 8px;
    block-size: 8px;
    border: 2px solid ${token('color-text')};
    border-radius: 50%;
  }

  .on .mark {
    inline-size: 2px;
    block-size: 10px;
    border: 0;
    border-radius: 0;
    background: ${token('color-text')};
  }

  .control.disabled .track {
    border-color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
  }

  .control.disabled .thumb {
    background: ${token('color-disabled-fill')};
    box-shadow: inset 0 0 0 1px ${token('color-disabled-text')};
  }

  .control.disabled .mark {
    border-color: ${token('color-disabled-text')};
  }

  .control.disabled.on .mark {
    background: ${token('color-disabled-text')};
  }

  @media (prefers-reduced-motion: reduce) {
    .thumb {
      transition: none;
    }
  }

  @media (forced-colors: active) {
    .track {
      border-color: FieldText;
      background: Field;
      box-shadow: none;
    }

    .on .track {
      background: Highlight;
    }

    .thumb {
      border: 2px solid ButtonText;
      background: ButtonFace;
      box-shadow: none;
    }

    .mark {
      border-color: ButtonText;
    }

    .on .mark {
      background: ButtonText;
    }

    .control.disabled .track,
    .control.disabled .thumb {
      border-color: GrayText;
    }

    .control.disabled .track {
      background: Field;
    }

    .control.disabled .mark {
      border-color: GrayText;
    }

    .control.disabled.on .mark {
      background: GrayText;
    }
  }
`;
