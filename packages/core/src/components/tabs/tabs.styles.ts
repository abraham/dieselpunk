import { css } from 'lit';
import type { CSSResult } from 'lit';
import { hostFocusRing } from '../../styles/focus.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import {
  flatSurface,
  insetShadow,
  outlineShadow,
  raisedFill,
  raisedHoverShadow,
  raisedSurface,
} from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

const none = css`0`;
const edge = css`${token('border-width')}`;

// A shadow in the panels' fill, offset toward them, covers the seam under the selected tab.
const join = (x: CSSResult, y: CSSResult) => css`
  ${x} ${y} 0 ${token('color-panel')},
  inset 1px 1px 0 ${token('color-edge-light')},
  ${outlineShadow}
`;

// When the panels are inside the tabs, they sit on one flat surface and the selected tab takes
// that surface's fill and covers the seam below it, so it joins its panel: a cue of shape, not
// color. The other tabs recede to the inset fill. Otherwise the selected tab is pressed in with a
// bar on the edge that faces its panel.
export const tabsStyles = css`
  :host {
    display: flex;
    flex-direction: column;
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
    min-inline-size: 0;
  }

  :host([orientation='vertical']) .tablist {
    flex: 0 1 auto;
    flex-direction: column;
    flex-wrap: nowrap;
    max-inline-size: 50%;
  }

  .tablist.joined {
    --_tab-idle-bg: ${token('color-panel-inset')};
    --_tab-selected-bg: ${token('color-panel')};
    --_tab-selected-shadow: ${join(none, edge)};
    --_tab-bar: none;
  }

  :host([orientation='vertical']) .tablist.joined {
    --_tab-selected-shadow: ${join(edge, none)};
  }

  :host([orientation='vertical']:dir(rtl)) .tablist.joined {
    --_tab-selected-shadow: ${join(css`calc(-1 * ${edge})`, none)};
  }

  /* Positioned so it paints over the tabs' lower edges, under the selected tab (z-index 1). */
  .panels {
    ${flatSurface}
    position: relative;
    min-inline-size: 0;
    padding: var(--punk-tabs-padding, ${token('space-3')});
    border-radius: ${token('radius')};
    color: ${token('color-text')};
  }

  .panels[hidden] {
    display: none;
  }

  :host([orientation='vertical']) .panels {
    flex: 1 1 0;
    align-self: stretch;
  }

  ${forcedColorsSurface('.panels')}
`;

export const tabStyles = css`
  :host {
    display: flex;
    min-inline-size: 0;
    max-inline-size: 100%;
    cursor: pointer;
  }

  :host([selected]) {
    position: relative;
    z-index: 1;
  }

  :host([disabled]) {
    cursor: default;
  }

  .tab {
    ${raisedSurface}
    background: var(--_tab-idle-bg, ${raisedFill});
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
    display: var(--_tab-bar, block);
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

  :host([selected]:not([disabled])) .tab {
    background: var(--_tab-selected-bg, ${token('color-panel-inset')});
    box-shadow: var(--_tab-selected-shadow, ${insetShadow});
  }

  :host(:active:not([disabled], [selected])) .tab {
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
      display: block;
      background: Highlight;
    }

    :host([disabled]) .tab {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
