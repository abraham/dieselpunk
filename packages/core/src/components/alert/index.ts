import type { PunkAlert } from './alert.ts';

export { PunkAlert } from './alert.ts';
export type { AlertVariant } from './alert.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-alert': PunkAlert;
  }
}
