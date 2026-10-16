import type { PunkPopover } from './popover.ts';

export { PunkPopover } from './popover.ts';
export type { PopoverMode, PopoverPlacement } from './popover.ts';
export type { PunkCloseDetail, PunkCloseReason } from '../../internal/modal-surface.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-popover': PunkPopover;
  }
}
