import type { PunkSelect } from './select.ts';

export { PunkSelect } from './select.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-select': PunkSelect;
  }
}
