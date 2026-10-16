import type { PunkSlider } from './slider.ts';

export { PunkSlider } from './slider.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-slider': PunkSlider;
  }
}
