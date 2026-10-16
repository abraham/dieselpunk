import type { PunkWindow } from './window.ts';

export { PunkWindow } from './window.ts';
export type { PunkMoveDetail } from './window.ts';
export type { PunkCloseDetail, PunkCloseReason } from '../../internal/modal-surface.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-window': PunkWindow;
  }
}
