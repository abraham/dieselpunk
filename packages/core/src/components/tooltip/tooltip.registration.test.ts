import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTooltip } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('tooltip registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkTooltip).toBeTypeOf('function');
    expect(customElements.get('punk-tooltip')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-tooltip')).toBe(PunkTooltip);
    expect(() => registerElement('punk-tooltip', PunkTooltip)).not.toThrow();
    expect(customElements.get('punk-tooltip')).toBe(PunkTooltip);
  });
});
