import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkSlider } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(
  attributes = 'label="Speed"',
  options: { dir?: string; lang?: string; width?: number } = {},
): Promise<PunkSlider> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = `${options.width ?? 300}px`;
  if (options.dir) wrapper.dir = options.dir;
  if (options.lang) wrapper.lang = options.lang;
  wrapper.innerHTML = `<punk-slider ${attributes}></punk-slider>`;
  const element = wrapper.firstElementChild as PunkSlider;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const area = (element: Element) => element.shadowRoot?.querySelector('.area') as HTMLElement;

/** Records what the user does to the value. */
function listen(element: Element) {
  const log: string[] = [];
  for (const type of ['input', 'change']) {
    element.addEventListener(type, () => log.push(`${type}:${(element as PunkSlider).value}`));
  }
  return log;
}

/** The viewport position of `ratio` along the span the thumb's center travels. */
function pointAt(element: Element, along: number): { x: number; y: number } {
  const rect = area(element).getBoundingClientRect();
  return { x: rect.left + 10 + (rect.width - 20) * along, y: rect.top + rect.height / 2 };
}

const press = (element: Element, key: string) => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
};

describe('on the host', () => {
  it('is a slider with its range, value, and a tab stop as attributes', async () => {
    const element = await mount('label="Speed" min="10" max="50" value="30"');
    expect(element.getAttribute('role')).toBe('slider');
    expect(element.getAttribute('aria-valuemin')).toBe('10');
    expect(element.getAttribute('aria-valuemax')).toBe('50');
    expect(element.getAttribute('aria-valuenow')).toBe('30');
    expect(element.getAttribute('aria-orientation')).toBe('horizontal');
    expect(element.getAttribute('tabindex')).toBe('0');
  });

  it('has them before it renders', () => {
    const element = track(document.createElement('punk-slider')) as PunkSlider;
    expect(element.getAttribute('role')).toBe('slider');
    expect(element.getAttribute('aria-valuenow')).toBe('0');
  });

  it('keeps aria-valuenow with the value', async () => {
    const element = await mount();
    element.value = 40;
    await element.updateComplete;
    expect(element.getAttribute('aria-valuenow')).toBe('40');
  });

  it('is disabled by its attribute and by a fieldset, and has no tab stop then', async () => {
    const disabled = await mount('label="Speed" disabled');
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.hasAttribute('tabindex')).toBe(false);
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML = '<fieldset disabled><punk-slider label="Speed"></punk-slider></fieldset>';
    const inside = wrapper.querySelector('punk-slider') as PunkSlider;
    await inside.updateComplete;
    expect(inside.disabled).toBe(false);
    expect(inside.getAttribute('aria-disabled')).toBe('true');
    expect(inside.hasAttribute('tabindex')).toBe(false);
  });
});

describe('the name', () => {
  it('is the label, written to aria-label on the host', async () => {
    const element = await mount('label="Crafting speed"');
    expect(element.getAttribute('aria-label')).toBe('Crafting speed');
    expect(warn).not.toHaveBeenCalled();
  });

  it('follows the label, and is taken away when the label is', async () => {
    const element = await mount('label="Speed"');
    element.label = 'Rate';
    await element.updateComplete;
    expect(element.getAttribute('aria-label')).toBe('Rate');
    element.label = '';
    element.setAttribute('aria-label', 'Spare');
    await element.updateComplete;
    expect(element.getAttribute('aria-label')).toBe('Spare');
    const other = await mount('label="Speed"');
    other.label = '';
    await other.updateComplete;
    expect(other.hasAttribute('aria-label')).toBe(false);
  });

  it("is the author's aria-label when they set one, and the label stays visible", async () => {
    const element = await mount('label="Speed" aria-label="Crafting speed"');
    expect(element.getAttribute('aria-label')).toBe('Crafting speed');
    expect(part(element, 'label').hidden).toBe(false);
  });

  it('is aria-label alone when there is no label, and warns once with neither', async () => {
    await mount('aria-label="Speed"');
    expect(warn).not.toHaveBeenCalled();
    const unnamed = await mount('');
    unnamed.value = 3;
    await unnamed.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('<punk-slider>');
  });
});

describe('the value', () => {
  it('is min until one is set, wherever min is', async () => {
    expect((await mount('label="Speed"')).value).toBe(0);
    expect((await mount('label="Speed" min="10" max="20"')).value).toBe(10);
    expect((await mount('label="Speed" min="-50" max="50"')).value).toBe(-50);
  });

  it('is the attribute, and reads back what was set', async () => {
    const element = await mount('label="Speed" value="30"');
    expect(element.value).toBe(30);
    element.value = 70;
    expect(element.value).toBe(70);
  });

  it('is clamped to the range, and snapped to the step, when it is set', async () => {
    const element = await mount('label="Speed" min="0" max="10" step="2"');
    element.value = 7;
    expect(element.value).toBe(8);
    element.value = 99;
    expect(element.value).toBe(10);
    element.value = -4;
    expect(element.value).toBe(0);
    element.value = Number.NaN;
    expect(element.value).toBe(0);
  });

  it('is clamped again when the range changes', async () => {
    const element = await mount('label="Speed" value="80"');
    element.max = 50;
    await element.updateComplete;
    expect(element.value).toBe(50);
    expect(element.getAttribute('aria-valuenow')).toBe('50');
    element.step = 20;
    await element.updateComplete;
    expect(element.value).toBe(40);
  });

  it('does not drift with decimal steps', async () => {
    const element = await mount('label="Speed" min="0" max="1" step="0.1"');
    for (let press = 0; press < 3; press++) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    }
    expect(element.value).toBe(0.3);
    await element.updateComplete;
    expect(element.getAttribute('aria-valuenow')).toBe('0.3');
  });

  it('never reaches a max that is not a whole number of steps from min', async () => {
    const element = await mount('label="Speed" min="0" max="10" step="3"');
    element.value = 10;
    expect(element.value).toBe(9);
  });

  it('is repaired with one warning when the range is inverted or not a number', async () => {
    const element = await mount('label="Speed" min="10" max="0"');
    element.value = 150;
    await element.updateComplete;
    expect(element.value).toBe(100);
    expect(element.getAttribute('aria-valuemin')).toBe('0');
    expect(element.getAttribute('aria-valuemax')).toBe('100');
    element.max = 5;
    element.min = 8;
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is repaired when the step is not above 0', async () => {
    const element = await mount('label="Speed" step="0"');
    element.value = 4.4;
    expect(element.value).toBe(4);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps a max that is not on a step out of reach', async () => {
    const element = await mount('label="Speed" min="0" max="11" step="4"');
    element.value = 11;
    expect(element.value).toBe(8);
  });

  it('reflects min, max, and step, and does not reflect value', async () => {
    const element = await mount('label="Speed" value="20"');
    element.min = 5;
    element.max = 60;
    element.step = 5;
    element.value = 35;
    await element.updateComplete;
    expect(['min', 'max', 'step'].map((name) => element.getAttribute(name))).toEqual([
      '5',
      '60',
      '5',
    ]);
    expect(element.getAttribute('value')).toBe('20');
  });

  it('sends nothing when it is set from code', async () => {
    const element = await mount();
    const log = listen(element);
    element.value = 40;
    await element.updateComplete;
    expect(log).toEqual([]);
  });
});

describe('aria-valuetext', () => {
  it('is the number in the language of the page', async () => {
    const element = await mount('label="Speed" max="5000" step="0.5" value="1234.5"', {
      lang: 'de',
    });
    expect(element.getAttribute('aria-valuetext')).toBe('1.234,5');
    element.value = 2000;
    await element.updateComplete;
    expect(element.getAttribute('aria-valuetext')).toBe('2.000');
    const english = await mount('label="Speed" max="5000" step="0.5" value="1234.5"', {
      lang: 'en',
    });
    expect(english.getAttribute('aria-valuetext')).toBe('1,234.5');
  });

  it("is the host's own when it set one", async () => {
    const element = await mount('label="Speed" aria-valuetext="Fast"');
    element.value = 20;
    await element.updateComplete;
    expect(element.getAttribute('aria-valuetext')).toBe('Fast');
  });
});

describe('what it shows', () => {
  it('shows the value beside the label with show-value, and hides it from assistive technology', async () => {
    const element = await mount('label="Speed" value="42" show-value');
    expect(part(element, 'value').textContent?.trim()).toBe('42');
    expect(part(element, 'value').getAttribute('aria-hidden')).toBe('true');
    element.value = 50;
    await element.updateComplete;
    expect(part(element, 'value').textContent?.trim()).toBe('50');
  });

  it('has no header at all without a label or a value to show', async () => {
    const element = await mount('aria-label="Speed"');
    expect(part(element, 'header').hidden).toBe(true);
    element.showValue = true;
    await element.updateComplete;
    expect(part(element, 'header').hidden).toBe(false);
    expect(part(element, 'label').hidden).toBe(true);
  });

  it.each([
    ['min="0" max="4" step="1"', 5],
    ['min="0" max="20" step="1"', 21],
    ['min="0" max="21" step="1"', 11],
    ['min="0" max="100" step="1"', 21],
    ['min="0" max="1" step="0.1"', 11],
  ])('draws the ticks for %s: %i of them', async (range, count) => {
    const element = await mount(`label="Speed" ticks ${range}`);
    expect(element.shadowRoot?.querySelectorAll('[part="tick"]').length).toBe(count);
  });

  it('draws no ticks unless asked, and none for a range with no width', async () => {
    expect((await mount()).shadowRoot?.querySelectorAll('[part="tick"]').length).toBe(0);
    const flat = await mount('label="Speed" ticks min="3" max="3"');
    expect(flat.shadowRoot?.querySelectorAll('[part="tick"]').length).toBe(0);
  });

  it('puts the thumb and the fill where the value is', async () => {
    const element = await mount('label="Speed" value="0"');
    const trackBox = part(element, 'track').getBoundingClientRect();
    const place = () => {
      const thumb = part(element, 'thumb').getBoundingClientRect();
      const fill = part(element, 'fill').getBoundingClientRect();
      return {
        thumb: thumb.left - trackBox.left,
        fill: fill.right - trackBox.left,
        width: thumb.width,
      };
    };
    expect(place().thumb).toBeLessThan(2);
    element.value = 100;
    await element.updateComplete;
    expect(place().thumb + place().width).toBeGreaterThan(trackBox.width - 2);
    element.value = 25;
    await element.updateComplete;
    const middle = place();
    expect(Math.abs(middle.fill - (middle.thumb + middle.width / 2))).toBeLessThan(1.5);
  });

  it('puts the start of the range on the right in right-to-left text', async () => {
    const element = await mount('label="Speed" value="0"', { dir: 'rtl' });
    const thumb = part(element, 'thumb').getBoundingClientRect();
    const trackBox = part(element, 'track').getBoundingClientRect();
    expect(trackBox.right - thumb.right).toBeLessThan(2);
  });
});

describe('the keyboard', () => {
  it('steps with the arrow keys, and sends input and change for each', async () => {
    const element = await mount('label="Speed" value="10"');
    const log = listen(element);
    press(element, 'ArrowRight');
    press(element, 'ArrowUp');
    press(element, 'ArrowLeft');
    press(element, 'ArrowDown');
    expect(log).toEqual([
      'input:11',
      'change:11',
      'input:12',
      'change:12',
      'input:11',
      'change:11',
      'input:10',
      'change:10',
    ]);
  });

  it('is moved by a real key press', async () => {
    const element = await mount('label="Speed" value="10"');
    await focusWithKeyboard(element);
    element.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(element.value).toBe(12);
  });

  it('goes to the ends with Home and End, and by a tenth with the Page keys', async () => {
    const element = await mount('label="Speed" value="40"');
    press(element, 'Home');
    expect(element.value).toBe(0);
    press(element, 'End');
    expect(element.value).toBe(100);
    press(element, 'PageDown');
    expect(element.value).toBe(90);
    press(element, 'PageUp');
    press(element, 'PageUp');
    expect(element.value).toBe(100);
  });

  it('swaps left and right in right-to-left text, and not up and down', async () => {
    const element = await mount('label="Speed" value="10"', { dir: 'rtl' });
    press(element, 'ArrowLeft');
    expect(element.value).toBe(11);
    press(element, 'ArrowRight');
    expect(element.value).toBe(10);
    press(element, 'ArrowUp');
    expect(element.value).toBe(11);
    press(element, 'ArrowDown');
    expect(element.value).toBe(10);
  });

  it('sends nothing at the end of the range, and still keeps the page from scrolling', async () => {
    const element = await mount('label="Speed" value="100"');
    const log = listen(element);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(log).toEqual([]);
  });

  it('leaves other keys, keys with a modifier, and keys for something inside alone', async () => {
    const element = await mount('label="Speed" value="10"');
    for (const init of [
      { key: 'a' },
      { key: 'Tab' },
      { key: 'ArrowRight', ctrlKey: true },
      { key: 'ArrowRight', altKey: true },
      { key: 'ArrowRight', metaKey: true },
    ]) {
      const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      expect(event.defaultPrevented, JSON.stringify(init)).toBe(false);
    }
    expect(element.value).toBe(10);
    const inner = document.createElement('input');
    element.append(inner);
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(element.value).toBe(10);
  });

  it('does nothing while disabled', async () => {
    const element = await mount('label="Speed" value="10" disabled');
    press(element, 'ArrowRight');
    expect(element.value).toBe(10);
  });
});

describe('the pointer', () => {
  it('sets the value where the track is pressed, and focuses the slider', async () => {
    const element = await mount('label="Speed"');
    const log = listen(element);
    const { x, y } = pointAt(element, 0.5);
    const box = area(element).getBoundingClientRect();
    await userEvent.click(area(element), { position: { x: x - box.left, y: y - box.top } });
    expect(element.value).toBe(50);
    expect(log).toEqual(['input:50', 'change:50']);
    expect(document.activeElement).toBe(element);
  });

  it('follows a drag, and sends change once, when it ends', async () => {
    const element = await mount('label="Speed" value="20"');
    const log = listen(element);
    const thumb = part(element, 'thumb');
    const box = area(element).getBoundingClientRect();
    const end = pointAt(element, 0.8);
    await userEvent.dragAndDrop(thumb, area(element), {
      targetPosition: { x: end.x - box.left, y: end.y - box.top },
    });
    expect(element.value).toBe(80);
    expect(log.filter((entry) => entry.startsWith('change'))).toEqual(['change:80']);
    expect(log.filter((entry) => entry.startsWith('input')).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps a value inside the range when the pointer leaves the track', async () => {
    const element = await mount('label="Speed" value="50"');
    const box = area(element).getBoundingClientRect();
    await userEvent.dragAndDrop(part(element, 'thumb'), area(element), {
      targetPosition: { x: box.width - 1, y: box.height / 2 },
    });
    expect(element.value).toBeLessThanOrEqual(100);
    expect(element.value).toBeGreaterThan(90);
  });

  it('snaps to the step', async () => {
    const element = await mount('label="Speed" step="10"');
    const { x, y } = pointAt(element, 0.47);
    const box = area(element).getBoundingClientRect();
    await userEvent.click(area(element), { position: { x: x - box.left, y: y - box.top } });
    expect(element.value).toBe(50);
  });

  it('reads the track once for a press, however far the pointer moves', async () => {
    const element = await mount('label="Speed" value="20"');
    const target = area(element);
    const box = target.getBoundingClientRect();
    const end = pointAt(element, 0.9);
    const read = vi.spyOn(target, 'getBoundingClientRect');
    await userEvent.dragAndDrop(part(element, 'thumb'), target, {
      targetPosition: { x: end.x - box.left, y: end.y - box.top },
    });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('keeps the press from selecting text or starting a drag of the page', async () => {
    const element = await mount('label="Speed"');
    let prevented: boolean | undefined;
    element.addEventListener('pointerdown', (event) => {
      prevented = event.defaultPrevented;
    });
    const { x, y } = pointAt(element, 0.5);
    const box = area(element).getBoundingClientRect();
    await userEvent.click(area(element), { position: { x: x - box.left, y: y - box.top } });
    expect(prevented).toBe(true);
  });

  it('puts the start of the range on the right in right-to-left text', async () => {
    const element = await mount('label="Speed"', { dir: 'rtl' });
    const { x, y } = pointAt(element, 0.25);
    const box = area(element).getBoundingClientRect();
    await userEvent.click(area(element), { position: { x: x - box.left, y: y - box.top } });
    expect(element.value).toBe(75);
  });

  it('is ignored while disabled, and for the secondary button', async () => {
    const disabled = await mount('label="Speed" disabled');
    const { x, y } = pointAt(disabled, 0.5);
    const box = area(disabled).getBoundingClientRect();
    await userEvent.click(area(disabled), { position: { x: x - box.left, y: y - box.top } });
    expect(disabled.value).toBe(0);
    const element = await mount('label="Speed"');
    const spot = pointAt(element, 0.5);
    const rect = area(element).getBoundingClientRect();
    await userEvent.click(area(element), {
      button: 'right',
      position: { x: spot.x - rect.left, y: spot.y - rect.top },
    });
    expect(element.value).toBe(0);
  });

  it('keeps the page scrollable up and down, with touch', async () => {
    const element = await mount();
    expect(getComputedStyle(area(element)).touchAction).toBe('pan-y');
  });
});

describe('appearance', () => {
  it('has a boundary on the track and the thumb that meets 3:1 on every surface in every theme', async () => {
    const problems: string[] = [];
    for (const theme of themeNames) {
      for (const surface of ['canvas', 'panel', 'panel-raised', 'panel-inset']) {
        const holder = track(document.createElement('div'));
        holder.setAttribute('data-punk-theme', theme);
        holder.style.cssText = `background: var(--punk-color-${surface}); inline-size: 300px`;
        holder.innerHTML = '<punk-slider label="Speed" value="50"></punk-slider>';
        const element = holder.firstElementChild as PunkSlider;
        await element.updateComplete;
        const behind = toHex(getComputedStyle(holder).backgroundColor);
        for (const name of ['track', 'thumb']) {
          const edge = toHex(getComputedStyle(part(element, name)).borderTopColor);
          const found = ratio(edge, behind);
          if (found < 3) problems.push(`${theme} ${name} on ${surface}: ${found.toFixed(2)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('draws the fill in accent, which differs from the trough', async () => {
    const element = await mount('label="Speed" value="50"');
    expect(getComputedStyle(part(element, 'fill')).backgroundColor).not.toBe(
      getComputedStyle(part(element, 'track')).backgroundColor,
    );
  });

  it('keeps the fill, the track, and the thumb apart under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await mount('label="Speed" value="50"');
    const fill = getComputedStyle(part(element, 'fill')).backgroundColor;
    const trackFill = getComputedStyle(part(element, 'track')).backgroundColor;
    expect(fill).not.toBe(trackFill);
    expect(getComputedStyle(part(element, 'thumb')).borderTopStyle).toBe('solid');
    expect(getComputedStyle(part(element, 'track')).borderTopStyle).toBe('solid');
  });

  it('shows a focus ring on the thumb for the keyboard', async () => {
    const element = await mount('label="Speed"');
    await focusWithKeyboard(element);
    element.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(getComputedStyle(part(element, 'thumb'), '::after').boxShadow).not.toBe('none');
  });

  it('looks different while disabled', async () => {
    const on = await mount('label="Speed" value="50"');
    const off = await mount('label="Speed" value="50" disabled');
    expect(getComputedStyle(part(off, 'fill')).backgroundColor).not.toBe(
      getComputedStyle(part(on, 'fill')).backgroundColor,
    );
  });

  it('is no wider than its container at 187px, with a long label', async () => {
    const element = await mount(
      'label="Fertigungsgeschwindigkeitsüberschreitung" show-value ticks',
      {
        width: 187,
      },
    );
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(187);
    expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
  });
});
