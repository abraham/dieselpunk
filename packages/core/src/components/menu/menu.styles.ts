import { css } from 'lit';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { hostFocusRing } from '../../styles/focus.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

export const menuStyles = css`
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
    min-inline-size: min(var(--punk-menu-min-width, 160px), calc(100vw - 16px));
    max-inline-size: min(320px, calc(100vw - 16px));
    max-block-size: calc(100vh - 16px);
    padding: ${token('space-1')};
    overflow: auto;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    ${raisedSurface}
  }

  :host([open]) .surface {
    display: flex;
    flex-direction: column;
  }

  ::slotted(hr),
  ::slotted([role='separator']) {
    inline-size: 100%;
    margin: ${token('space-1')} 0;
    border: 0;
    border-block-start: 1px solid ${token('color-edge-dark')};
    box-shadow: 0 1px 0 ${token('color-edge-light')};
  }

  ${forcedColorsSurface('.surface')}
`;

// A focused item is raised out of the menu with the focus ring; a checked one shows a check (a
// checkbox item) or a dot (a radio item), so neither state rests on color.
export const menuItemStyles = css`
  :host {
    display: block;
    cursor: pointer;
    outline: none;
    user-select: none;
  }

  :host([disabled]) {
    cursor: not-allowed;
  }

  [hidden] {
    display: none !important;
  }

  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    min-block-size: ${token('control-height-sm')};
    padding: 0 ${token('space-2')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
  }

  :host(:hover:not([disabled])) .item,
  :host(:focus) .item {
    background: ${token('color-panel-inset')};
  }

  :host([disabled]) .item {
    color: ${token('color-disabled-text')};
  }

  .check {
    flex: none;
    display: none;
    inline-size: 12px;
    block-size: 12px;
  }

  .type-checkbox .check,
  .type-radio .check {
    display: block;
  }

  :host([checked]) .type-checkbox .check {
    background: currentColor;
    clip-path: polygon(14% 50%, 0 64%, 36% 100%, 100% 24%, 86% 10%, 36% 72%);
  }

  :host([checked]) .type-radio .check {
    background: currentColor;
    border-radius: 50%;
    transform: scale(0.67);
  }

  .icon {
    flex: none;
    display: flex;
  }

  .label {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .shortcut {
    flex: none;
    color: ${token('color-text-muted')};
    font-family: ${token('font-mono')};
    font-size: 0.75rem;
  }

  .arrow {
    flex: none;
    display: none;
    inline-size: 8px;
    block-size: 10px;
    background: currentColor;
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }

  :host([aria-haspopup]) .arrow {
    display: block;
  }

  .item.bar .arrow {
    display: none;
  }

  :host(:dir(rtl)) .arrow {
    transform: scaleX(-1);
  }

  @media (pointer: coarse) {
    .item {
      min-block-size: 40px;
    }
  }

  ${hostFocusRing('.item')}

  @media (forced-colors: active) {
    :host(:focus) .item {
      background: Highlight;
      color: HighlightText;
    }

    :host([disabled]) .item {
      color: GrayText;
    }
  }
`;
