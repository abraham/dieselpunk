import type { PunkStack } from './stack.ts';

export { PunkStack } from './stack.ts';
export type { StackAlign, StackGap } from './stack.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-stack': PunkStack;
  }
}
