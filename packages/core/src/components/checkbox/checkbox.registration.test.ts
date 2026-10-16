import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkCheckbox } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('checkbox registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkCheckbox).toBeTypeOf('function');
    expect(customElements.get('punk-checkbox')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-checkbox')).toBe(PunkCheckbox);
    expect(() => registerElement('punk-checkbox', PunkCheckbox)).not.toThrow();
    expect(customElements.get('punk-checkbox')).toBe(PunkCheckbox);
  });
});
