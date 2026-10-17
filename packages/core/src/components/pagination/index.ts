import type { PunkPagination } from './pagination.ts';

export { PunkPagination } from './pagination.ts';
export type { PunkPageChangeDetail } from './pagination.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-pagination': PunkPagination;
  }
}
