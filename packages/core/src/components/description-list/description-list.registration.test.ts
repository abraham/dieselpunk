import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkDescriptionList } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('description list registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkDescriptionList).toBeTypeOf('function');
    expect(customElements.get('punk-description-list')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-description-list')).toBe(PunkDescriptionList);
    expect(() => registerElement('punk-description-list', PunkDescriptionList)).not.toThrow();
    expect(customElements.get('punk-description-list')).toBe(PunkDescriptionList);
  });
});
