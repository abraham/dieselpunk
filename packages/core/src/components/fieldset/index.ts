import type { PunkFieldset } from './fieldset.ts';

export { PunkFieldset } from './fieldset.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-fieldset': PunkFieldset;
  }
}
