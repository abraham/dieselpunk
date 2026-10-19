import { css } from 'lit';
import { flatSurface } from '../../styles/surfaces.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { token } from '../../tokens/token.ts';

export const toolbarStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  .toolbar {
    ${flatSurface}
    display: flex;
    align-items: center;
    gap: ${token('space-1')};
    min-inline-size: 0;
    min-block-size: calc(${token('control-height-md')} + 2 * ${token('space-1')});
    padding: ${token('space-1')};
    border-radius: ${token('radius')};
    box-sizing: border-box;
    overflow-x: auto;
  }

  :host([wrap]) .toolbar {
    flex-wrap: wrap;
    overflow: visible;
  }

  ::slotted([data-punk-overflow]) {
    display: none !important;
  }

  ::slotted(*) {
    flex: none;
  }

  :host([wrap]) ::slotted(*) {
    flex: 0 1 auto;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  .overflow {
    flex: none;
    margin-inline-start: auto;
  }

  .overflow[hidden] {
    display: none;
  }

  /* A column as wide as its items; a flex host lets the strip shrink to a limited height. */
  :host([orientation='vertical']) {
    display: flex;
    flex-direction: column;
    inline-size: fit-content;
    max-block-size: 100%;
  }

  :host([orientation='vertical']) .toolbar {
    flex-direction: column;
    min-block-size: 0;
    min-inline-size: calc(${token('control-height-md')} + 2 * ${token('space-1')});
    overflow: hidden auto;
  }

  :host([orientation='vertical']) .overflow {
    margin-inline-start: 0;
    margin-block-start: auto;
  }

  ${forcedColorsSurface('.toolbar')}
`;
