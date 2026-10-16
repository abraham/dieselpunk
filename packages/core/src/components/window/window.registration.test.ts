import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkWindow } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('window registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkWindow).toBeTypeOf('function');
    expect(customElements.get('punk-window')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-window')).toBe(PunkWindow);
    expect(() => registerElement('punk-window', PunkWindow)).not.toThrow();
    expect(customElements.get('punk-window')).toBe(PunkWindow);
  });
});
