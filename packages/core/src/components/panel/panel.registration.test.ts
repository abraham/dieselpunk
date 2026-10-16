import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkPanel } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('panel registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkPanel).toBeTypeOf('function');
    expect(customElements.get('punk-panel')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-panel')).toBe(PunkPanel);
    expect(() => registerElement('punk-panel', PunkPanel)).not.toThrow();
    expect(customElements.get('punk-panel')).toBe(PunkPanel);
  });
});
