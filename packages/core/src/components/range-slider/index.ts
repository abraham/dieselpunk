import type { PunkRangeSlider } from './range-slider.ts';

export { PunkRangeSlider } from './range-slider.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-range-slider': PunkRangeSlider;
  }
}
