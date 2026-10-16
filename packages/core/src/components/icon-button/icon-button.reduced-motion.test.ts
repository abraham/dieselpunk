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

describe('icon button under reduced motion', () => {
  it('stops the loading spinner', async () => {
    const button = track(document.createElement('punk-icon-button'));
    button.label = 'Save';
    button.loading = true;
    await button.updateComplete;
    const spinner = button.shadowRoot?.querySelector<HTMLElement>('[part="spinner"]');
    expect(spinner).toBeTruthy();
    expect(getComputedStyle(spinner as HTMLElement).animationName).toBe('none');
  });
});
