import type { PunkDivider } from './divider.ts';

export { PunkDivider } from './divider.ts';
export type { DividerOrientation } from './divider.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-divider': PunkDivider;
  }
}
