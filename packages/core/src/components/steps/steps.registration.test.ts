import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkStep, PunkSteps } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('steps registration', () => {
  it('does not define the elements when the class entry is imported', () => {
    expect(PunkSteps).toBeTypeOf('function');
    expect(customElements.get('punk-steps')).toBeUndefined();
    expect(customElements.get('punk-step')).toBeUndefined();
  });

  it('is defined by register.ts, and registering again is harmless', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-steps')).toBe(PunkSteps);
    expect(customElements.get('punk-step')).toBe(PunkStep);
    expect(() => registerElement('punk-steps', PunkSteps)).not.toThrow();
    expect(() => registerElement('punk-step', PunkStep)).not.toThrow();
  });
});
