import { css } from 'lit';
import {
  insetShadow,
  raisedShadow,
  raisedHoverShadow,
  selectedShadow,
} from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The buttons are the application's light-DOM `<button>` elements, styled through `::slotted`. A
// pressed button is set into the strip (the inset bevel) with a warm outline, the same marker as
// the current page and a selected slot, so it differs from a raised one by shape as well as color.
export const toggleGroupStyles = css`
  :host {
    display: inline-block;
    max-inline-size: 100%;
    vertical-align: middle;
  }

  .group {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px;
    max-inline-size: 100%;
    padding: 2px;
    box-sizing: border-box;
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow: ${insetShadow};
  }

  ::slotted(button) {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${token('space-1')};
    min-block-size: ${token('control-height-sm')};
    min-inline-size: ${token('control-height-sm')};
    max-inline-size: 100%;
    margin: 0;
    padding: 0 ${token('space-2')};
    box-sizing: border-box;
    border: 0;
    border-radius: ${token('radius')};
    background: ${token('color-panel')};
    box-shadow: ${raisedShadow};
    color: ${token('color-text')};
    font: inherit;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  ::slotted(button:hover) {
    box-shadow: ${raisedHoverShadow};
  }

  ::slotted(button[aria-pressed='true']),
  ::slotted(button[aria-checked='true']) {
    background: ${token('color-panel-inset')};
    box-shadow: ${selectedShadow};
    font-weight: 600;
    /* The outline is wider than the 2px gap, so it paints over the neighbors' edges. */
    z-index: 1;
  }

  ::slotted(button:focus-visible) {
    outline: none;
    box-shadow:
      0 0 0 2px ${token('color-focus-inner')},
      0 0 0 4px ${token('color-focus')};
    z-index: 1;
  }

  ::slotted(button:disabled) {
    background: ${token('color-disabled-fill')};
    box-shadow: none;
    color: ${token('color-disabled-text')};
    cursor: not-allowed;
  }

  @media (pointer: coarse) {
    ::slotted(button) {
      min-block-size: 40px;
    }
  }

  @media (forced-colors: active) {
    .group {
      border: 1px solid CanvasText;
    }

    ::slotted(button) {
      border: 1px solid ButtonText;
      background: ButtonFace;
      color: ButtonText;
    }

    ::slotted(button[aria-pressed='true']),
    ::slotted(button[aria-checked='true']) {
      border: 3px double Highlight;
      background: Highlight;
      color: HighlightText;
    }

    ::slotted(button:focus-visible) {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }

    ::slotted(button:disabled) {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
