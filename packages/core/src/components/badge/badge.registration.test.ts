import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkBadge } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('badge registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkBadge).toBeTypeOf('function');
    expect(customElements.get('punk-badge')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-badge')).toBe(PunkBadge);
    expect(() => registerElement('punk-badge', PunkBadge)).not.toThrow();
    expect(customElements.get('punk-badge')).toBe(PunkBadge);
  });
});
