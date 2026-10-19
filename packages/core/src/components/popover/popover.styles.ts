import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { flatSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

export const popoverStyles = css`
  /* Keeps the host out of layout while its shadow content still renders. */
  :host {
    display: contents;
  }

  /* Visible only while open, in or out of the top layer, so the fallback needs no extra rule. */
  .surface {
    display: none;
    position: fixed;
    inset: auto;
    margin: 0;
    border: 0;
    box-sizing: border-box;
    z-index: ${token('z-overlay')};
    inline-size: max-content;
    max-inline-size: min(var(--punk-popover-max-width, 320px), calc(100vw - 16px));
    max-block-size: calc(100vh - 16px);
    padding: ${token('space-3')};
    overflow: auto;
    overflow-wrap: break-word;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    ${flatSurface}
  }

  .surface.open {
    display: block;
  }

  :host([mode='menu']) .surface {
    padding: ${token('space-1')};
  }

  .surface:focus-visible {
    outline: 2px solid ${token('color-focus')};
    outline-offset: -2px;
  }

  ${forcedColorsSurface('.surface')}
`;
