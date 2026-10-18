import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTimeField } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('time field registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkTimeField).toBeTypeOf('function');
    expect(customElements.get('punk-time-field')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-time-field')).toBe(PunkTimeField);
    expect(() => registerElement('punk-time-field', PunkTimeField)).not.toThrow();
    expect(customElements.get('punk-time-field')).toBe(PunkTimeField);
  });
});
