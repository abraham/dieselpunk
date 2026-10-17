import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkMenu, PunkMenuItem } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('menu registration', () => {
  it('does not define the elements when the class entry is imported', () => {
    expect(PunkMenu).toBeTypeOf('function');
    expect(customElements.get('punk-menu')).toBeUndefined();
    expect(customElements.get('punk-menu-item')).toBeUndefined();
  });

  it('is defined by register.ts, both tags, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-menu')).toBe(PunkMenu);
    expect(customElements.get('punk-menu-item')).toBe(PunkMenuItem);
    expect(() => registerElement('punk-menu', PunkMenu)).not.toThrow();
  });
});
