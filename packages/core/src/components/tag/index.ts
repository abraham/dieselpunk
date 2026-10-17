import type { PunkTag } from './tag.ts';

export { PunkTag } from './tag.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-tag': PunkTag;
  }
}
