import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { flatSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The toolbar's flat strip, wrapping rather than scrolling; the items are menu items, which draw
// their own focus and hover.
export const menubarStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  .bar {
    ${flatSurface}
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    min-inline-size: 0;
    padding: 2px;
    border-radius: ${token('radius')};
    box-sizing: border-box;
  }

  ::slotted(punk-menu-item) {
    flex: 0 1 auto;
    min-inline-size: 0;
  }

  ${forcedColorsSurface('.bar')}
`;
