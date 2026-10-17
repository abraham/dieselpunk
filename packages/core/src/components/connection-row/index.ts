import type { PunkConnectionRow } from './connection-row.ts';

export { PunkConnectionRow } from './connection-row.ts';
export type { ConnectionDirection, ConnectionStatus, PunkRemoveDetail } from './connection-row.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-connection-row': PunkConnectionRow;
  }
}
