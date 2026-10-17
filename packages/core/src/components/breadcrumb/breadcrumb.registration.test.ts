import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkBreadcrumb, PunkBreadcrumbItem } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('breadcrumb registration', () => {
  it('does not define the elements when the class entry is imported', () => {
    expect(PunkBreadcrumb).toBeTypeOf('function');
    expect(customElements.get('punk-breadcrumb')).toBeUndefined();
    expect(customElements.get('punk-breadcrumb-item')).toBeUndefined();
  });

  it('is defined by register.ts, both tags, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-breadcrumb')).toBe(PunkBreadcrumb);
    expect(customElements.get('punk-breadcrumb-item')).toBe(PunkBreadcrumbItem);
    expect(() => registerElement('punk-breadcrumb', PunkBreadcrumb)).not.toThrow();
  });
});
