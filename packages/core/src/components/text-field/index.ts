import type { PunkTextField } from './text-field.ts';

export { PunkTextField } from './text-field.ts';
export type { TextFieldType } from './text-field.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-text-field': PunkTextField;
  }
}
