import type { PunkMenu } from './menu.ts';
import type { PunkMenuItem } from './menu-item.ts';

export { PunkMenu } from './menu.ts';
export type { MenuPlacement } from './menu.ts';
export { PunkMenuItem } from './menu-item.ts';
export type { MenuItemType } from './menu-item.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-menu': PunkMenu;
    'punk-menu-item': PunkMenuItem;
  }
}
