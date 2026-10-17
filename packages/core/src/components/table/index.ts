import type { PunkTable } from './table.ts';

export { PunkTable } from './table.ts';
export type { PunkSortChangeDetail, SortDirection } from './table.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-table': PunkTable;
  }
}
