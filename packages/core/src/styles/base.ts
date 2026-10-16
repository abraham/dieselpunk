import { css } from 'lit';
import { token } from '../tokens/token.ts';

export const baseStyles = css`
  :host {
    box-sizing: border-box;
    font-family: ${token('font-family')};
    color: ${token('color-text')};
  }

  :host([hidden]) {
    display: none !important;
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;
