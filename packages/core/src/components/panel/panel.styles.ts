import { css } from 'lit';
import { compactDensityTokens, lowDensityTokens } from '../../styles/density.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { flatSurface, insetSurface, raisedSurface } from '../../styles/surfaces.ts';
import { textureOverlay } from '../../styles/texture.ts';
import { token } from '../../tokens/token.ts';

export const panelStyles = css`
  :host {
    display: block;
  }

  /* An author display value would otherwise defeat the UA rule for [hidden]. */
  [hidden] {
    display: none !important;
  }

  /* An explicit density applies to this panel's own subtree, whatever an ancestor set. */
  :host([density='low']) {
    ${lowDensityTokens}
  }

  :host([density='compact']) {
    ${compactDensityTokens}
  }

  .surface {
    position: relative;
    border-radius: ${token('radius')};
    /* A long unbreakable word wraps instead of spilling out of the panel. */
    overflow-wrap: break-word;
  }

  .variant-raised {
    ${raisedSurface}
  }

  .variant-inset {
    ${insetSurface}
  }

  .variant-flat {
    ${flatSurface}
  }

  .variant-raised::before,
  .variant-flat::before {
    ${textureOverlay}
  }

  .header,
  .body,
  .footer {
    position: relative;
  }

  .body {
    padding: var(--punk-panel-padding, ${token('space-3')});
  }

  .header,
  .footer {
    padding: ${token('space-2')} var(--punk-panel-padding, ${token('space-3')});
    background: ${token('color-panel-inset')};
  }

  .header {
    border-start-start-radius: ${token('radius')};
    border-start-end-radius: ${token('radius')};
    border-block-end: 1px solid ${token('color-edge-dark')};
    box-shadow: 0 1px 0 ${token('color-edge-light')};
  }

  .footer {
    border-end-start-radius: ${token('radius')};
    border-end-end-radius: ${token('radius')};
    border-block-start: 1px solid ${token('color-edge-dark')};
    box-shadow: 0 -1px 0 ${token('color-edge-light')};
  }

  ${forcedColorsSurface('.surface')}

  @media (forced-colors: active) {
    .surface::before {
      display: none;
    }

    .header,
    .footer {
      background: Canvas;
      border-color: CanvasText;
      box-shadow: none;
    }
  }
`;
