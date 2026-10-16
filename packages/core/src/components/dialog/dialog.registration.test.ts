import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkDialog } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('dialog registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkDialog).toBeTypeOf('function');
    expect(customElements.get('punk-dialog')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-dialog')).toBe(PunkDialog);
    expect(() => registerElement('punk-dialog', PunkDialog)).not.toThrow();
    expect(customElements.get('punk-dialog')).toBe(PunkDialog);
  });
});
