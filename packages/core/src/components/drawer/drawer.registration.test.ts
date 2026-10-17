import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkDrawer } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('drawer registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkDrawer).toBeTypeOf('function');
    expect(customElements.get('punk-drawer')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-drawer')).toBe(PunkDrawer);
    expect(() => registerElement('punk-drawer', PunkDrawer)).not.toThrow();
    expect(customElements.get('punk-drawer')).toBe(PunkDrawer);
  });
});
