import { css } from 'lit';
import { gapStyles } from '../../styles/gap.ts';

export const stackStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  ${gapStyles('--punk-stack-gap')}

  :host([align='start']) {
    align-items: flex-start;
  }

  :host([align='center']) {
    align-items: center;
  }

  :host([align='end']) {
    align-items: flex-end;
  }

  ::slotted(*) {
    min-inline-size: 0;
    max-inline-size: 100%;
  }
`;
