import { css } from 'lit';
import { token } from '../../tokens/token.ts';

export const tableStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  .scroller {
    position: relative;
    max-block-size: var(--punk-table-max-height, none);
    overflow: auto;
    border-radius: ${token('radius')};
    box-shadow: 0 0 0 ${token('border-width')} ${token('color-edge-dark')};
  }

  .scroller:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${token('color-focus-inner')},
      0 0 0 4px ${token('color-focus')};
  }

  @media (forced-colors: active) {
    .scroller {
      border: 1px solid CanvasText;
    }

    .scroller:focus-visible {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }
  }
`;

// The rules for the application's light-DOM table. Each selector is inside `:where()`, so it has
// no specificity and any rule of the application's wins. A sorted column's button shows a triangle
// for its direction and an unsorted one a pair, and a selected row has an `accent` bar on its start
// edge, so neither state rests on color.
export const tableContentCss = css`
  :where(punk-table > table) {
    inline-size: 100%;
    border-collapse: separate;
    border-spacing: 0;
    color: ${token('color-text')};
    font-variant-numeric: tabular-nums;
  }

  :where(punk-table > table > caption) {
    padding: ${token('space-2')} ${token('space-3')};
    font-weight: 700;
    text-align: start;
    background: ${token('color-panel')};
  }

  :where(punk-table > table th, punk-table > table td) {
    padding: ${token('space-1')} ${token('space-3')};
    border-block-end: 1px solid ${token('color-edge-dark')};
    text-align: start;
    vertical-align: middle;
  }

  :where(punk-table > table > tbody > tr > *, punk-table > table > tfoot > tr > *) {
    background: ${token('color-panel-inset')};
  }

  :where(punk-table > table > thead > tr > *) {
    position: sticky;
    inset-block-start: 0;
    z-index: 1;
    background: ${token('color-panel')};
    box-shadow: inset 0 -1px 0 ${token('color-edge-light')};
    font-weight: 600;
    white-space: nowrap;
  }

  :where(punk-table > table > tbody > tr[data-selected] > *) {
    background: ${token('color-panel')};
  }

  :where(punk-table > table > tbody > tr[data-selected] > :first-child) {
    box-shadow: inset 3px 0 0 ${token('color-accent')};
  }

  /* The application's native checkboxes would otherwise be the platform's blue. */
  :where(punk-table > table input[type='checkbox']) {
    accent-color: ${token('color-accent')};
  }

  :where(punk-table > table th[data-sort] button) {
    display: inline-flex;
    align-items: center;
    gap: ${token('space-1')};
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  :where(punk-table > table th[data-sort] button)::after {
    content: '';
    flex: none;
    inline-size: 8px;
    block-size: 10px;
    background: currentColor;
    clip-path: polygon(50% 0, 100% 40%, 0 40%, 0 60%, 100% 60%, 50% 100%);
    opacity: 0.6;
  }

  :where(punk-table > table th[aria-sort='ascending'] button)::after {
    clip-path: polygon(50% 0, 100% 60%, 0 60%);
    opacity: 1;
  }

  :where(punk-table > table th[aria-sort='descending'] button)::after {
    clip-path: polygon(0 40%, 100% 40%, 50% 100%);
    opacity: 1;
  }

  :where(punk-table > table th[data-sort] button:focus-visible) {
    outline: 2px solid ${token('color-focus')};
    outline-offset: 2px;
  }

  @media (forced-colors: active) {
    :where(punk-table > table th, punk-table > table td) {
      border-color: CanvasText;
    }

    :where(punk-table > table > tbody > tr[data-selected] > :first-child) {
      border-inline-start: 3px solid Highlight;
    }

    :where(punk-table > table th[data-sort] button)::after {
      background: ButtonText;
    }
  }
`.cssText;
