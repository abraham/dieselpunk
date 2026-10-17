import { css } from 'lit';
import { token } from '../tokens/token.ts';
import { forcedColorsSurface } from './forced-colors.ts';
import { insetSurface } from './surfaces.ts';

/**
 * The inset plate that a production stat and a connection row draw their text on. The surface is
 * always `panel-inset`, so `text` and `text-muted` meet their contrast rules wherever the
 * component is put. `.readout-muted` is the quieter text, such as a label.
 */
export const readoutStyles = css`
  .readout {
    ${insetSurface}
    box-sizing: border-box;
    padding: ${token('space-2')} ${token('space-3')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
  }

  .readout-muted {
    color: ${token('color-text-muted')};
  }

  ${forcedColorsSurface('.readout')}

  @media (forced-colors: active) {
    .readout-muted {
      color: inherit;
    }
  }
`;
