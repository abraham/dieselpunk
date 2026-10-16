import { commands } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkProgressBar } from './index.ts';

// Lives in its own file because WebKit does not re-evaluate a shared stylesheet's media queries
// when the preference changes mid-page. Setting it once, before anything renders, is reliable.
beforeAll(async () => {
  await commands.setReducedMotion('reduce');
});

afterAll(async () => {
  cleanup();
  await commands.setReducedMotion(null);
});

async function mount(value?: number): Promise<PunkProgressBar> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.width = '400px';
  const bar = document.createElement('punk-progress-bar');
  bar.label = 'Crafting';
  if (value !== undefined) bar.value = value;
  track(bar, wrapper);
  await bar.updateComplete;
  return bar;
}

const fill = (bar: PunkProgressBar): HTMLElement => {
  const found = bar.shadowRoot?.querySelector<HTMLElement>('[part="fill"]');
  if (!found) throw new Error('Missing fill');
  return found;
};

describe('progress bar under reduced motion', () => {
  it('jumps straight to the new width', async () => {
    const bar = await mount(20);
    bar.value = 80;
    await bar.updateComplete;
    expect(getComputedStyle(fill(bar)).transitionDuration).toBe('0s');
    expect(Math.round(fill(bar).getBoundingClientRect().width)).toBe(320);
  });

  it('keeps the indeterminate stripe still but visible', async () => {
    const bar = await mount();
    expect(getComputedStyle(fill(bar)).animationName).toBe('none');
    expect(getComputedStyle(fill(bar)).backgroundImage).toContain('linear-gradient');
  });
});
