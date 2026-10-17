import type { PunkDrawer } from './drawer.ts';

export { PunkDrawer } from './drawer.ts';
export type { DrawerPlacement } from './drawer.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-drawer': PunkDrawer;
  }
}
