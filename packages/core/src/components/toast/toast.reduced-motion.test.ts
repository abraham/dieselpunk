import { commands } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkToast } from './index.ts';

// Its own file because WebKit does not re-evaluate a shared stylesheet's media queries when the
// preference changes mid-page, which would leak into later files. Set once, before anything renders.
beforeAll(async () => {
  await commands.setReducedMotion('reduce');
});

afterAll(async () => {
  cleanup();
  await commands.setReducedMotion(null);
});

describe('toast under reduced motion', () => {
  it('does not fade in', async () => {
    const toast = track(document.createElement('punk-toast')) as PunkToast;
    toast.textContent = 'Saved';
    await toast.updateComplete;
    const surface = toast.shadowRoot?.querySelector('.toast') as HTMLElement;
    expect(getComputedStyle(surface).animationName).toBe('none');
    expect(surface.getAnimations()).toEqual([]);
  });

  it('is removed at once when it is dismissed, with no fade', async () => {
    const toast = track(document.createElement('punk-toast')) as PunkToast;
    toast.textContent = 'Saved';
    await toast.updateComplete;
    toast.dismiss();
    await vi.waitFor(() => expect(toast.isConnected).toBe(false), { timeout: 100 });
  });
});
