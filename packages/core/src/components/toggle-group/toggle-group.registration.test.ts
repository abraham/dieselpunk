import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkToggleGroup } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('toggle group registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkToggleGroup).toBeTypeOf('function');
    expect(customElements.get('punk-toggle-group')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-toggle-group')).toBe(PunkToggleGroup);
    expect(() => registerElement('punk-toggle-group', PunkToggleGroup)).not.toThrow();
    expect(customElements.get('punk-toggle-group')).toBe(PunkToggleGroup);
  });
});
