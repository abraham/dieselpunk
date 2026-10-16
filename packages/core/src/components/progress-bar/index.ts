import type { PunkProgressBar } from './progress-bar.ts';

export { PunkProgressBar } from './progress-bar.ts';
export type { ProgressVariant } from './progress-bar.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-progress-bar': PunkProgressBar;
  }
}
