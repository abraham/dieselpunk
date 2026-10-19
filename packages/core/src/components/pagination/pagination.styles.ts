import { css } from 'lit';
import { focusRing } from '../../styles/focus.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { raisedHoverShadow, raisedSurface, selectedShadow } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The current page is set into the strip (the inset bevel) with a warm outline, the same marker as
// a pressed toggle and a selected slot, so it differs from the raised buttons by shape and color.
export const paginationStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  .list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('space-1')};
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .button {
    ${raisedSurface}
    position: relative;
    display: inline-grid;
    place-items: center;
    min-inline-size: ${token('control-height-sm')};
    min-block-size: ${token('control-height-sm')};
    padding: 0 ${token('space-1')};
    border: 0;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font: inherit;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .button:hover:not(:disabled, [aria-current='page']) {
    box-shadow: ${raisedHoverShadow};
  }

  .button[aria-current='page'] {
    background: ${token('color-panel-inset')};
    box-shadow: ${selectedShadow};
    font-weight: 700;
  }

  .button:disabled {
    background: ${token('color-disabled-fill')};
    box-shadow: none;
    color: ${token('color-disabled-text')};
    cursor: not-allowed;
  }

  .arrow {
    inline-size: 8px;
    block-size: 10px;
    background: currentColor;
    clip-path: polygon(100% 0, 0 50%, 100% 100%);
  }

  .next .arrow,
  :host(:dir(rtl)) .previous .arrow {
    transform: scaleX(-1);
  }

  :host(:dir(rtl)) .next .arrow {
    transform: none;
  }

  .gap {
    min-inline-size: 16px;
    text-align: center;
    color: ${token('color-text-muted')};
  }

  @media (pointer: coarse) {
    .button {
      min-inline-size: 40px;
      min-block-size: 40px;
    }
  }

  ${focusRing('.button')}
  ${forcedColorsSurface('.button', { face: 'ButtonFace', text: 'ButtonText' })}

  @media (forced-colors: active) {
    .button[aria-current='page'] {
      border-width: 4px;
      border-style: double;
    }

    .button:disabled {
      border-color: GrayText;
      color: GrayText;
    }

    .arrow {
      background: ButtonText;
    }
  }
`;
