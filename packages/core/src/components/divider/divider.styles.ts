import { css } from 'lit';
import { token } from '../../tokens/token.ts';

export const dividerStyles = css`
  :host {
    display: flex;
    align-items: center;
    gap: var(--punk-divider-gap, ${token('space-2')});
  }

  :host([orientation='vertical']) {
    display: block;
    align-self: stretch;
    inline-size: ${token('border-width')};
    min-block-size: 1em;
  }

  /* An author display value would otherwise defeat the UA rule for [hidden]. */
  [hidden] {
    display: none !important;
  }

  /* Etched: a dark line with a light line beside it. */
  .line {
    flex: 1 1 0;
    min-inline-size: 0;
    block-size: 0;
    border-block-start: 1px solid ${token('color-edge-dark')};
    border-block-end: 1px solid ${token('color-edge-light')};
  }

  :host([orientation='vertical']) .line {
    block-size: 100%;
    inline-size: 0;
    border-block: 0;
    border-inline-start: 1px solid ${token('color-edge-dark')};
    border-inline-end: 1px solid ${token('color-edge-light')};
  }

  .label {
    min-inline-size: 0;
    color: ${token('color-text-muted')};
    text-align: center;
    overflow-wrap: break-word;
  }
`;
