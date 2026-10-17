import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTextarea } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('textarea registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkTextarea).toBeTypeOf('function');
    expect(customElements.get('punk-textarea')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-textarea')).toBe(PunkTextarea);
    expect(() => registerElement('punk-textarea', PunkTextarea)).not.toThrow();
    expect(customElements.get('punk-textarea')).toBe(PunkTextarea);
  });
});
