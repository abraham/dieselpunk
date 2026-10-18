import type { PunkTree } from './tree.ts';
import type { PunkTreeItem } from './tree-item.ts';

export { PunkTree } from './tree.ts';
export type { TreeSelection } from './tree.ts';
export { PunkTreeItem } from './tree-item.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-tree': PunkTree;
    'punk-tree-item': PunkTreeItem;
  }
}
