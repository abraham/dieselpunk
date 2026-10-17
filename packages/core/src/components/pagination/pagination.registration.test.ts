import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkPagination } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('pagination registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkPagination).toBeTypeOf('function');
    expect(customElements.get('punk-pagination')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-pagination')).toBe(PunkPagination);
    expect(() => registerElement('punk-pagination', PunkPagination)).not.toThrow();
    expect(customElements.get('punk-pagination')).toBe(PunkPagination);
  });
});
