import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkKbd } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('kbd registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkKbd).toBeTypeOf('function');
    expect(customElements.get('punk-kbd')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-kbd')).toBe(PunkKbd);
    expect(() => registerElement('punk-kbd', PunkKbd)).not.toThrow();
    expect(customElements.get('punk-kbd')).toBe(PunkKbd);
  });
});
