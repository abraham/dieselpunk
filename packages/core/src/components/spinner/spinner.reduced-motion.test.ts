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

describe('spinner under reduced motion', () => {
  it('stands still', async () => {
    const element = track(document.createElement('punk-spinner'));
    await element.updateComplete;
    const ring = element.shadowRoot?.querySelector<HTMLElement>('[part="spinner"]');
    expect(getComputedStyle(ring as HTMLElement).animationName).toBe('none');
  });
});
