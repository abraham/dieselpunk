import { css } from 'lit';
import { token } from '../tokens/token.ts';
import { insetSurface } from './surfaces.ts';

// `--_c` is the private color of the variant, not API. Each variant also has its own shape, so
// color is never the only cue. Shared by the status light, the toast, and a field's message.
export const statusLensStyles = css`
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

  @media (forced-colors: active) {
    .indicator {
      border: 1px solid CanvasText;
      color: CanvasText;
    }
  }
`;

export const statusShapeStyles = css`
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

  @media (forced-colors: active) {
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
