import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkStatusLight } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('status light registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkStatusLight).toBeTypeOf('function');
    expect(customElements.get('punk-status-light')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-status-light')).toBe(PunkStatusLight);
    expect(() => registerElement('punk-status-light', PunkStatusLight)).not.toThrow();
    expect(customElements.get('punk-status-light')).toBe(PunkStatusLight);
  });
});
