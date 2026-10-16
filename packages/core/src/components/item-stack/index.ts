import type { PunkItemStack } from './item-stack.ts';

export { PunkItemStack } from './item-stack.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-item-stack': PunkItemStack;
  }
}
