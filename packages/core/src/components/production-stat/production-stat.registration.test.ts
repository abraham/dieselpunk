import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkProductionStat } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('production stat registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkProductionStat).toBeTypeOf('function');
    expect(customElements.get('punk-production-stat')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-production-stat')).toBe(PunkProductionStat);
    expect(() => registerElement('punk-production-stat', PunkProductionStat)).not.toThrow();
    expect(customElements.get('punk-production-stat')).toBe(PunkProductionStat);
  });
});
