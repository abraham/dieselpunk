import type { PunkStatusLight } from './status-light.ts';

export { PunkStatusLight } from './status-light.ts';
export type { StatusVariant } from './status-light.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-status-light': PunkStatusLight;
  }
}
