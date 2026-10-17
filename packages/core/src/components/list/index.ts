import type { PunkList } from './list.ts';
import type { PunkListItem } from './list-item.ts';

export { PunkList } from './list.ts';
export type { ListSelection } from './list.ts';
export { PunkListItem } from './list-item.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-list': PunkList;
    'punk-list-item': PunkListItem;
  }
}
