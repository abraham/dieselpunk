import { css } from 'lit';
import { token } from '../../tokens/token.ts';

// `--_c` and `--_gap` are private per-level colors, not API. Patterns, not color, tell the levels
// apart: solid stripes, diagonal hatching, and cross-hatching, as in the progress bar.
export const itemStackStyles = css`
  .count {
    position: absolute;
    inset-inline-end: 1px;
    inset-block-end: 1px;
    max-inline-size: calc(100% - 2px);
    padding-inline: 2px;
    overflow: hidden;
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    color: ${token('color-text')};
    font: 600 11px/14px ${token('font-mono')};
    font-variant-numeric: tabular-nums;
    /* Digits read left to right in every language, so a cut count loses its end, not its start. */
    direction: ltr;
    unicode-bidi: isolate;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  .count.above-bar {
    inset-block-end: 6px;
  }

  .durability {
    position: absolute;
    inset-inline: 1px;
    inset-block-end: 1px;
    block-size: 4px;
    overflow: hidden;
    background: ${token('color-panel-inset')};
    pointer-events: none;
  }

  .durability-fill {
    --_gap: ${token('color-panel-inset')};
    block-size: 100%;
    inline-size: calc(var(--_ratio, 0) * 100%);
    transition: inline-size ${token('duration-normal')} ease-out;
  }

  .level-ok {
    --_c: ${token('color-success')};
    background: repeating-linear-gradient(90deg, var(--_c) 0 6px, var(--_gap) 6px 8px);
  }

  .level-low {
    --_c: ${token('color-warning')};
    background: repeating-linear-gradient(135deg, var(--_c) 0 5px, var(--_gap) 5px 8px);
  }

  .level-critical {
    --_c: ${token('color-danger')};
    background:
      repeating-linear-gradient(45deg, var(--_c) 0 3px, transparent 3px 5px),
      repeating-linear-gradient(135deg, var(--_c) 0 3px, var(--_gap) 3px 5px);
  }

  .quality {
    position: absolute;
    inset-block-start: 1px;
    inset-inline-start: 1px;
    display: flex;
    gap: 1px;
    padding: 1px;
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    pointer-events: none;
  }

  .diamond {
    inline-size: 4px;
    block-size: 4px;
    background: ${token('color-text')};
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  }

  @media (prefers-reduced-motion: reduce) {
    .durability-fill {
      transition: none;
    }
  }

  @media (forced-colors: active) {
    .durability {
      outline: 1px solid CanvasText;
    }

    /* Two classes to match the level rules above, which would otherwise win. */
    .durability .durability-fill {
      forced-color-adjust: none;
      --_c: Highlight;
      --_gap: Canvas;
    }

    .diamond {
      forced-color-adjust: none;
      background: CanvasText;
    }
  }
`;
