import { css } from 'lit';
import { hostFocusRing } from '../../styles/focus.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import {
  insetShadow,
  outlineShadow,
  raisedHoverShadow,
  raisedSurface,
} from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

export const tabsStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: ${token('space-2')};
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  :host([orientation='vertical']) {
    flex-direction: row;
    align-items: flex-start;
  }

  .tablist {
    display: flex;
    flex-wrap: wrap;
    gap: ${token('space-1')};
    min-inline-size: 0;
  }

  :host([orientation='vertical']) .tablist {
    flex: 0 1 auto;
    flex-direction: column;
    flex-wrap: nowrap;
    max-inline-size: 50%;
  }

  ::slotted(:not([slot])) {
    flex: 1 1 0;
    min-inline-size: 0;
  }
`;

// The selected tab is pressed in and has a bar on the edge that faces its panel, so it differs
// from the others by shape and not only by surface.
export const tabStyles = css`
  :host {
    display: flex;
    min-inline-size: 0;
    max-inline-size: 100%;
    cursor: pointer;
  }

  :host([disabled]) {
    cursor: default;
  }

  .tab {
    ${raisedSurface}
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: ${token('space-2')};
    min-inline-size: 0;
    min-block-size: ${token('control-height-md')};
    padding: 0 ${token('space-3')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font-weight: 600;
    text-align: start;
    box-sizing: border-box;
  }

  .tab::before {
    content: '';
    position: absolute;
    display: none;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: 3px;
    background: ${token('color-accent')};
  }

  .tab.vertical::before {
    inset-inline: auto 0;
    inset-block: 0;
    inline-size: 3px;
    block-size: auto;
  }

  :host([selected]) .tab::before {
    display: block;
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: break-word;
  }

  .icon[hidden] {
    display: none;
  }

  :host(:hover:not([disabled])) .tab {
    box-shadow: ${raisedHoverShadow};
  }

  :host([selected]:not([disabled])) .tab,
  :host(:active:not([disabled])) .tab {
    background: ${token('color-panel-inset')};
    box-shadow: ${insetShadow};
  }

  :host([disabled]) .tab {
    background: ${token('color-disabled-fill')};
    box-shadow: ${outlineShadow};
    color: ${token('color-disabled-text')};
  }

  @media (pointer: coarse) {
    .tab {
      min-block-size: max(40px, ${token('control-height-md')});
    }
  }

  ${hostFocusRing('.tab')}
  ${forcedColorsSurface('.tab', { face: 'ButtonFace', text: 'ButtonText' })}

  @media (forced-colors: active) {
    :host([selected]) .tab {
      border-color: Highlight;
    }

    :host([selected]) .tab::before {
      background: Highlight;
    }

    :host([disabled]) .tab {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
