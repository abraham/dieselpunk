import type { PunkSlotGrid } from './slot-grid.ts';

export { PunkSlotGrid } from './slot-grid.ts';
export type { GridSelection, PunkSelectionChangeDetail } from './slot-grid.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-slot-grid': PunkSlotGrid;
  }
}
