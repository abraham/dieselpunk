import { css } from 'lit';
import { readoutStyles } from '../../styles/readout.ts';
import { visuallyHidden } from '../../styles/visually-hidden.ts';
import { token } from '../../tokens/token.ts';

// The whole stat is a readout plate, so its text meets the contrast rules wherever it is put.
export const productionStatStyles = css`
  ${readoutStyles}
  ${visuallyHidden}

  :host {
    display: block;
  }

  [hidden] {
    display: none !important;
  }

  .stat {
    display: grid;
    gap: ${token('space-1')} ${token('space-3')};
  }

  .stat.inline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
  }

  .head {
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    min-inline-size: 0;
  }

  /* The label's own width, so the figures go under it before a word of it is split. */
  .inline .head {
    flex: 1 1 auto;
    max-inline-size: 100%;
  }

  /* After the label in the document, before it on screen. */
  .icon {
    order: -1;
    flex: none;
    display: inline-flex;
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .figures {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: flex-end;
    gap: 0 ${token('space-2')};
    max-inline-size: 100%;
    overflow-wrap: anywhere;
  }

  .inline .figures {
    flex: 0 0 auto;
    margin-inline-start: auto;
  }

  /* Monospaced: not every font has tabular figures, and the width must not depend on digits. */
  .value,
  .unit,
  .delta {
    font-family: ${token('font-mono')};
    font-variant-numeric: tabular-nums;
  }

  .value {
    min-inline-size: var(--punk-stat-value-min, 4ch);
    font-size: 1.25em;
    font-weight: 700;
    text-align: end;
  }

  .trend {
    display: inline-flex;
    align-items: center;
  }

  .glyph {
    inline-size: 0.75em;
    block-size: 0.75em;
    background: currentColor;
  }

  .trend-up .glyph {
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  .trend-down .glyph {
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .trend-flat .glyph {
    clip-path: polygon(0 35%, 100% 35%, 100% 65%, 0 65%);
  }

  .sparkline {
    inline-size: var(--punk-stat-sparkline-size, calc(${token('control-height-md')} * 2));
    max-inline-size: 100%;
  }

  .sparkline ::slotted(*) {
    display: block;
    inline-size: 100%;
  }

  @media (forced-colors: active) {
    .glyph {
      background: CanvasText;
    }
  }
`;
