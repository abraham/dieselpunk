import { commands } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkSwitch } from './index.ts';

// Its own file because WebKit does not re-evaluate a shared stylesheet's media queries when the
// preference changes mid-page, which would leak into later files. Set once, before anything renders.
beforeAll(async () => {
  await commands.setReducedMotion('reduce');
});

afterAll(async () => {
  cleanup();
  await commands.setReducedMotion(null);
});

describe('switch under reduced motion', () => {
  it('moves the thumb at once', async () => {
    const element = track(document.createElement('punk-switch')) as PunkSwitch;
    element.textContent = 'Fuel';
    await element.updateComplete;
    const thumb = element.shadowRoot?.querySelector('.thumb') as HTMLElement;
    expect(getComputedStyle(thumb).transitionDuration).toBe('0s');
  });
});
