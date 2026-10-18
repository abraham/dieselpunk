import type { PunkDescriptionList } from './description-list.ts';

export { PunkDescriptionList } from './description-list.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-description-list': PunkDescriptionList;
  }
}
