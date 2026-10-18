import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTree, PunkTreeItem } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('tree registration', () => {
  it('does not define the elements when the class entry is imported', () => {
    expect(PunkTree).toBeTypeOf('function');
    expect(customElements.get('punk-tree')).toBeUndefined();
    expect(customElements.get('punk-tree-item')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-tree')).toBe(PunkTree);
    expect(customElements.get('punk-tree-item')).toBe(PunkTreeItem);
    expect(() => registerElement('punk-tree', PunkTree)).not.toThrow();
    expect(() => registerElement('punk-tree-item', PunkTreeItem)).not.toThrow();
  });
});
