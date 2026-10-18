import { css } from 'lit';
import { focusRing } from '../../styles/focus.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The slider's look with two thumbs: an inset trough with a `control-edge` boundary, an `accent`
// fill between the thumbs, and raised thumbs with their own boundary, so the ends are read from
// the thumbs and not from color. `--_knob` is a thumb's width, which range-slider.ts repeats.
export const rangeSliderStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  .slider {
    --_knob: 20px;
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
    flex-wrap: wrap;
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
    inset-inline-start: calc(var(--_knob) / 2 + (100% - var(--_knob)) * var(--_low));
    inline-size: calc((100% - var(--_knob)) * (var(--_high) - var(--_low)));
    background: ${token('color-accent')};
  }

  .thumb {
    ${raisedSurface}
    position: absolute;
    inset-block-start: 2px;
    inset-inline-start: calc((100% - var(--_knob)) * var(--_ratio));
    inline-size: var(--_knob);
    block-size: 24px;
    box-sizing: border-box;
    border: ${token('border-width')} solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
  }

  .slider:not(.disabled) .thumb:hover {
    border-color: ${token('color-text')};
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

  @media (pointer: coarse) {
    .area {
      block-size: 40px;
    }

    .track {
      inset-block-start: 15px;
    }

    .thumb {
      inset-block-start: 8px;
    }
  }

  ${focusRing('.thumb')}

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

    .slider.disabled .track,
    .slider.disabled .thumb {
      border-color: GrayText;
    }

    .slider.disabled .fill {
      background: GrayText;
    }

    .slider.disabled {
      color: GrayText;
    }
  }
`;
