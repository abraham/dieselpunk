import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkSplitter } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('splitter registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkSplitter).toBeTypeOf('function');
    expect(customElements.get('punk-splitter')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-splitter')).toBe(PunkSplitter);
    expect(() => registerElement('punk-splitter', PunkSplitter)).not.toThrow();
    expect(customElements.get('punk-splitter')).toBe(PunkSplitter);
  });
});
