import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkProgressBar } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('progress bar registration', () => {
  it('does not define the element when the class entry is imported', () => {
    expect(PunkProgressBar).toBeTypeOf('function');
    expect(customElements.get('punk-progress-bar')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-progress-bar')).toBe(PunkProgressBar);
    expect(() => registerElement('punk-progress-bar', PunkProgressBar)).not.toThrow();
    expect(customElements.get('punk-progress-bar')).toBe(PunkProgressBar);
  });
});
