import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTextField } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('text field registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkTextField).toBeTypeOf('function');
    expect(customElements.get('punk-text-field')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-text-field')).toBe(PunkTextField);
    expect(() => registerElement('punk-text-field', PunkTextField)).not.toThrow();
    expect(customElements.get('punk-text-field')).toBe(PunkTextField);
  });
});
