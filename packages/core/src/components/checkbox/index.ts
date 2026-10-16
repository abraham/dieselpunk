import type { PunkCheckbox } from './checkbox.ts';

export { PunkCheckbox } from './checkbox.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-checkbox': PunkCheckbox;
  }
}
