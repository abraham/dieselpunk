import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkAlert } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('alert registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkAlert).toBeTypeOf('function');
    expect(customElements.get('punk-alert')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-alert')).toBe(PunkAlert);
    expect(() => registerElement('punk-alert', PunkAlert)).not.toThrow();
    expect(customElements.get('punk-alert')).toBe(PunkAlert);
  });
});
