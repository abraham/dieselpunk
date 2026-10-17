import type { PunkCombobox } from './combobox.ts';

export { PunkCombobox } from './combobox.ts';
export type { ComboboxFilter } from './combobox.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-combobox': PunkCombobox;
  }
}
