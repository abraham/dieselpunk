import type { PunkRadio } from './radio.ts';
import type { PunkRadioGroup } from './radio-group.ts';

export { PunkRadioGroup } from './radio-group.ts';
export type { RadioGroupOrientation } from './radio-group.ts';
export { PunkRadio } from './radio.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-radio-group': PunkRadioGroup;
    'punk-radio': PunkRadio;
  }
}
