import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTab, PunkTabs } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('tabs registration', () => {
  it('does not define either element when the class entry is imported', () => {
    expect(PunkTabs).toBeTypeOf('function');
    expect(PunkTab).toBeTypeOf('function');
    expect(customElements.get('punk-tabs')).toBeUndefined();
    expect(customElements.get('punk-tab')).toBeUndefined();
  });

  it('is defined by register.ts, both tags together, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-tabs')).toBe(PunkTabs);
    expect(customElements.get('punk-tab')).toBe(PunkTab);
    expect(() => registerElement('punk-tabs', PunkTabs)).not.toThrow();
    expect(customElements.get('punk-tabs')).toBe(PunkTabs);
  });
});
