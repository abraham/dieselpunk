import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkRangeSlider } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('range slider registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkRangeSlider).toBeTypeOf('function');
    expect(customElements.get('punk-range-slider')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-range-slider')).toBe(PunkRangeSlider);
    expect(() => registerElement('punk-range-slider', PunkRangeSlider)).not.toThrow();
    expect(customElements.get('punk-range-slider')).toBe(PunkRangeSlider);
  });
});
