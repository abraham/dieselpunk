import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkConnectionRow } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('connection row registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkConnectionRow).toBeTypeOf('function');
    expect(customElements.get('punk-connection-row')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-connection-row')).toBe(PunkConnectionRow);
    expect(() => registerElement('punk-connection-row', PunkConnectionRow)).not.toThrow();
    expect(customElements.get('punk-connection-row')).toBe(PunkConnectionRow);
  });
});
