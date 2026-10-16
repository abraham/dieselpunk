import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

export const tooltipStyles = css`
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
    max-inline-size: min(
      var(--punk-tooltip-max-width, ${token('tooltip-max-width')}),
      calc(100vw - 16px)
    );
    padding: ${token('space-1')} ${token('space-2')};
    overflow: visible;
    overflow-wrap: break-word;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font-size: 0.875em;
    ${raisedSurface}
  }

  .surface.open {
    display: block;
  }

  ${forcedColorsSurface('.surface')}
`;
