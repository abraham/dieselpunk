import { css } from 'lit';
import { token } from '../../tokens/token.ts';

// The slot is `display: contents`, so the slotted terms and values are the grid's items. Terms
// are `text-muted` and values `text`, pairs the contrast gate covers on every surface but raised.
export const descriptionListStyles = css`
  :host {
    display: block;
    container-type: inline-size;
  }

  dl {
    display: grid;
    grid-template-columns: fit-content(40%) minmax(0, 1fr);
    align-items: baseline;
    column-gap: ${token('space-4')};
    row-gap: ${token('space-2')};
    margin: 0;
  }

  ::slotted(dt) {
    grid-column: 1;
    margin: 0;
    color: ${token('color-text-muted')};
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  ::slotted(dd) {
    grid-column: 2;
    min-inline-size: 0;
    margin: 0;
    color: ${token('color-text')};
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  @container (inline-size < 320px) {
    dl {
      grid-template-columns: minmax(0, 1fr);
      row-gap: 0;
    }

    ::slotted(dt) {
      margin-block-start: ${token('space-2')};
    }

    ::slotted(dt:first-child) {
      margin-block-start: 0;
    }

    ::slotted(dd) {
      grid-column: 1;
    }
  }
`;
