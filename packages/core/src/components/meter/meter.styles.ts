import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { insetShadow } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// `--_c`, `--_gap`, `--_trough`, `--_segments`, and `--_lit` are private, not API. Patterns, not
// color, tell the states apart: solid, diagonal hatching, and cross-hatching.
export const meterStyles = css`
  :host {
    display: block;
  }

  :host([orientation='vertical']) {
    display: inline-block;
  }

  [hidden] {
    display: none !important;
  }

  .meter {
    display: grid;
    row-gap: ${token('space-1')};
  }

  .header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 ${token('space-2')};
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  /* Kept in the accessibility tree: the label still names the meter when nothing shows above it. */
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

  .track {
    --_trough: ${token('color-panel-inset')};
    position: relative;
    overflow: hidden;
    border-radius: ${token('radius')};
    background: var(--_trough);
  }

  .horizontal .track {
    block-size: var(--punk-meter-thickness, calc(${token('control-height-sm')} * 0.6));
  }

  .vertical .track {
    inline-size: var(--punk-meter-thickness, calc(${token('control-height-sm')} * 0.6));
    block-size: var(--punk-meter-length, calc(${token('control-height-lg')} * 3));
  }

  /* The bevel sits above the fill so a full meter still shows its edge. */
  .track::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: ${insetShadow};
  }

  .fill {
    --_gap: var(--_trough);
    position: absolute;
    transition-duration: ${token('duration-normal')};
    transition-timing-function: ease-out;
  }

  .horizontal .fill {
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: calc(var(--_lit) / var(--_segments) * 100%);
    transition-property: inline-size;
  }

  .vertical .fill {
    inset-inline: 0;
    inset-block-end: 0;
    block-size: calc(var(--_lit) / var(--_segments) * 100%);
    transition-property: block-size;
  }

  .fill.state-none {
    --_c: ${token('color-accent')};
    background: var(--_c);
  }

  .fill.state-optimal {
    --_c: ${token('color-success')};
    background: var(--_c);
  }

  .fill.state-suboptimal {
    --_c: ${token('color-warning')};
    background: repeating-linear-gradient(135deg, var(--_c) 0 5px, var(--_gap) 5px 8px);
  }

  .fill.state-critical {
    --_c: ${token('color-danger')};
    background:
      repeating-linear-gradient(45deg, var(--_c) 0 3px, transparent 3px 5px),
      repeating-linear-gradient(135deg, var(--_c) 0 3px, var(--_gap) 3px 5px);
  }

  /* Trough-colored lines over the fill and the trough cut it into segments. */
  .segments {
    position: absolute;
    inset: 0;
    pointer-events: none;
    --_end: calc(100% / var(--_segments));
    --_cut: calc(var(--_end) - ${token('border-width')});
  }

  .horizontal .segments {
    background: repeating-linear-gradient(
      to right,
      transparent 0 var(--_cut),
      var(--_trough) var(--_cut) var(--_end)
    );
  }

  :host(:dir(rtl)) .horizontal .segments {
    background: repeating-linear-gradient(
      to left,
      transparent 0 var(--_cut),
      var(--_trough) var(--_cut) var(--_end)
    );
  }

  .vertical .segments {
    background: repeating-linear-gradient(
      to top,
      transparent 0 var(--_cut),
      var(--_trough) var(--_cut) var(--_end)
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }
  }

  ${forcedColorsSurface('.track')}

  @media (forced-colors: active) {
    .track {
      --_trough: Canvas;
    }

    .track::after {
      display: none;
    }

    /* Two classes to match the state rules above, which would otherwise win. */
    .track .fill {
      forced-color-adjust: none;
      --_c: Highlight;
      --_gap: Canvas;
    }

    .track .segments {
      forced-color-adjust: none;
    }

    .value {
      color: CanvasText;
    }
  }
`;
