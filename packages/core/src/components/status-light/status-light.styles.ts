import { css } from 'lit';
import { statusLensStyles, statusShapeStyles } from '../../styles/status-shape.ts';
import { token } from '../../tokens/token.ts';

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

  ${statusLensStyles}
  ${statusShapeStyles}

  .indicator ::slotted(*) {
    max-inline-size: 100%;
    max-block-size: 100%;
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
`;
