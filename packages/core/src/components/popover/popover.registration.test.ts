import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkPopover } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('popover registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkPopover).toBeTypeOf('function');
    expect(customElements.get('punk-popover')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-popover')).toBe(PunkPopover);
    expect(() => registerElement('punk-popover', PunkPopover)).not.toThrow();
    expect(customElements.get('punk-popover')).toBe(PunkPopover);
  });
});
