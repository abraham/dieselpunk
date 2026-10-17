import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkFieldset } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('fieldset registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkFieldset).toBeTypeOf('function');
    expect(customElements.get('punk-fieldset')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-fieldset')).toBe(PunkFieldset);
    expect(() => registerElement('punk-fieldset', PunkFieldset)).not.toThrow();
    expect(customElements.get('punk-fieldset')).toBe(PunkFieldset);
  });
});
