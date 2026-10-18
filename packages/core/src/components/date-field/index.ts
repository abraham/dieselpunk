import type { PunkDateField } from './date-field.ts';

export { PunkDateField } from './date-field.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-date-field': PunkDateField;
  }
}
