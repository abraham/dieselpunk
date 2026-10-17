import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkList, PunkListItem } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('list registration', () => {
  it('does not define the elements when the class entry is imported', () => {
    expect(PunkList).toBeTypeOf('function');
    expect(customElements.get('punk-list')).toBeUndefined();
    expect(customElements.get('punk-list-item')).toBeUndefined();
  });

  it('is defined by register.ts, both tags, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-list')).toBe(PunkList);
    expect(customElements.get('punk-list-item')).toBe(PunkListItem);
    expect(() => registerElement('punk-list', PunkList)).not.toThrow();
  });
});
