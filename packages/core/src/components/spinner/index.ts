import type { PunkSpinner } from './spinner.ts';

export { PunkSpinner } from './spinner.ts';
export type { SpinnerSize } from './spinner.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-spinner': PunkSpinner;
  }
}
