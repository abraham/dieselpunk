import { css } from 'lit';
import { hostFocusRing } from './focus.ts';
import { forcedColorsSurface } from './forced-colors.ts';
import { visuallyHidden } from './visually-hidden.ts';
import { token } from '../tokens/token.ts';

// Each state owns one channel, so they combine and stay apart without color: selected is the
// outer ring and a darker fill, highlighted a dotted outline, invalid an inner frame and a hatched
// corner. `--_bevel`, `--_ring`, and `--_marker` are private pieces of `box-shadow`, not API.
//
// Expects `.slot > .content > slot`, plus optional `.badge` and `.overlay`, in the shadow tree,
// and the `empty` class on `.slot` while the default slot has no content.
export const receptacleStyles = css`
  ${visuallyHidden}

  :host {
    --_scale: 1;
    display: inline-block;
    vertical-align: middle;
    max-inline-size: 100%;
    inline-size: calc(${token('slot-size')} * var(--_scale));
    block-size: calc(${token('slot-size')} * var(--_scale));
  }

  :host([size='sm']) {
    --_scale: 0.8;
  }

  :host([size='lg']) {
    --_scale: 1.2;
  }

  [hidden] {
    display: none !important;
  }

  .slot {
    --_bevel:
      inset 1px 1px 0 ${token('color-edge-dark')}, inset -1px -1px 0 ${token('color-edge-light')};
    --_ring: ${token('color-edge-dark')};
    --_ring-width: ${token('border-width')};
    --_marker: 0 0 0 0 transparent;
    position: relative;
    display: grid;
    inline-size: 100%;
    block-size: 100%;
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow:
      var(--_bevel),
      0 0 0 var(--_ring-width) var(--_ring),
      var(--_marker);
  }

  /* Nothing else identifies an empty slot, so its boundary meets 3:1 (specs/visual-system.md §4.2). */
  .slot.empty {
    --_ring: ${token('color-control-edge')};
  }

  :host(:not([disabled])) .slot:hover {
    --_bevel:
      inset 1px 1px 0 ${token('color-edge-dark')}, inset -1px -1px 0 ${token('color-edge-light')},
      inset 2px 2px 0 color-mix(in srgb, ${token('color-edge-dark')} 50%, transparent),
      inset -2px -2px 0 color-mix(in srgb, ${token('color-edge-light')} 50%, transparent);
  }

  .content {
    display: grid;
    place-items: center;
    min-inline-size: 0;
    overflow: hidden;
    border-radius: inherit;
  }

  .content ::slotted(*) {
    max-inline-size: 100%;
    max-block-size: 100%;
    object-fit: contain;
  }

  :host(:not([disabled])) .slot:active .content {
    translate: 1px 1px;
  }

  :host(:not([disabled]):dir(rtl)) .slot:active .content {
    translate: -1px 1px;
  }

  .badge {
    position: absolute;
    inset-block-end: ${token('space-1')};
    inset-inline-end: ${token('space-1')};
  }

  /* Slotted overlay content inherits this, so it never blocks a click on the slot. */
  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  :host([selected]) .slot {
    --_ring: ${token('color-accent')};
    --_ring-width: calc(${token('border-width')} + 1px);
    background: color-mix(in srgb, ${token('color-panel-inset')} 75%, black);
  }

  :host([highlighted]) .slot {
    outline: 2px dotted ${token('color-warning')};
    outline-offset: 3px;
  }

  :host([invalid]) .slot {
    --_marker: inset 0 0 0 2px ${token('color-danger')};
  }

  :host([invalid]) .slot::before {
    content: '';
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    inline-size: 40%;
    block-size: 40%;
    pointer-events: none;
    background: repeating-linear-gradient(
      135deg,
      ${token('color-danger')} 0 2px,
      transparent 2px 4px
    );
    clip-path: polygon(0 0, 100% 0, 100% 100%);
  }

  :host([invalid]:dir(rtl)) .slot::before {
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  :host([disabled]) .slot {
    --_bevel: 0 0 0 0 transparent;
    background: ${token('color-disabled-fill')};
  }

  :host([disabled]) .content {
    filter: grayscale(1);
    opacity: 0.5;
  }

  ${hostFocusRing('.slot')}

  /* Bevels and fills are replaced under forced colors, so each state gets a different border. */
  ${forcedColorsSurface('.slot')}

  @media (forced-colors: active) {
    :host([highlighted]) .slot {
      outline: none;
      border-style: dotted;
    }

    :host([invalid]) .slot {
      border-style: dashed;
    }

    :host([invalid]) .slot::before {
      background: repeating-linear-gradient(135deg, CanvasText 0 2px, transparent 2px 4px);
    }

    :host([selected]) .slot {
      outline: 3px solid Highlight;
      outline-offset: 0;
    }

    :host([disabled]) .slot {
      border-color: GrayText;
    }
  }
`;
