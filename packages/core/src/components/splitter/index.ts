import type { PunkSplitter } from './splitter.ts';

export { PunkSplitter } from './splitter.ts';
export type { PunkSplitChangeDetail, SplitterOrientation } from './splitter.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-splitter': PunkSplitter;
  }
}
