import { css } from 'lit';
import { hostFocusRing } from '../../styles/focus.ts';
import { token } from '../../tokens/token.ts';

// The tree is the list's inset well, so lists and trees read as one family.
export const treeStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  .tree {
    display: grid;
    gap: 1px;
    min-inline-size: 0;
    padding: 2px;
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow:
      inset 1px 1px 0 ${token('color-edge-dark')},
      inset -1px -1px 0 ${token('color-edge-light')},
      0 0 0 ${token('border-width')} ${token('color-edge-dark')};
  }

  @media (forced-colors: active) {
    .tree {
      border: 1px solid CanvasText;
    }
  }
`;

// A row is indented by its level. Focus is the shared ring, and a selected row is raised out of
// the well as a list's is, with a check and an `accent` bar on its start edge, so selection never
// rests on color.
export const treeItemStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    outline: none;
  }

  [hidden] {
    display: none !important;
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    min-block-size: ${token('control-height-sm')};
    padding-block: 2px;
    padding-inline: calc(${token('space-2')} + var(--_level) * ${token('space-4')})
      ${token('space-2')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    cursor: pointer;
    user-select: none;
  }

  :host(:not([disabled])) .row:hover,
  :host(:focus) > .row {
    background: color-mix(in srgb, ${token('color-panel')} 60%, transparent);
  }

  .row.selected {
    background: ${token('color-panel')};
    box-shadow:
      inset 3px 0 0 ${token('color-accent')},
      inset 0 0 0 1px ${token('color-edge-light')};
    font-weight: 600;
  }

  :host(:dir(rtl)) .row.selected {
    box-shadow:
      inset -3px 0 0 ${token('color-accent')},
      inset 0 0 0 1px ${token('color-edge-light')};
  }

  :host([disabled]) .row {
    color: ${token('color-disabled-text')};
    cursor: not-allowed;
  }

  .toggle {
    flex: none;
    inline-size: 8px;
    block-size: 10px;
    background: currentColor;
    clip-path: polygon(0 0, 100% 50%, 0 100%);
    transition: transform ${token('duration-fast')};
  }

  :host(:dir(rtl)) .toggle {
    transform: scaleX(-1);
  }

  .toggle.open,
  :host(:dir(rtl)) .toggle.open {
    transform: rotate(90deg);
  }

  /* A leaf keeps the toggle's room, so labels at one level line up. */
  .toggle[hidden] {
    display: block !important;
    visibility: hidden;
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

  .check {
    flex: none;
    display: none;
    inline-size: 12px;
    block-size: 12px;
    background: currentColor;
    clip-path: polygon(14% 50%, 0 64%, 36% 100%, 100% 24%, 86% 10%, 36% 72%);
  }

  .row.selected .check {
    display: block;
  }

  @media (pointer: coarse) {
    .row {
      min-block-size: 40px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle {
      transition: none;
    }
  }

  ${hostFocusRing('.row')}

  @media (forced-colors: active) {
    :host(:focus) > .row {
      background: Highlight;
      color: HighlightText;
    }

    /* Forced colors remove shadows, so the bar is a border. */
    .row.selected {
      border-inline-start: 3px solid CanvasText;
    }

    :host([disabled]) .row {
      color: GrayText;
    }
  }
`;
