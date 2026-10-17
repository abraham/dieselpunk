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
  document.documentElement.style.removeProperty('overflow');
  await commands.setReducedMotion(null);
});

describe('drawer under reduced motion', () => {
  it('does not slide', async () => {
    const element = track(document.createElement('punk-drawer'));
    element.heading = 'Filters';
    element.open = true;
    await element.updateComplete;
    const dialog = element.shadowRoot?.querySelector('dialog') as HTMLDialogElement;
    expect(getComputedStyle(dialog).animationName).toBe('none');
  });
});
