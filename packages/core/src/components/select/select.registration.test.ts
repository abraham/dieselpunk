import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkSelect } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('select registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkSelect).toBeTypeOf('function');
    expect(customElements.get('punk-select')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-select')).toBe(PunkSelect);
    expect(() => registerElement('punk-select', PunkSelect)).not.toThrow();
    expect(customElements.get('punk-select')).toBe(PunkSelect);
  });
});
