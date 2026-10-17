import type { PunkTimeField } from './time-field.ts';

export { PunkTimeField } from './time-field.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-time-field': PunkTimeField;
  }
}
