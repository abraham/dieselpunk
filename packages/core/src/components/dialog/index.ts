import type { PunkDialog } from './dialog.ts';

export { PunkDialog } from './dialog.ts';
export type { PunkCloseDetail, PunkCloseReason } from '../../internal/modal-surface.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-dialog': PunkDialog;
  }
}
