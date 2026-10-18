import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkDateField } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('date field registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkDateField).toBeTypeOf('function');
    expect(customElements.get('punk-date-field')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-date-field')).toBe(PunkDateField);
    expect(() => registerElement('punk-date-field', PunkDateField)).not.toThrow();
    expect(customElements.get('punk-date-field')).toBe(PunkDateField);
  });
});
