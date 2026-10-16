import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkMeter } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('meter registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkMeter).toBeTypeOf('function');
    expect(customElements.get('punk-meter')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-meter')).toBe(PunkMeter);
    expect(() => registerElement('punk-meter', PunkMeter)).not.toThrow();
    expect(customElements.get('punk-meter')).toBe(PunkMeter);
  });
});
