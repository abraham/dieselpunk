import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTable } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('table registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkTable).toBeTypeOf('function');
    expect(customElements.get('punk-table')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-table')).toBe(PunkTable);
    expect(() => registerElement('punk-table', PunkTable)).not.toThrow();
    expect(customElements.get('punk-table')).toBe(PunkTable);
  });
});
