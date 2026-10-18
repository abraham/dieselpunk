import type { PunkMenubar } from './menubar.ts';

export { PunkMenubar } from './menubar.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-menubar': PunkMenubar;
  }
}
