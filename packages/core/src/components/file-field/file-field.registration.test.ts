import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkFileField } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('file field registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkFileField).toBeTypeOf('function');
    expect(customElements.get('punk-file-field')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-file-field')).toBe(PunkFileField);
    expect(() => registerElement('punk-file-field', PunkFileField)).not.toThrow();
    expect(customElements.get('punk-file-field')).toBe(PunkFileField);
  });
});
