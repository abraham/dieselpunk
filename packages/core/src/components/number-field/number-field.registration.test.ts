import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkNumberField } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('number field registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkNumberField).toBeTypeOf('function');
    expect(customElements.get('punk-number-field')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-number-field')).toBe(PunkNumberField);
    expect(() => registerElement('punk-number-field', PunkNumberField)).not.toThrow();
    expect(customElements.get('punk-number-field')).toBe(PunkNumberField);
  });
});
