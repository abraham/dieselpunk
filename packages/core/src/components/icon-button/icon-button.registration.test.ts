import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkIconButton } from './index.ts';

// Each test file runs in its own page, so this file sees a registry nothing else has touched.
describe('icon button registration (12.5.5)', () => {
  it('does not define the element, or its tooltip, when the class entry is imported', () => {
    expect(PunkIconButton).toBeTypeOf('function');
    expect(customElements.get('punk-icon-button')).toBeUndefined();
    expect(customElements.get('punk-tooltip')).toBeUndefined();
  });

  it('is defined by register.ts together with punk-tooltip', async () => {
    await import('./register.ts');
    expect(customElements.get('punk-icon-button')).toBe(PunkIconButton);
    expect(customElements.get('punk-tooltip')).toBeDefined();
  });

  it('registering again is harmless', () => {
    expect(() => registerElement('punk-icon-button', PunkIconButton)).not.toThrow();
    expect(customElements.get('punk-icon-button')).toBe(PunkIconButton);
  });

  it('works end to end once registered: the tooltip upgrades inside the shadow root', async () => {
    const button = document.createElement('punk-icon-button');
    button.label = 'Save';
    document.body.append(button);
    await button.updateComplete;
    const tooltip = button.shadowRoot?.querySelector('punk-tooltip');
    expect(tooltip?.constructor).toBe(customElements.get('punk-tooltip'));
    button.remove();
  });
});
