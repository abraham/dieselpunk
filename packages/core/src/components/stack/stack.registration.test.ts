import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkStack } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('stack registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkStack).toBeTypeOf('function');
    expect(customElements.get('punk-stack')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-stack')).toBe(PunkStack);
    expect(() => registerElement('punk-stack', PunkStack)).not.toThrow();
    expect(customElements.get('punk-stack')).toBe(PunkStack);
  });
});
