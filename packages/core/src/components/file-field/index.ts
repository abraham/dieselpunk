import type { PunkFileField } from './file-field.ts';

export { PunkFileField } from './file-field.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-file-field': PunkFileField;
  }
}
