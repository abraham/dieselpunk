import { css } from 'lit';
import { hostFocusRing } from '../../styles/focus.ts';
import { token } from '../../tokens/token.ts';

export const listStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-inline-size: 0;
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow:
      inset 1px 1px 0 ${token('color-edge-dark')},
      inset -1px -1px 0 ${token('color-edge-light')},
      0 0 0 ${token('border-width')} ${token('color-edge-dark')};
    padding: 2px;
  }

  @media (forced-colors: active) {
    .list {
      border: 1px solid CanvasText;
    }
  }
`;

// A selected row is raised out of the inset list, with an `accent` bar on its start edge and a
// check at its end, so selection is a shape and not only a color.
export const listItemStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  :host(:not([role='option'])) {
    cursor: default;
  }

  [hidden] {
    display: none !important;
  }

  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    min-block-size: ${token('control-height-md')};
    padding: ${token('space-1')} ${token('space-2')};
    box-sizing: border-box;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
  }

  :host([role='option']:not([disabled]):hover) .item {
    background: color-mix(in srgb, ${token('color-panel')} 60%, transparent);
  }

  :host([selected]) .item {
    background: ${token('color-panel')};
    box-shadow:
      inset 3px 0 0 ${token('color-accent')},
      inset 0 0 0 1px ${token('color-edge-light')};
    font-weight: 600;
  }

  :host([selected]:dir(rtl)) .item {
    box-shadow:
      inset -3px 0 0 ${token('color-accent')},
      inset 0 0 0 1px ${token('color-edge-light')};
  }

  :host([disabled]) .item {
    color: ${token('color-disabled-text')};
  }

  .start,
  .end {
    flex: none;
    display: flex;
    align-items: center;
    gap: ${token('space-1')};
    max-inline-size: 50%;
    color: ${token('color-text-muted')};
  }

  .main {
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    overflow-wrap: anywhere;
  }

  .description {
    color: ${token('color-text-muted')};
    font-size: 0.875em;
  }

  .check {
    flex: none;
    inline-size: 12px;
    block-size: 12px;
    visibility: hidden;
    background: currentColor;
    clip-path: polygon(14% 50%, 0 64%, 36% 100%, 100% 24%, 86% 10%, 36% 72%);
  }

  :host([selected]) .check {
    visibility: visible;
  }

  ${hostFocusRing('.item')}

  @media (forced-colors: active) {
    :host([selected]) .item {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }

    .check {
      background: CanvasText;
    }

    :host([disabled]) .item,
    .start,
    .end,
    .description {
      color: GrayText;
    }
  }
`;
