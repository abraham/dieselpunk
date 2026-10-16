import { css } from 'lit';
import { gapStyles } from '../../styles/gap.ts';

export const clusterStyles = css`
  :host {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-inline-size: 0;
  }

  ${gapStyles('--punk-cluster-gap')}

  :host([justify='center']) {
    justify-content: center;
  }

  :host([justify='end']) {
    justify-content: flex-end;
  }

  :host([justify='between']) {
    justify-content: space-between;
  }

  :host([align='start']) {
    align-items: flex-start;
  }

  :host([align='end']) {
    align-items: flex-end;
  }

  :host([align='baseline']) {
    align-items: baseline;
  }

  :host([align='stretch']) {
    align-items: stretch;
  }

  ::slotted(*) {
    min-inline-size: 0;
  }
`;
