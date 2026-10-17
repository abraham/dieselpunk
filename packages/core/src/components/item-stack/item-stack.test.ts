import { setLocale } from '../../../test/browser/locale.ts';
import { commands, page, server, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import {
  ratio,
  ringColor,
  slotOf,
  structure,
  toHex,
} from '../../../test/browser/receptacle-helpers.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkActivateDetail } from '../../internal/selectable-base.ts';
import type { PunkItemStack } from './index.ts';

let warn: MockInstance<typeof console.warn>;

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

function spyOnWarnings(): void {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
}

const art =
  '<svg slot="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';

async function mount(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkItemStack> {
  const element = document.createElement('punk-item-stack');
  element.innerHTML = options.content ?? art;
  for (const [name, value] of Object.entries({ name: 'Speed module', ...attributes })) {
    element.setAttribute(name, value);
  }
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function container(attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return track(element);
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`);
const text = (element: Element, name: string) => part(element, name)?.textContent?.trim();
const accessibleText = (element: Element) =>
  element.shadowRoot?.querySelector('.visually-hidden')?.textContent;

describe('accessible name', () => {
  it('carries the name and the unabridged quantity', async () => {
    const element = await mount({ count: '1234' });
    expect(page.getByRole('button', { name: 'Speed module, 1,234', exact: true }).element()).toBe(
      element,
    );
  });

  it('says "of" for a capacity, and lists durability, quality, and invalid in that order', async () => {
    const stack = await mount({ count: '75', capacity: '100' });
    expect(
      page.getByRole('button', { name: 'Speed module, 75 of 100', exact: true }).element(),
    ).toBe(stack);
    const worn = await mount({ count: '12', durability: '0.4', quality: '3', invalid: '' });
    expect(
      page
        .getByRole('button', {
          name: 'Speed module, 12, durability 40%, quality 3, invalid',
          exact: true,
        })
        .element(),
    ).toBe(worn);
  });

  it('names a single item with its quantity, and leaves quality out at zero', async () => {
    const element = await mount();
    expect(accessibleText(element)).toBe('Speed module, 1');
  });

  it('formats numbers for the language of the page', async () => {
    const wrapper = container({ lang: 'de' });
    const element = await mount(
      { count: '1234', capacity: '5000', durability: '0.4' },
      { parent: wrapper },
    );
    const percent = new Intl.NumberFormat('de', { style: 'percent' }).format(0.4);
    expect(accessibleText(element)).toBe(`Speed module, 1.234 of 5.000, durability ${percent}`);
  });

  it('is not abbreviated by compact-count, which only changes what is shown', async () => {
    const element = await mount({ count: '1234567', 'compact-count': '' });
    expect(text(element, 'count')).toBe('1.2M');
    expect(accessibleText(element)).toBe('Speed module, 1,234,567');
    const plain = await mount({ count: '1234567' });
    expect(text(plain, 'count')).toBe('1,234,567');
  });

  it('can be replaced by a translation', async () => {
    await setLocale('de');
    try {
      const element = await mount({ count: '3', capacity: '9', quality: '2' });
      expect(accessibleText(element)).toBe('Speed module, 9 max, 3 da, Güte 2');
    } finally {
      await setLocale('en');
    }
  });

  it('follows a name that changes', async () => {
    const element = await mount();
    element.name = 'Coil';
    await element.updateComplete;
    expect(accessibleText(element)).toBe('Coil, 1');
  });
});

describe('shown count', () => {
  it('is hidden for exactly one item', async () => {
    expect(part(await mount({ count: '1' }), 'count')).toBeNull();
  });

  it.each([
    [{ count: '0' }, '0'],
    [{ count: '2' }, '2'],
    [{ count: '1234' }, '1,234'],
    [{ count: '1', capacity: '10' }, '1/10'],
    [{ count: '75', capacity: '100' }, '75/100'],
    [{ count: '1234', capacity: '5000', 'compact-count': '' }, '1.2K/5K'],
  ] as const)('shows %j as %s', async (attributes, shown) => {
    expect(text(await mount({ ...attributes }), 'count')).toBe(shown);
  });

  it('goes back to one item when the count attribute is removed', async () => {
    spyOnWarnings();
    const element = await mount({ count: '8' });
    element.removeAttribute('count');
    await element.updateComplete;
    expect(part(element, 'count')).toBeNull();
    expect(accessibleText(element)).toBe('Speed module, 1');
    expect(warn).not.toHaveBeenCalled();
  });

  it('puts the count on an opaque plate that meets the text contrast in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      const wrapper = container({ 'data-punk-theme': theme });
      // A white and a black picture behind the plate must not matter.
      for (const picture of ['#ffffff', '#000000']) {
        const element = await mount(
          { count: '64' },
          {
            parent: wrapper,
            content: `<span slot="icon" style="display: block; inline-size: 100%; block-size: 100%; background: ${picture}"></span>`,
          },
        );
        const style = getComputedStyle(part(element, 'count') as Element);
        const needed = theme === 'high-contrast' ? 7 : 4.5;
        const actual = ratio(toHex(style.color), toHex(style.backgroundColor));
        if (!style.backgroundColor.startsWith('rgb('))
          problems.push(`${theme}: plate is not opaque`);
        if (actual < needed) problems.push(`${theme}: ${actual.toFixed(2)} < ${needed}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps a long count inside the item', async () => {
    const element = await mount({ count: '123456789', capacity: '987654321' });
    const plate = (part(element, 'count') as HTMLElement).getBoundingClientRect();
    const box = element.getBoundingClientRect();
    expect(plate.right).toBeLessThanOrEqual(box.right + 0.5);
    expect(plate.left).toBeGreaterThanOrEqual(box.left - 0.5);
  });

  it('cuts a long count at its end, not its start, on a right-to-left page', async () => {
    for (const dir of ['ltr', 'rtl']) {
      const element = await mount(
        { count: '1234567', capacity: '9876543' },
        { parent: container({ dir }) },
      );
      const plate = part(element, 'count') as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(plate);
      expect(plate.scrollWidth, dir).toBeGreaterThan(plate.clientWidth);
      // The first digit has to be on show; a cut tail is clearly cut, a missing head reads wrong.
      expect(range.getBoundingClientRect().left, dir).toBeGreaterThanOrEqual(
        plate.getBoundingClientRect().left - 0.5,
      );
    }
  });
});

describe('durability and quality', () => {
  it('draws the durability as a bar whose length follows the value', async () => {
    const element = await mount({ durability: '0.5' });
    const fill = element.shadowRoot?.querySelector('.durability-fill') as HTMLElement;
    const trough = part(element, 'durability') as HTMLElement;
    expect(fill.getBoundingClientRect().width).toBeCloseTo(
      trough.getBoundingClientRect().width / 2,
      0,
    );
    element.durability = 0.25;
    await element.updateComplete;
    await Promise.all(fill.getAnimations().map((animation) => animation.finished));
    expect(fill.getBoundingClientRect().width).toBeCloseTo(
      trough.getBoundingClientRect().width / 4,
      0,
    );
  });

  it('has no bar without a durability', async () => {
    expect(part(await mount(), 'durability')).toBeNull();
  });

  it('keeps the count above the bar instead of over it', async () => {
    const element = await mount({ count: '64', durability: '0.5' });
    const plate = (part(element, 'count') as HTMLElement).getBoundingClientRect();
    const bar = (part(element, 'durability') as HTMLElement).getBoundingClientRect();
    expect(plate.bottom).toBeLessThanOrEqual(bar.top + 0.5);
  });

  it('tells good, worn, and nearly broken apart by pattern once color is gone', async () => {
    const patterns = new Set<string>();
    for (const durability of ['0.8', '0.4', '0.1']) {
      const element = await mount({ durability });
      const fill = element.shadowRoot?.querySelector('.durability-fill') as HTMLElement;
      patterns.add(getComputedStyle(fill).backgroundImage.replace(/rgba?\([^)]*\)/g, 'C'));
    }
    expect(patterns.size).toBe(3);
  });

  it.skipIf(server.browser !== 'chromium')(
    'keeps the patterns and the diamonds visible under forced colors',
    async () => {
      await commands.setForcedColors('active');
      const element = await mount({ durability: '0.1', quality: '2' });
      const fill = element.shadowRoot?.querySelector('.durability-fill') as HTMLElement;
      expect(getComputedStyle(fill).forcedColorAdjust).toBe('none');
      expect(getComputedStyle(fill).backgroundImage).toContain('gradient');
      const diamond = element.shadowRoot?.querySelector('.diamond') as HTMLElement;
      expect(getComputedStyle(diamond).backgroundColor).not.toBe(
        getComputedStyle(part(element, 'quality') as Element).backgroundColor,
      );
    },
  );

  it.each([1, 3, 5])('draws %i diamonds for a quality of %i', async (quality) => {
    const element = await mount({ quality: String(quality) });
    expect(element.shadowRoot?.querySelectorAll('.diamond')).toHaveLength(quality);
  });

  it('draws no diamonds at quality 0', async () => {
    expect(part(await mount(), 'quality')).toBeNull();
  });
});

describe('invalid input', () => {
  it('clamps a negative count, and warns once', async () => {
    spyOnWarnings();
    const element = await mount({ count: '-5' });
    expect(accessibleText(element)).toBe('Speed module, 0');
    expect(text(element, 'count')).toBe('0');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('count');
    element.requestUpdate();
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('treats a count that is not a number as zero', async () => {
    spyOnWarnings();
    const element = await mount({ count: 'many' });
    expect(accessibleText(element)).toBe('Speed module, 0');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('clamps a durability outside 0 to 1, and ignores one that is not a number', async () => {
    spyOnWarnings();
    const high = await mount({ durability: '2' });
    expect(accessibleText(high)).toBe('Speed module, 1, durability 100%');
    const low = await mount({ durability: '-1' });
    expect(accessibleText(low)).toBe('Speed module, 1, durability 0%');
    const junk = await mount({ durability: 'worn' });
    expect(part(junk, 'durability')).toBeNull();
    expect(accessibleText(junk)).toBe('Speed module, 1');
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('rounds a quality to a whole number from 0 to 5', async () => {
    spyOnWarnings();
    const high = await mount({ quality: '9' });
    expect(high.shadowRoot?.querySelectorAll('.diamond')).toHaveLength(5);
    expect(accessibleText(high)).toBe('Speed module, 1, quality 5');
    const fraction = await mount({ quality: '2.6' });
    expect(fraction.shadowRoot?.querySelectorAll('.diamond')).toHaveLength(3);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('ignores a capacity that is not above zero', async () => {
    spyOnWarnings();
    for (const capacity of ['0', '-3', 'lots']) {
      const element = await mount({ count: '4', capacity });
      expect(accessibleText(element)).toBe('Speed module, 4');
      expect(text(element, 'count')).toBe('4');
    }
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('does not warn for good values, including a count above the capacity', async () => {
    spyOnWarnings();
    await mount({ count: '120', capacity: '100', durability: '0', quality: '5' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once when it has no accessible name, and not when it has one', async () => {
    spyOnWarnings();
    await mount({ name: '' }, { content: '' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-item-stack>');
    warn.mockClear();
    await mount({ name: '', 'aria-label': 'Item' }, { content: '' });
    await mount({ name: 'Coil' }, { content: '' });
    await mount({ name: '' });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('as a slot', () => {
  it('activates on a click and on the keys, with its value', async () => {
    const element = await mount({ value: 'speed-module' });
    const handler = vi.fn<(event: CustomEvent<PunkActivateDetail>) => void>();
    document.body.addEventListener('punk-activate', handler);
    await userEvent.click(element);
    element.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler.mock.calls[0]?.[0].detail).toEqual({ value: 'speed-module', item: element });
  });

  it('exposes the same button semantics as a slot', async () => {
    const element = await mount({ count: '2' });
    expect(element.getAttribute('role')).toBe('button');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.hasAttribute('aria-pressed')).toBe(false);
    element.selected = true;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('true');
    element.disabled = true;
    await element.updateComplete;
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(element.hasAttribute('tabindex')).toBe(false);
  });

  it('draws the states differently once every color is gone', async () => {
    const found = new Set<string>();
    const variants: Record<string, string>[] = [
      {},
      { selected: '' },
      { highlighted: '' },
      { invalid: '' },
      { disabled: '' },
    ];
    for (const attributes of variants) {
      found.add(structure(await mount({ count: '8', ...attributes })));
    }
    expect(found.size).toBe(5);
  });

  it('is sized like a slot', async () => {
    const sizes: number[] = [];
    for (const size of ['sm', 'md', 'lg']) {
      sizes.push((await mount({ size })).getBoundingClientRect().width);
    }
    expect(sizes[0]).toBeCloseTo(32, 0);
    expect(sizes[1]).toBeCloseTo(40, 0);
    expect(sizes[2]).toBeCloseTo(48, 0);
  });

  it('is identified by its boundary only while nothing visible is in it', async () => {
    const control = themes.industrial.tokens['color-control-edge'];
    const bare = await mount({ count: '1' }, { content: '' });
    expect(ringColor(slotOf(bare))).toBe(control);
    expect(ringColor(slotOf(await mount({ count: '1' })))).not.toBe(control);
    expect(ringColor(slotOf(await mount({ count: '64' }, { content: '' })))).not.toBe(control);
  });
});
