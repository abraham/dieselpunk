import { css } from 'lit';

export const selectableStyles = css`
  :host {
    position: relative;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  :host([disabled]) {
    cursor: not-allowed;
  }

  /* Neighbors in a grid would otherwise share extended hit areas, so a small item grows instead. */
  @media (pointer: coarse) {
    :host {
      min-inline-size: 40px;
      min-block-size: 40px;
    }
  }
`;
