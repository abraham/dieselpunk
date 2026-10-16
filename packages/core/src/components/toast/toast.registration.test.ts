import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkToast, PunkToastStack } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('toast registration', () => {
  it('does not define either element when the class entry is imported', () => {
    expect(PunkToast).toBeTypeOf('function');
    expect(PunkToastStack).toBeTypeOf('function');
    expect(customElements.get('punk-toast')).toBeUndefined();
    expect(customElements.get('punk-toast-stack')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-toast')).toBe(PunkToast);
    expect(customElements.get('punk-toast-stack')).toBe(PunkToastStack);
    expect(() => registerElement('punk-toast', PunkToast)).not.toThrow();
    expect(() => registerElement('punk-toast-stack', PunkToastStack)).not.toThrow();
  });
});
