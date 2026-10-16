import type { PunkAccordion } from './accordion.ts';
import type { PunkAccordionItem } from './accordion-item.ts';

export { PunkAccordion } from './accordion.ts';
export { PunkAccordionItem } from './accordion-item.ts';
export type { PunkToggleDetail } from './accordion-item.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-accordion': PunkAccordion;
    'punk-accordion-item': PunkAccordionItem;
  }
}
