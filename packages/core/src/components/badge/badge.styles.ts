import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { statusShapeStyles } from '../../styles/status-shape.ts';
import { insetSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The plate is `panel-inset`, so its text is covered by the contrast gate, and the shapes use the
// same colors on the same surface as a status light's lens. It is the tag's inset plate, whose light
// lower lip keeps it visible on the canvas, and its text is bold so a count reads at a glance.
export const badgeStyles = css`
  :host {
    display: inline-flex;
    max-inline-size: 100%;
    vertical-align: middle;
  }

  [hidden] {
    display: none !important;
  }

  ${statusShapeStyles}

  .badge {
    display: inline-flex;
    align-items: center;
    gap: ${token('space-1')};
    min-inline-size: 20px;
    min-block-size: 20px;
    max-inline-size: 100%;
    padding: 0 ${token('space-1')};
    box-sizing: border-box;
    justify-content: center;
    border-radius: ${token('radius')};
    ${insetSurface}
    color: ${token('color-text')};
    font-family: ${token('font-mono')};
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  .shape {
    flex: none;
    inline-size: 8px;
    block-size: 8px;
    color: var(--_c);
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  ${forcedColorsSurface('.badge')}
`;
