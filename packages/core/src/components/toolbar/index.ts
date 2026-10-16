import type { PunkToolbar } from './toolbar.ts';

export { PunkToolbar } from './toolbar.ts';
export type { PunkOverflowDetail } from './toolbar.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-toolbar': PunkToolbar;
  }
}
