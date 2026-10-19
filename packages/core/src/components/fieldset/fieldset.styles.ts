import { css } from 'lit';
import { statusLensStyles, statusShapeStyles } from '../../styles/status-shape.ts';
import { insetSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// An etched frame like a divider's line, with the legend on a nameplate set into its top edge. The
// native legend cuts the border but not the inner light line, so the plate is opaque to cover it.
export const fieldsetStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  ${statusLensStyles}
  ${statusShapeStyles}

  .fieldset {
    display: grid;
    gap: ${token('space-2')};
    min-inline-size: 0;
    margin: 0;
    padding: ${token('space-2')} ${token('space-3')} ${token('space-3')};
    border: 1px solid ${token('color-edge-dark')};
    border-radius: ${token('radius')};
    box-shadow: inset 1px 1px 0 ${token('color-edge-light')};
  }

  .legend {
    ${insetSurface}
    padding-inline: ${token('space-2')};
    border-radius: ${token('radius')};
    font-weight: 600;
    overflow-wrap: break-word;
  }

  .hint {
    color: ${token('color-text-muted')};
    font-size: 0.875em;
    overflow-wrap: break-word;
  }

  .content {
    display: grid;
    gap: ${token('space-2')};
    min-inline-size: 0;
  }

  .error {
    display: flex;
    align-items: flex-start;
    gap: ${token('space-2')};
    overflow-wrap: break-word;
  }

  .fieldset:disabled .legend {
    color: ${token('color-disabled-text')};
  }

  @media (forced-colors: active) {
    .fieldset {
      border-color: CanvasText;
      box-shadow: none;
    }

    .legend {
      background: Canvas;
      box-shadow: none;
    }

    .fieldset:disabled .legend,
    .hint {
      color: GrayText;
    }
  }
`;
