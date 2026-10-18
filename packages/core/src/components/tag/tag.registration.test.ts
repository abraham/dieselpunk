import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTag } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('tag registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkTag).toBeTypeOf('function');
    expect(customElements.get('punk-tag')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-tag')).toBe(PunkTag);
    expect(() => registerElement('punk-tag', PunkTag)).not.toThrow();
    expect(customElements.get('punk-tag')).toBe(PunkTag);
  });
});
