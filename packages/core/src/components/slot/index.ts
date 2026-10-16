import type { PunkSlot } from './slot.ts';

export { PunkSlot } from './slot.ts';
export type { ReceptacleSize as SlotSize } from '../../internal/receptacle-base.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-slot': PunkSlot;
  }
}
