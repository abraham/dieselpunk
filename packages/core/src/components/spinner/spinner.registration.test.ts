import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkSpinner } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('spinner registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkSpinner).toBeTypeOf('function');
    expect(customElements.get('punk-spinner')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-spinner')).toBe(PunkSpinner);
    expect(() => registerElement('punk-spinner', PunkSpinner)).not.toThrow();
    expect(customElements.get('punk-spinner')).toBe(PunkSpinner);
  });
});
