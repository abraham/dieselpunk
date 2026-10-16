import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkRecipe } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('recipe registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkRecipe).toBeTypeOf('function');
    expect(customElements.get('punk-recipe')).toBeUndefined();
  });

  it('is defined by register.ts alone, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-recipe')).toBe(PunkRecipe);
    for (const other of ['punk-slot', 'punk-item-stack', 'punk-slot-grid']) {
      expect(customElements.get(other), other).toBeUndefined();
    }
    expect(() => registerElement('punk-recipe', PunkRecipe)).not.toThrow();
    expect(customElements.get('punk-recipe')).toBe(PunkRecipe);
  });
});
