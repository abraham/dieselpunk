import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkRadio, PunkRadioGroup } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('radio group registration', () => {
  it('does not define the elements when the class entry is imported', () => {
    expect(PunkRadioGroup).toBeTypeOf('function');
    expect(customElements.get('punk-radio-group')).toBeUndefined();
    expect(customElements.get('punk-radio')).toBeUndefined();
  });

  it('is defined by register.ts, both tags, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-radio-group')).toBe(PunkRadioGroup);
    expect(customElements.get('punk-radio')).toBe(PunkRadio);
    expect(() => registerElement('punk-radio', PunkRadio)).not.toThrow();
  });
});
