import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { insetShadow } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// `--_c` and `--_gap` are private per-variant colors, not API. Patterns, not color, tell the
// variants apart, so each one reads the same two colors through a different pattern.
export const progressBarStyles = css`
  :host {
    display: block;
  }

  .progress {
    display: grid;
    row-gap: ${token('space-1')};
  }

  .header {
    display: flex;
    align-items: baseline;
    gap: ${token('space-2')};
  }

  /* Kept in the accessibility tree: the label still names the bar when nothing shows above it. */
  .header.collapsed,
  .label.hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .value {
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
    color: ${token('color-text-muted')};
  }

  [hidden] {
    display: none !important;
  }

  .track {
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
    block-size: var(--punk-progress-height, calc(${token('control-height-sm')} * 0.6));
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
  }

  /* The bevel sits above the fill so a full bar still shows its edge. */
  .track::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: ${insetShadow};
  }

  .fill {
    --_gap: ${token('color-panel-inset')};
    block-size: 100%;
    inline-size: calc(var(--_ratio, 1) * 100%);
    transition: inline-size ${token('duration-normal')} ease-out;
  }

  .fill.variant-default {
    --_c: ${token('color-accent')};
    background-color: var(--_c);
  }

  .fill.variant-success {
    --_c: ${token('color-success')};
    background: repeating-linear-gradient(90deg, var(--_c) 0 6px, var(--_gap) 6px 8px);
  }

  .fill.variant-warning {
    --_c: ${token('color-warning')};
    background: repeating-linear-gradient(135deg, var(--_c) 0 5px, var(--_gap) 5px 8px);
  }

  .fill.variant-danger {
    --_c: ${token('color-danger')};
    background:
      repeating-linear-gradient(45deg, var(--_c) 0 3px, transparent 3px 5px),
      repeating-linear-gradient(135deg, var(--_c) 0 3px, var(--_gap) 3px 5px);
  }

  /* Indeterminate: a full-width hazard stripe that scrolls. The tile is square, so it loops. */
  .fill.indeterminate {
    inline-size: 100%;
    background: linear-gradient(
        45deg,
        var(--_c) 25%,
        var(--_gap) 25% 50%,
        var(--_c) 50% 75%,
        var(--_gap) 75%
      )
      0 0 / 16px 16px;
    animation: punk-progress-slide 0.8s linear infinite;
  }

  @keyframes punk-progress-slide {
    to {
      background-position: 16px 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }

    .fill.indeterminate {
      animation: none;
    }
  }

  ${forcedColorsSurface('.track')}

  @media (forced-colors: active) {
    .track::after {
      display: none;
    }

    /* Two classes to match the variant rules above, which would otherwise win. */
    .track .fill {
      forced-color-adjust: none;
      --_c: Highlight;
      --_gap: Canvas;
    }

    .value {
      color: CanvasText;
    }
  }
`;
