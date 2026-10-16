import type { PunkNumberField } from './number-field.ts';

export { PunkNumberField } from './number-field.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-number-field': PunkNumberField;
  }
}
