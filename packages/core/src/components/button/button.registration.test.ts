import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkButton } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('button registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkButton).toBeTypeOf('function');
    expect(customElements.get('punk-button')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-button')).toBe(PunkButton);
    expect(() => registerElement('punk-button', PunkButton)).not.toThrow();
    expect(customElements.get('punk-button')).toBe(PunkButton);
  });
});
