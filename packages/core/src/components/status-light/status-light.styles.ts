import { css } from 'lit';
import { insetSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// `--_c` is the private color of the variant, not API. Each variant also has its own shape, so
// color is never the only cue.
export const statusLightStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: ${token('space-2')};
    max-inline-size: 100%;
    vertical-align: middle;
  }

  [hidden] {
    display: none !important;
  }

  .indicator {
    ${insetSurface}
    flex: none;
    display: grid;
    place-items: center;
    inline-size: ${token('icon-size-md')};
    block-size: ${token('icon-size-md')};
    border-radius: ${token('radius')};
    color: var(--_c);
  }

  .shape {
    inline-size: 10px;
    block-size: 10px;
    box-sizing: border-box;
    background: currentColor;
  }

  .variant-neutral {
    --_c: ${token('color-text')};
  }

  .variant-info {
    --_c: ${token('color-info')};
  }

  .variant-success {
    --_c: ${token('color-success')};
  }

  .variant-warning {
    --_c: ${token('color-warning')};
  }

  .variant-danger {
    --_c: ${token('color-danger')};
  }

  .variant-neutral .shape {
    border: 2px solid currentColor;
    border-radius: 50%;
    background: transparent;
  }

  .variant-info .shape {
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  }

  .variant-success .shape {
    border-radius: 50%;
  }

  .variant-warning .shape {
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  .indicator ::slotted(*) {
    max-inline-size: 100%;
    max-block-size: 100%;
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  @media (forced-colors: active) {
    .indicator {
      border: 1px solid CanvasText;
      color: CanvasText;
    }

    .shape {
      forced-color-adjust: none;
    }

    .variant-neutral .shape {
      border-color: CanvasText;
    }

    .variant-info .shape,
    .variant-success .shape,
    .variant-warning .shape,
    .variant-danger .shape {
      background: CanvasText;
    }
  }
`;
