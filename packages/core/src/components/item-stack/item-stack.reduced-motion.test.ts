import { commands } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';

// Its own file because WebKit does not re-evaluate a shared stylesheet's media queries when the
// preference changes mid-page, which would leak into later files. Set once, before anything renders.
beforeAll(async () => {
  await commands.setReducedMotion('reduce');
});

afterAll(async () => {
  cleanup();
  await commands.setReducedMotion(null);
});

describe('item stack under reduced motion', () => {
  it('does not animate the durability bar', async () => {
    const element = track(document.createElement('punk-item-stack'));
    element.setAttribute('name', 'Coil');
    element.setAttribute('durability', '0.5');
    await element.updateComplete;
    const fill = element.shadowRoot?.querySelector('.durability-fill') as HTMLElement;
    expect(getComputedStyle(fill).transitionDuration).toBe('0s');
  });
});
