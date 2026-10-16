import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkToolbar } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('toolbar registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkToolbar).toBeTypeOf('function');
    expect(customElements.get('punk-toolbar')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-toolbar')).toBe(PunkToolbar);
    expect(() => registerElement('punk-toolbar', PunkToolbar)).not.toThrow();
    expect(customElements.get('punk-toolbar')).toBe(PunkToolbar);
  });
});
