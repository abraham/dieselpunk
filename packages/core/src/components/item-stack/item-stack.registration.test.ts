import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkItemStack } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('item stack registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkItemStack).toBeTypeOf('function');
    expect(customElements.get('punk-item-stack')).toBeUndefined();
  });

  it('is defined by register.ts alone, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-item-stack')).toBe(PunkItemStack);
    expect(customElements.get('punk-slot')).toBeUndefined();
    expect(() => registerElement('punk-item-stack', PunkItemStack)).not.toThrow();
    expect(customElements.get('punk-item-stack')).toBe(PunkItemStack);
  });
});
