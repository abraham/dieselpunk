import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkAccordion, PunkAccordionItem } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('accordion registration', () => {
  it('does not define either element when the class entry is imported', () => {
    expect(PunkAccordion).toBeTypeOf('function');
    expect(PunkAccordionItem).toBeTypeOf('function');
    expect(customElements.get('punk-accordion')).toBeUndefined();
    expect(customElements.get('punk-accordion-item')).toBeUndefined();
  });

  it('is defined by register.ts, both tags together, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-accordion')).toBe(PunkAccordion);
    expect(customElements.get('punk-accordion-item')).toBe(PunkAccordionItem);
    expect(() => registerElement('punk-accordion', PunkAccordion)).not.toThrow();
    expect(customElements.get('punk-accordion')).toBe(PunkAccordion);
  });
});
