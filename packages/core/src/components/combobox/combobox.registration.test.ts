import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkCombobox } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('combobox registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkCombobox).toBeTypeOf('function');
    expect(customElements.get('punk-combobox')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-combobox')).toBe(PunkCombobox);
    expect(() => registerElement('punk-combobox', PunkCombobox)).not.toThrow();
    expect(customElements.get('punk-combobox')).toBe(PunkCombobox);
  });
});
