import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkSlotGrid } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('slot grid registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkSlotGrid).toBeTypeOf('function');
    expect(customElements.get('punk-slot-grid')).toBeUndefined();
  });

  it('is defined by register.ts alone, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-slot-grid')).toBe(PunkSlotGrid);
    expect(customElements.get('punk-slot')).toBeUndefined();
    expect(customElements.get('punk-item-stack')).toBeUndefined();
    expect(() => registerElement('punk-slot-grid', PunkSlotGrid)).not.toThrow();
    expect(customElements.get('punk-slot-grid')).toBe(PunkSlotGrid);
  });
});
