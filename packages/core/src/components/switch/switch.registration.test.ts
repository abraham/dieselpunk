import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkSwitch } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('switch registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkSwitch).toBeTypeOf('function');
    expect(customElements.get('punk-switch')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-switch')).toBe(PunkSwitch);
    expect(() => registerElement('punk-switch', PunkSwitch)).not.toThrow();
    expect(customElements.get('punk-switch')).toBe(PunkSwitch);
  });
});
