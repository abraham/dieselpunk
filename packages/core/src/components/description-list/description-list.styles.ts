import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { insetSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The slot is `display: contents`, so the slotted terms and values are the grid's items. Terms
// are `text-muted` and values `text`, pairs the contrast gate covers on every surface but raised,
// and on the inset variant's own `panel-inset` well.
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

  /* Items stretch so the rules on a term and its value line up; padding stands in for the gap. */
  :host([variant='inset']) dl {
    ${insetSurface}
    align-items: stretch;
    gap: 0;
    padding: ${token('space-1')} ${token('space-3')};
    border-radius: ${token('radius')};
  }

  :host([variant='inset']) ::slotted(dt) {
    padding-inline-end: ${token('space-4')};
  }

  :host([variant='inset']) ::slotted(dt),
  :host([variant='inset']) ::slotted(dd) {
    padding-block: ${token('space-1')};
    border-block-start: 1px solid ${token('color-edge-dark')};
  }

  :host([variant='inset']) ::slotted(:first-child),
  :host([variant='inset']) ::slotted(dd:nth-child(2)) {
    border-block-start: 0;
  }

  ${forcedColorsSurface(":host([variant='inset']) dl")}

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

    /* A term sits above its value here, so only the rule above each term stays. */
    :host([variant='inset']) ::slotted(dd) {
      border-block-start: 0;
    }

    :host([variant='inset']) ::slotted(dt) {
      margin-block-start: 0;
    }
  }
`;
