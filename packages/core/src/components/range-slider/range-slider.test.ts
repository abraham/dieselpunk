import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkRangeSlider } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await setLocale('en');
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(
  attributes = 'label="Price"',
  options: { dir?: string; lang?: string } = {},
): Promise<PunkRangeSlider> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = '300px';
  if (options.dir) wrapper.dir = options.dir;
  if (options.lang) wrapper.lang = options.lang;
  wrapper.innerHTML = `<punk-range-slider ${attributes}></punk-range-slider>`;
  const element = wrapper.firstElementChild as PunkRangeSlider;
  await element.updateComplete;
  return element;
}

const thumbs = (element: Element) =>
  [...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part="thumb"]') ?? [])] as [
    HTMLElement,
    HTMLElement,
  ];
const area = (element: Element) => element.shadowRoot?.querySelector('.area') as HTMLElement;

function listen(element: PunkRangeSlider): string[] {
  const log: string[] = [];
  for (const type of ['input', 'change']) {
    element.addEventListener(type, () => log.push(`${type}:${element.low}-${element.high}`));
  }
  return log;
}

/** The viewport position of `along` the span a thumb's center travels. */
function pointAt(element: Element, along: number): { x: number; y: number } {
  const rect = area(element).getBoundingClientRect();
  return { x: rect.left + 10 + (rect.width - 20) * along, y: rect.top + rect.height / 2 };
}

async function pressAt(element: PunkRangeSlider, along: number): Promise<void> {
  const { x, y } = pointAt(element, along);
  const box = area(element).getBoundingClientRect();
  await userEvent.click(area(element), { position: { x: x - box.left, y: y - box.top } });
  await element.updateComplete;
}

describe('semantics', () => {
  it('is a group named by its label, of two sliders named Minimum and Maximum', async () => {
    const element = await mount('label="Price" low="20" high="80"');
    const group = page.getByRole('group', { name: 'Price' }).element();
    expect(element.shadowRoot?.contains(group)).toBe(true);
    const [low, high] = thumbs(element);
    expect(page.getByRole('slider', { name: 'Minimum' }).element()).toBe(low);
    expect(page.getByRole('slider', { name: 'Maximum' }).element()).toBe(high);
    expect([low.getAttribute('aria-valuenow'), high.getAttribute('aria-valuenow')]).toEqual([
      '20',
      '80',
    ]);
  });

  it('gives each thumb the range up to the other', async () => {
    const element = await mount('label="Price" low="20" high="80"');
    const [low, high] = thumbs(element);
    expect([low.getAttribute('aria-valuemin'), low.getAttribute('aria-valuemax')]).toEqual([
      '0',
      '80',
    ]);
    expect([high.getAttribute('aria-valuemin'), high.getAttribute('aria-valuemax')]).toEqual([
      '20',
      '100',
    ]);
  });

  it('formats values for the page language, and names the thumbs in its locale', async () => {
    const element = await mount('label="Preis" low="1500" high="2500" max="5000" show-value', {
      lang: 'de',
    });
    expect(thumbs(element)[0].getAttribute('aria-valuetext')).toBe('1.500');
    expect(element.shadowRoot?.querySelector('[part="value"]')?.textContent).toBe('1.500 – 2.500');
    await setLocale('de');
    await vi.waitFor(() => expect(thumbs(element)[0].getAttribute('aria-label')).toBe('Minimum'));
    expect(thumbs(element)[1].getAttribute('aria-label')).toBe('Maximum');
  });

  it('takes aria-label as the group name, and warns once with no name', async () => {
    const named = await mount('aria-label="Price"');
    expect(named.shadowRoot?.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'Price',
    );
    expect(warn).not.toHaveBeenCalled();
    await mount('');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('It has no accessible name');
  });
});

describe('values', () => {
  it('defaults to the whole range, and snaps and orders what it is given', async () => {
    const element = await mount('label="Price" step="10" max="95"');
    expect([element.low, element.high]).toEqual([0, 90]);
    element.low = 33;
    element.high = 21;
    await element.updateComplete;
    expect([element.low, element.high]).toEqual([20, 20]);
  });

  it('repairs an unusable range with one warning', async () => {
    const element = await mount('label="Price" min="10" max="0"');
    expect([element.low, element.high]).toEqual([0, 100]);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('keyboard', () => {
  it('moves the focused thumb with the slider keys, and stops it at the other', async () => {
    const element = await mount('label="Price" low="40" high="60" step="10"');
    const log = listen(element);
    const [low, high] = thumbs(element);
    low.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect([element.low, element.high]).toEqual([60, 60]);
    high.focus();
    await userEvent.keyboard('{End}{ArrowLeft}');
    expect([element.low, element.high]).toEqual([60, 90]);
    low.focus();
    await userEvent.keyboard('{Home}');
    expect(element.low).toBe(0);
    expect(log.filter((entry) => entry.startsWith('change'))).toEqual([
      'change:50-60',
      'change:60-60',
      'change:60-100',
      'change:60-90',
      'change:0-90',
    ]);
  });

  it('swaps Left and Right in right-to-left text', async () => {
    const element = await mount('label="Price" low="40" high="60"', { dir: 'rtl' });
    thumbs(element)[0].focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(element.low).toBe(41);
  });

  it('is focused through the host, and takes no keys and no tab stop while disabled', async () => {
    const element = await mount('label="Price" low="40" disabled');
    expect(thumbs(element).every((thumb) => !thumb.hasAttribute('tabindex'))).toBe(true);
    expect(thumbs(element)[0].getAttribute('aria-disabled')).toBe('true');
    expect(element.shadowRoot?.querySelector('[role="group"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    const live = await mount('label="Price"');
    live.focus();
    expect(live.shadowRoot?.activeElement).toBe(thumbs(live)[0]);
  });
});

describe('pointer', () => {
  it('moves the nearer thumb to a press, and focuses it', async () => {
    const element = await mount('label="Price" low="20" high="80"');
    const log = listen(element);
    await pressAt(element, 0.3);
    expect([element.low, element.high]).toEqual([30, 80]);
    expect(element.shadowRoot?.activeElement).toBe(thumbs(element)[0]);
    await pressAt(element, 0.6);
    expect([element.low, element.high]).toEqual([30, 60]);
    await pressAt(element, 0.95);
    expect(element.high).toBe(95);
    expect(log.filter((entry) => entry.startsWith('change'))).toEqual([
      'change:30-80',
      'change:30-60',
      'change:30-95',
    ]);
  });

  it('parts two thumbs at one value toward the press', async () => {
    const element = await mount('label="Price" low="50" high="50"');
    await pressAt(element, 0.4);
    expect([element.low, element.high]).toEqual([40, 50]);
    const top = await mount('label="Price" low="100" high="100"');
    await pressAt(top, 1);
    await pressAt(top, 0.7);
    expect([top.low, top.high]).toEqual([70, 100]);
  });

  it('follows a drag without passing the other thumb, and sends change once', async () => {
    const element = await mount('label="Price" low="20" high="60"');
    const log = listen(element);
    const box = area(element).getBoundingClientRect();
    const end = pointAt(element, 0.9);
    await userEvent.dragAndDrop(thumbs(element)[0], area(element), {
      targetPosition: { x: end.x - box.left, y: end.y - box.top },
    });
    expect([element.low, element.high]).toEqual([60, 60]);
    expect(log.filter((entry) => entry.startsWith('change'))).toEqual(['change:60-60']);
  });

  it('does nothing while disabled', async () => {
    const element = await mount('label="Price" low="20" high="80" disabled');
    await pressAt(element, 0.5);
    expect([element.low, element.high]).toEqual([20, 80]);
  });
});

describe('form', () => {
  it('submits low and high under its name, and nothing without one', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML =
      '<punk-range-slider label="Price" name="price" low="20" high="80"></punk-range-slider><punk-range-slider label="Unnamed"></punk-range-slider>';
    const element = form.firstElementChild as PunkRangeSlider;
    await element.updateComplete;
    expect(new FormData(form).getAll('price')).toEqual(['20', '80']);
    expect([...new FormData(form).keys()]).toEqual(['price', 'price']);
  });

  it('goes back to the authored values on reset, and restores a kept state', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML =
      '<punk-range-slider label="Price" name="price" low="20" high="80"></punk-range-slider>';
    const element = form.firstElementChild as PunkRangeSlider;
    await element.updateComplete;
    thumbs(element)[0].focus();
    await userEvent.keyboard('{End}');
    expect(new FormData(form).getAll('price')).toEqual(['80', '80']);
    form.reset();
    await element.updateComplete;
    expect(new FormData(form).getAll('price')).toEqual(['20', '80']);
    const state = new FormData();
    state.append('price', '30');
    state.append('price', '40');
    element.formStateRestoreCallback(state);
    await element.updateComplete;
    expect([element.low, element.high]).toEqual([30, 40]);
  });
});

describe('look', () => {
  it('fills the track between the thumbs, and keeps the parts under forced colors', async () => {
    const element = await mount('label="Price" low="25" high="75"');
    const fill = element.shadowRoot?.querySelector('.fill') as HTMLElement;
    const [low, high] = thumbs(element).map((thumb) => thumb.getBoundingClientRect()) as [
      DOMRect,
      DOMRect,
    ];
    const box = fill.getBoundingClientRect();
    // The fill is inside the track's 1px boundary, so it may sit a pixel from a thumb's center.
    expect(Math.abs(box.left - (low.left + low.width / 2))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(box.right - (high.left + high.width / 2))).toBeLessThanOrEqual(1.5);
    await commands.setForcedColors('active');
    expect(getComputedStyle(thumbs(element)[0]).borderTopWidth).toBe('2px');
    expect(getComputedStyle(fill).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
