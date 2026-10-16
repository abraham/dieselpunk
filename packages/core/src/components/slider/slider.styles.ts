import { css } from 'lit';
import { hostFocusRing } from '../../styles/focus.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The track is an inset trough with a `control-edge` boundary, the fill is `accent`, and the thumb is
// a raised block with its own boundary, so the position is read from the thumb and not from color.
// `--_thumb` is the thumb's width, which the pointer maths in slider.ts repeats.
export const sliderStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  :host([hidden]) {
    display: none;
  }

  [hidden] {
    display: none !important;
  }

  .slider {
    --_thumb: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: ${token('space-1')};
    min-inline-size: 0;
    color: ${token('color-text')};
  }

  .slider.disabled {
    color: ${token('color-disabled-text')};
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: ${token('space-2')};
  }

  .label {
    min-inline-size: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .value {
    flex: none;
    font-family: ${token('font-mono')};
    font-variant-numeric: tabular-nums;
  }

  .area {
    position: relative;
    block-size: 28px;
    cursor: pointer;
    touch-action: pan-y;
    user-select: none;
  }

  .area.has-ticks {
    block-size: 36px;
  }

  .slider.disabled .area {
    cursor: default;
  }

  .track {
    position: absolute;
    inset-inline: 0;
    inset-block-start: 9px;
    block-size: 10px;
    box-sizing: border-box;
    border: ${token('border-width')} solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow:
      inset 1px 1px 0 ${token('color-edge-dark')},
      inset -1px -1px 0 ${token('color-edge-light')};
    overflow: hidden;
  }

  .fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: calc(var(--_thumb) / 2 + (100% - var(--_thumb)) * var(--_ratio));
    background: ${token('color-accent')};
  }

  .thumb {
    ${raisedSurface}
    position: absolute;
    inset-block-start: 2px;
    inset-inline-start: calc((100% - var(--_thumb)) * var(--_ratio));
    inline-size: var(--_thumb);
    block-size: 24px;
    box-sizing: border-box;
    border: ${token('border-width')} solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
  }

  .slider:not(.disabled) .area:hover .thumb {
    border-color: ${token('color-text')};
  }

  .ticks {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: 6px;
  }

  .tick {
    position: absolute;
    inset-block: 0;
    inset-inline-start: calc(var(--_thumb) / 2 + (100% - var(--_thumb)) * var(--_at) - 1px);
    inline-size: 2px;
    background: ${token('color-control-edge')};
  }

  .slider.disabled .track {
    border-color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
  }

  .slider.disabled .fill {
    background: ${token('color-disabled-text')};
  }

  .slider.disabled .thumb {
    border-color: ${token('color-disabled-text')};
    background: ${token('color-disabled-fill')};
    box-shadow: none;
  }

  .slider.disabled .tick {
    background: ${token('color-disabled-text')};
  }

  @media (pointer: coarse) {
    .area {
      block-size: 40px;
    }

    .area.has-ticks {
      block-size: 48px;
    }

    .track {
      inset-block-start: 15px;
    }

    .thumb {
      inset-block-start: 8px;
    }
  }

  ${hostFocusRing('.thumb')}

  @media (forced-colors: active) {
    .track {
      border-color: FieldText;
      background: Field;
      box-shadow: none;
    }

    .fill {
      background: Highlight;
    }

    .thumb {
      border: 2px solid ButtonText;
      background: ButtonFace;
      box-shadow: none;
    }

    .tick {
      background: CanvasText;
    }

    .slider.disabled .track,
    .slider.disabled .thumb {
      border-color: GrayText;
    }

    .slider.disabled .fill,
    .slider.disabled .tick {
      background: GrayText;
    }

    .slider.disabled {
      color: GrayText;
    }
  }
`;
