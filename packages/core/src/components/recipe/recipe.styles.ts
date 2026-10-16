import { css } from 'lit';
import { hostFocusRing } from '../../styles/focus.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { insetSurface, raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// `--_bevel`, `--_ring`, and `--_ring-width` are private pieces of `box-shadow`, not API. Selected
// is a thicker ring and a pressed-in bevel, so it differs from idle by shape as well as color.
export const recipeStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  .recipe {
    --_bevel:
      inset 1px 1px 0 ${token('color-edge-light')}, inset -1px -1px 0 ${token('color-edge-dark')};
    --_ring: ${token('color-edge-dark')};
    --_ring-width: ${token('border-width')};
    ${raisedSurface}
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: ${token('space-2')};
    min-block-size: calc(${token('slot-size')} + 2 * ${token('space-2')});
    padding: ${token('space-2')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    box-shadow:
      var(--_bevel),
      0 0 0 var(--_ring-width) var(--_ring);
  }

  :host(:not([disabled])) .recipe:hover {
    --_bevel:
      inset 1px 1px 0 ${token('color-edge-light')}, inset -1px -1px 0 ${token('color-edge-dark')},
      inset 2px 2px 0 color-mix(in srgb, ${token('color-edge-light')} 50%, transparent),
      inset -2px -2px 0 color-mix(in srgb, ${token('color-edge-dark')} 50%, transparent);
  }

  :host(:not([disabled])) .recipe:active,
  :host([selected]) .recipe {
    --_bevel:
      inset 1px 1px 0 ${token('color-edge-dark')}, inset -1px -1px 0 ${token('color-edge-light')};
  }

  :host([selected]) .recipe {
    --_ring: ${token('color-accent')};
    --_ring-width: calc(${token('border-width')} + 1px);
  }

  :host([disabled]) .recipe {
    --_bevel: 0 0 0 0 transparent;
    background: ${token('color-disabled-fill')};
    color: ${token('color-disabled-text')};
  }

  .icon {
    ${insetSurface}
    flex: none;
    display: grid;
    place-items: center;
    inline-size: ${token('slot-size')};
    block-size: ${token('slot-size')};
    overflow: hidden;
    border-radius: ${token('radius')};
  }

  .icon ::slotted(*) {
    max-inline-size: 100%;
    max-block-size: 100%;
    object-fit: contain;
  }

  .body {
    flex: 1 1 0;
    min-inline-size: 0;
    display: grid;
    row-gap: ${token('space-1')};
  }

  .title,
  .flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('space-1')} ${token('space-2')};
  }

  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .duration {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Availability is a word in a chip: solid when it can be made, dashed when it cannot. */
  .status {
    padding-inline: ${token('space-1')};
    border: 1px solid currentColor;
    border-radius: ${token('radius')};
    font-size: 0.875em;
  }

  .status.unavailable {
    border-style: dashed;
  }

  .ingredients,
  .products {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('space-1')};
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .arrow {
    flex: none;
    inline-size: 12px;
    block-size: 12px;
    background: currentColor;
    clip-path: polygon(0 40%, 55% 40%, 55% 15%, 100% 50%, 55% 85%, 55% 60%, 0 60%);
  }

  :host(:dir(rtl)) .arrow {
    scale: -1 1;
  }

  ${hostFocusRing('.recipe')}

  ${forcedColorsSurface('.recipe')}

  @media (forced-colors: active) {
    :host([selected]) .recipe {
      outline: 3px solid Highlight;
      outline-offset: 0;
    }

    :host([disabled]) .recipe {
      border-color: GrayText;
      color: GrayText;
    }

    .arrow {
      forced-color-adjust: none;
      background: CanvasText;
    }

    .icon {
      border: 1px solid CanvasText;
    }
  }
`;
