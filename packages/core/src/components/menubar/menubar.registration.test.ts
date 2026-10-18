import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkMenubar } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('menubar registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkMenubar).toBeTypeOf('function');
    expect(customElements.get('punk-menubar')).toBeUndefined();
    expect(customElements.get('punk-menu')).toBeUndefined();
  });

  it('is defined by register.ts with the menu it is built from, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-menubar')).toBe(PunkMenubar);
    expect(customElements.get('punk-menu')).toBeTypeOf('function');
    expect(customElements.get('punk-menu-item')).toBeTypeOf('function');
    expect(() => registerElement('punk-menubar', PunkMenubar)).not.toThrow();
  });
});
