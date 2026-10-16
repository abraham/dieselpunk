import { commands } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkSwitch } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(attributes = '', content = 'Fuel', parent?: Element): Promise<PunkSwitch> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<punk-switch ${attributes}>${content}</punk-switch>`);
  const element = wrapper.lastElementChild as PunkSwitch;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;

/** The mark with every color gone: a ring when off, a bar when on. */
function mark(element: Element): string {
  const style = getComputedStyle(part(element, 'mark'));
  return JSON.stringify([
    style.width,
    style.height,
    style.borderTopWidth,
    style.borderTopLeftRadius,
  ]);
}

/** How far the thumb is along the track, from 0 at the start to 1 at the end, whatever the direction. */
function travel(element: Element, rtl: boolean): number {
  const track = part(element, 'track').getBoundingClientRect();
  const thumb = part(element, 'thumb').getBoundingClientRect();
  const free = track.width - thumb.width;
  const along = rtl ? track.right - thumb.right : thumb.left - track.left;
  return Math.round((along / free) * 10) / 10;
}

describe('the thumb', () => {
  it('is at the start while off and at the end while on', async () => {
    const element = await mount();
    expect(travel(element, false)).toBeLessThanOrEqual(0.2);
    element.checked = true;
    await element.updateComplete;
    await vi.waitFor(() => expect(travel(element, false)).toBeGreaterThanOrEqual(0.8));
  });

  it('follows the writing direction', async () => {
    const holder = track(document.createElement('div'));
    holder.dir = 'rtl';
    const element = await mount('checked', 'Fuel', holder);
    await vi.waitFor(() => expect(travel(element, true)).toBeGreaterThanOrEqual(0.8));
    // The end of the track is on the left, so the thumb is near its left edge.
    expect(
      part(element, 'thumb').getBoundingClientRect().left -
        part(element, 'track').getBoundingClientRect().left,
    ).toBeLessThan(10);
  });
});

describe('appearance', () => {
  it('draws a ring while off and a bar while on', async () => {
    const off = getComputedStyle(part(await mount(), 'mark'));
    expect([off.borderTopWidth, off.borderTopLeftRadius]).toEqual(['2px', '50%']);
    const on = getComputedStyle(part(await mount('checked'), 'mark'));
    expect([on.width, on.height, on.borderTopWidth]).toEqual(['2px', '10px', '0px']);
  });

  it('shows on and off as two shapes, with every color gone', async () => {
    const off = await mount();
    const on = await mount('checked');
    expect(mark(off)).not.toBe(mark(on));
  });

  it('keeps on and off apart, and drawn, under forced colors', async () => {
    await commands.setForcedColors('active');
    const off = await mount();
    const on = await mount('checked');
    expect(mark(off)).not.toBe(mark(on));
    expect(getComputedStyle(part(on, 'track')).backgroundColor).not.toBe(
      getComputedStyle(part(off, 'track')).backgroundColor,
    );
    expect(getComputedStyle(part(on, 'mark')).backgroundColor).not.toBe(
      getComputedStyle(part(on, 'thumb')).backgroundColor,
    );
    expect(getComputedStyle(part(off, 'track')).borderTopStyle).toBe('solid');
  });

  it('fills the track on `accent` while on, and not while off', async () => {
    const off = getComputedStyle(part(await mount(), 'track')).backgroundColor;
    const on = getComputedStyle(part(await mount('checked'), 'track')).backgroundColor;
    expect(on).not.toBe(off);
  });

  it('has a boundary that meets 3:1 on every surface in every theme, read from the render', async () => {
    const problems: string[] = [];
    for (const theme of themeNames) {
      for (const surface of ['canvas', 'panel', 'panel-raised', 'panel-inset']) {
        const holder = track(document.createElement('div'));
        holder.setAttribute('data-punk-theme', theme);
        holder.style.background = `var(--punk-color-${surface})`;
        const element = await mount('', 'Fuel', holder);
        const edge = toHex(getComputedStyle(part(element, 'track')).borderTopColor);
        const behind = toHex(getComputedStyle(holder).backgroundColor);
        const found = ratio(edge, behind);
        if (found < 3) problems.push(`${theme} on ${surface}: ${found.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
