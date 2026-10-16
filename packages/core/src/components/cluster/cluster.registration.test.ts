import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkCluster } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('cluster registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkCluster).toBeTypeOf('function');
    expect(customElements.get('punk-cluster')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-cluster')).toBe(PunkCluster);
    expect(() => registerElement('punk-cluster', PunkCluster)).not.toThrow();
    expect(customElements.get('punk-cluster')).toBe(PunkCluster);
  });
});
