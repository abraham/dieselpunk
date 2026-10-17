import '@fontsource/ibm-plex-mono/400.css';
import { commands } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, rgb, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkProductionStat } from './index.ts';

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
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkProductionStat> {
  const element = document.createElement('punk-production-stat');
  element.innerHTML = options.content ?? '';
  const all = { label: 'Iron plates', ...attributes };
  for (const [name, value] of Object.entries(all)) element.setAttribute(name, value);
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function container(attributes: Record<string, string> = {}, width?: number): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (width !== undefined) element.style.inlineSize = `${width}px`;
  return track(element);
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const text = (element: Element) =>
  (element.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim();
const shownText = (element: Element, name: string) =>
  (part(element, name).textContent ?? '').replace(/\s+/g, ' ').trim();
const number = (lang: string, value: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(lang, options).format(value);

describe('structure', () => {
  it('is label, value, unit, trend word, and change as text, in that order', async () => {
    const element = await mount({
      value: '1240',
      unit: '/min',
      trend: 'up',
      delta: '0.12',
      'delta-percent': '',
    });
    expect(text(element)).toBe('Iron plates 1,240 /min up +12%');
  });

  it('has no role and no name of its own', async () => {
    const element = await mount({ value: '5' });
    expect(element.hasAttribute('role')).toBe(false);
    expect(element.hasAttribute('aria-label')).toBe(false);
    expect(element.shadowRoot?.querySelector('[role], [aria-label]')).toBeNull();
  });

  it('draws the parts it has, and leaves out a unit, trend, and change it has none of', async () => {
    const bare = await mount({ value: '5' });
    for (const name of ['stat', 'label', 'value']) expect(part(bare, name), name).toBeTruthy();
    for (const name of ['unit', 'trend', 'delta']) expect(part(bare, name), name).toBeNull();
    const full = await mount({ value: '5', unit: 'MW', delta: '2' });
    for (const name of ['unit', 'trend', 'delta']) expect(part(full, name), name).toBeTruthy();
  });

  it('puts the label before the icon in the document, and the icon first on screen', async () => {
    const element = await mount(
      { value: '5' },
      { content: '<svg slot="icon" aria-hidden="true"></svg>' },
    );
    const label = part(element, 'label');
    const icon = part(element, 'icon');
    expect(label.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(icon.getBoundingClientRect().left).toBeLessThan(label.getBoundingClientRect().left);
  });

  it('is a block, and is drawn on a plate', async () => {
    const element = await mount({ value: '5' });
    expect(getComputedStyle(element).display).toBe('block');
    expect(getComputedStyle(part(element, 'stat')).backgroundColor).toBe(
      rgb(themes.dark.tokens['color-panel-inset'] as string),
    );
  });
});

describe('the value', () => {
  it('is formatted for the language of the page, and follows it', async () => {
    for (const lang of ['en', 'de', 'ar', 'ja']) {
      const element = await mount({ value: '1234567.891' }, { parent: container({ lang }) });
      expect(shownText(element, 'value')).toBe(number(lang, 1234567.891));
    }
    const wrapper = container({ lang: 'en' });
    const element = await mount({ value: '1234.5' }, { parent: wrapper });
    wrapper.lang = 'de';
    element.requestUpdate();
    await element.updateComplete;
    expect(shownText(element, 'value')).toBe(number('de', 1234.5));
  });

  it('applies decimals as a fixed number of digits', async () => {
    const element = await mount({ value: '12.5', decimals: '2' });
    expect(shownText(element, 'value')).toBe(
      number('en', 12.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
  });

  it('warns once for a decimals that is out of range, and clamps it', async () => {
    const element = await mount({ value: '1', decimals: '9' });
    expect(shownText(element, 'value')).toBe(
      number('en', 1, { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/^<punk-production-stat> `decimals`/);
    element.requestUpdate();
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('shows an abbreviated value that is hidden from assistive technology, beside the full number', async () => {
    const element = await mount({ value: '1234567', compact: '' });
    const shown = part(element, 'value').querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(shown.textContent).toBe(number('en', 1234567, { notation: 'compact' }));
    const hidden = part(element, 'value').querySelector('.visually-hidden') as HTMLElement;
    expect(hidden.textContent).toBe(number('en', 1234567));
    expect(getComputedStyle(hidden).position).toBe('absolute');
  });

  it('shows a compact value that needs no abbreviation as plain text', async () => {
    const element = await mount({ value: '12', compact: '' });
    expect(part(element, 'value').querySelector('[aria-hidden]')).toBeNull();
    expect(shownText(element, 'value')).toBe('12');
  });

  it('shows a dash and a hidden word when there is no value', async () => {
    const element = await mount();
    const dash = part(element, 'value').querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dash.textContent).toBe('–');
    expect(part(element, 'value').querySelector('.visually-hidden')?.textContent).toBe('no value');
    element.value = 3;
    await element.updateComplete;
    expect(shownText(element, 'value')).toBe('3');
    element.removeAttribute('value');
    await element.updateComplete;
    expect(shownText(element, 'value')).toContain('no value');
  });

  it('shows no value for one that is not a number, and warns once', async () => {
    const element = await mount({ value: 'abc' });
    expect(shownText(element, 'value')).toContain('no value');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/`value`/);
  });

  it('shows the unit as given, and does not format it', async () => {
    const element = await mount({ value: '5', unit: 'items/min' });
    expect(shownText(element, 'unit')).toBe('items/min');
  });
});

describe('the trend and the change', () => {
  it('draws a shape and says a word for each trend', async () => {
    const found = new Set<string>();
    for (const [trend, word] of [
      ['up', 'up'],
      ['down', 'down'],
      ['flat', 'unchanged'],
    ] as const) {
      const element = await mount({ value: '1', trend });
      expect(part(element, 'trend').querySelector('.visually-hidden')?.textContent).toBe(word);
      expect(part(element, 'trend').querySelector('.glyph')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
      found.add(
        getComputedStyle(part(element, 'trend').querySelector('.glyph') as Element).clipPath,
      );
    }
    expect(found.size).toBe(3);
  });

  it('points the up shape up and the down shape down', async () => {
    const clip = async (trend: 'up' | 'down') =>
      getComputedStyle(
        part(await mount({ value: '1', trend }), 'trend').querySelector('.glyph') as Element,
      ).clipPath.replaceAll(' ', '');
    // The apex is one point, at the top for up and at the bottom for down.
    expect(await clip('up')).toMatch(/^polygon\(50%0(px|%),/);
    expect(await clip('down')).toMatch(/50%100%\)$/);
  });

  it('draws nothing for neither a trend nor a change, and a shape alone for a trend alone', async () => {
    expect(part(await mount({ value: '1' }), 'trend')).toBeNull();
    const alone = await mount({ value: '1', trend: 'up' });
    expect(part(alone, 'trend')).toBeTruthy();
    expect(part(alone, 'delta')).toBeNull();
  });

  it('shows a signed change, and a percent for a ratio with delta-percent', async () => {
    expect(shownText(await mount({ value: '1', delta: '12' }), 'delta')).toBe('+12');
    expect(shownText(await mount({ value: '1', delta: '-3' }), 'delta')).toBe(
      number('en', -3, { signDisplay: 'exceptZero' }),
    );
    expect(
      shownText(await mount({ value: '1', delta: '0.125', 'delta-percent': '' }), 'delta'),
    ).toBe(
      number('en', 0.125, {
        style: 'percent',
        signDisplay: 'exceptZero',
        maximumFractionDigits: 1,
      }),
    );
  });

  it('takes the trend from the sign of the change, and calls a change that shows as zero flat', async () => {
    const word = (element: PunkProductionStat) =>
      part(element, 'trend').querySelector('.visually-hidden')?.textContent;
    expect(word(await mount({ value: '1', delta: '5' }))).toBe('up');
    expect(word(await mount({ value: '1', delta: '-5' }))).toBe('down');
    expect(word(await mount({ value: '1', delta: '0.0004' }))).toBe('unchanged');
    expect(word(await mount({ value: '1', delta: '5', trend: 'down' }))).toBe('down');
  });

  it('ignores a trend that is not one of the three words, with a warning', async () => {
    const element = await mount({ value: '1', trend: 'sideways' });
    expect(part(element, 'trend')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('says each trend in the colors of the text, on the plate', async () => {
    const element = await mount({ value: '1', trend: 'up' });
    expect(getComputedStyle(part(element, 'trend')).color).toBe(
      rgb(themes.dark.tokens['color-text'] as string),
    );
  });
});

describe('layout and size', () => {
  it('sets the value in tabular figures, aligned to the end', async () => {
    const style = getComputedStyle(part(await mount({ value: '5' }), 'value'));
    expect(style.fontVariantNumeric).toContain('tabular-nums');
    expect(style.textAlign).toBe('end');
  });

  it('keeps the width of the value whatever the digits, so a changing value moves nothing', async () => {
    // The font that the tokens ask for, as loaded, so the widths are the ones a page has.
    await document.fonts.load('700 16px "IBM Plex Mono"', '0123456789,');
    const width = async (value: string) =>
      part(await mount({ value }), 'value').getBoundingClientRect().width;
    const narrow = await width('1111');
    expect(await width('8888')).toBeCloseTo(narrow, 1);
    // "1,111" is five characters, and the least width is four.
    expect(await width('1')).toBeCloseTo((narrow / 5) * 4, 0);
  });

  it('reserves --punk-stat-value-min, so the ends of the values in a column line up', async () => {
    const column = container({}, 300);
    const [short, long] = [
      await mount({ value: '5' }, { parent: column }),
      await mount({ value: '1234' }, { parent: column }),
    ];
    const end = (element: Element) => part(element, 'value').getBoundingClientRect().right;
    expect(end(short)).toBeCloseTo(end(long), 1);
    short.style.setProperty('--punk-stat-value-min', '12ch');
    expect(part(short, 'value').getBoundingClientRect().width).toBeGreaterThan(
      part(long, 'value').getBoundingClientRect().width,
    );
  });

  it.each(['stacked', 'inline'])(
    'does not clip a 15-character value with its unit and trend at 187px, %s',
    async (layout) => {
      const element = await mount(
        {
          value: '100000000000',
          unit: 'items/min',
          trend: 'up',
          delta: '0.12',
          'delta-percent': '',
          layout,
        },
        { parent: container({}, 187) },
      );
      expect(shownText(element, 'value')).toBe('100,000,000,000');
      const plate = part(element, 'stat');
      expect(plate.scrollWidth).toBeLessThanOrEqual(plate.clientWidth);
      expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(187);
    },
  );

  it('puts the label and the figures on one row when inline has room, and wraps when it has not', async () => {
    const row = async (width: number) => {
      const element = await mount(
        { value: '1240', unit: '/min', layout: 'inline' },
        { parent: container({}, width) },
      );
      return [part(element, 'label'), part(element, 'value')].map((node) =>
        node.getBoundingClientRect(),
      );
    };
    const [wideLabel, wideValue] = await row(400);
    expect(Math.abs(wideLabel!.top - wideValue!.top)).toBeLessThan(20);
    const [narrowLabel, narrowValue] = await row(120);
    expect(narrowValue!.top).toBeGreaterThanOrEqual(narrowLabel!.bottom - 1);
  });

  it('puts the label above the value when stacked', async () => {
    const element = await mount({ value: '5' }, { parent: container({}, 400) });
    expect(part(element, 'value').getBoundingClientRect().top).toBeGreaterThanOrEqual(
      part(element, 'label').getBoundingClientRect().bottom - 1,
    );
  });

  it('treats a layout it does not know as stacked', async () => {
    const odd = await mount({ value: '5', layout: 'sideways' });
    expect(part(odd, 'stat').classList.contains('inline')).toBe(false);
  });
});

describe('announce', () => {
  it('is a polite live region with announce, and has no role without it', async () => {
    const element = await mount({ value: '5', announce: '' });
    expect(element.getAttribute('role')).toBe('status');
    element.announce = false;
    await element.updateComplete;
    expect(element.hasAttribute('role')).toBe(false);
  });

  it('gives back the role the author had', async () => {
    const element = await mount({ value: '5', role: 'group' });
    element.announce = true;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('status');
    element.announce = false;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('group');
  });

  it('leaves a role the author sets after announce is off, through later updates', async () => {
    const element = await mount({ value: '5', role: 'group', announce: '' });
    element.announce = false;
    await element.updateComplete;
    element.setAttribute('role', 'region');
    element.value = 6;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('region');
  });
});

describe('the sparkline', () => {
  const graphic = (attributes = '') => `<svg slot="sparkline" ${attributes}></svg>`;

  it('shows a wrapper only while something is slotted, and reserves the size for it', async () => {
    const none = await mount({ value: '5' });
    expect(part(none, 'sparkline').hidden).toBe(true);
    const element = await mount({ value: '5' }, { content: graphic('aria-hidden="true"') });
    expect(part(element, 'sparkline').hidden).toBe(false);
    expect(part(element, 'sparkline').getBoundingClientRect().width).toBeCloseTo(72, 0);
    element.style.setProperty('--punk-stat-sparkline-size', '100px');
    expect(part(element, 'sparkline').getBoundingClientRect().width).toBeCloseTo(100, 0);
  });

  it('is after the value when inline and below it when stacked', async () => {
    const content = graphic('aria-hidden="true"');
    const stacked = await mount({ value: '5' }, { content, parent: container({}, 400) });
    expect(part(stacked, 'sparkline').getBoundingClientRect().top).toBeGreaterThanOrEqual(
      part(stacked, 'value').getBoundingClientRect().bottom - 1,
    );
    const inline = await mount(
      { value: '5', layout: 'inline' },
      { content, parent: container({}, 400) },
    );
    expect(part(inline, 'sparkline').getBoundingClientRect().left).toBeGreaterThanOrEqual(
      part(inline, 'value').getBoundingClientRect().right - 1,
    );
  });

  it('warns once for a graphic with no alternative and not hidden, and not for one with', async () => {
    await mount({ value: '5' }, { content: graphic() });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/sparkline/);
    warn.mockClear();
    await mount({ value: '5' }, { content: graphic('aria-hidden="true"') });
    await mount({ value: '5' }, { content: graphic('aria-label="Last hour"') });
    await mount(
      { value: '5' },
      { content: '<svg slot="sparkline"><title>Last hour</title></svg>' },
    );
    await mount({ value: '5' }, { content: '<img slot="sparkline" alt="" src="">' });
    await mount({ value: '5' }, { content: '<span slot="sparkline">+3</span>' });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('colors and contrast', () => {
  it('draws the label in text-muted, the value and the change in text, on panel-inset, in every theme', async () => {
    for (const theme of themeNames) {
      const tokens = themes[theme].tokens;
      const wrapper = container({ 'data-punk-theme': theme });
      const element = await mount({ value: '5', unit: 'MW', delta: '2' }, { parent: wrapper });
      const plate = toHex(getComputedStyle(part(element, 'stat')).backgroundColor);
      expect(plate, theme).toBe(tokens['color-panel-inset']);
      for (const [name, token] of [
        ['label', 'color-text-muted'],
        ['unit', 'color-text-muted'],
        ['value', 'color-text'],
        ['delta', 'color-text'],
        ['trend', 'color-text'],
      ] as const) {
        const color = toHex(getComputedStyle(part(element, name)).color);
        expect(color, `${theme} ${name}`).toBe(tokens[token]);
        const needed = theme === 'high-contrast' ? 7 : 4.5;
        expect(ratio(color, plate), `${theme} ${name}`).toBeGreaterThanOrEqual(needed);
      }
    }
  });

  it('keeps the plate and the three trends apart by shape under forced colors', async () => {
    await commands.setForcedColors('active');
    const shapes = new Set<string>();
    for (const trend of ['up', 'down', 'flat']) {
      const element = await mount({ value: '1', trend });
      const glyph = getComputedStyle(part(element, 'trend').querySelector('.glyph') as Element);
      expect(glyph.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      shapes.add(glyph.clipPath);
    }
    expect(shapes.size).toBe(3);
    const plate = getComputedStyle(part(await mount({ value: '1' }), 'stat'));
    expect(plate.borderTopWidth).toBe('2px');
    expect(plate.boxShadow).toBe('none');
  });
});

describe('properties', () => {
  it('read their attributes, and reflect back, before and after connection', async () => {
    const before = document.createElement('punk-production-stat');
    before.value = 4.5;
    before.decimals = 1;
    before.delta = -2;
    before.trend = 'down';
    before.unit = 'MW';
    before.compact = true;
    before.deltaPercent = true;
    before.layout = 'inline';
    track(before);
    await before.updateComplete;
    expect(before.getAttribute('value')).toBe('4.5');
    expect(before.getAttribute('decimals')).toBe('1');
    expect(before.getAttribute('delta')).toBe('-2');
    expect(before.getAttribute('trend')).toBe('down');
    expect(before.getAttribute('unit')).toBe('MW');
    expect(before.hasAttribute('compact')).toBe(true);
    expect(before.hasAttribute('delta-percent')).toBe(true);
    expect(before.getAttribute('layout')).toBe('inline');

    const element = await mount({ value: '7', decimals: '2', delta: '1', trend: 'up' });
    expect([element.value, element.decimals, element.delta, element.trend]).toEqual([
      7,
      2,
      1,
      'up',
    ]);
    for (const name of ['value', 'decimals', 'delta', 'trend']) element.removeAttribute(name);
    await element.updateComplete;
    expect([element.value, element.decimals, element.delta]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    element.value = undefined;
    await element.updateComplete;
    expect(element.hasAttribute('value')).toBe(false);
  });

  it('draws again for each change, and shows it at once', async () => {
    const element = await mount({ value: '1' });
    element.value = 999;
    await element.updateComplete;
    expect(shownText(element, 'value')).toBe('999');
    element.label = 'Copper';
    await element.updateComplete;
    expect(shownText(element, 'label')).toBe('Copper');
  });
});

describe('quiet', () => {
  it('has no animation or transition, so there is nothing for reduced motion to remove', async () => {
    const element = await mount({ value: '5', trend: 'up', delta: '1' });
    for (const node of element.shadowRoot?.querySelectorAll('*') ?? []) {
      expect(getComputedStyle(node).transitionDuration, node.className).toBe('0s');
      expect(getComputedStyle(node).animationName).toBe('none');
    }
    element.value = 6;
    await element.updateComplete;
    expect(element.shadowRoot?.getAnimations?.() ?? []).toEqual([]);
  });

  it('adds no listener to itself, and creates no observer', async () => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const observers: string[] = [];
    for (const name of ['ResizeObserver', 'IntersectionObserver', 'MutationObserver'] as const) {
      const Original = globalThis[name] as new (...args: never[]) => object;
      vi.stubGlobal(
        name,
        class extends Original {
          constructor(...args: never[]) {
            super(...args);
            observers.push(name);
          }
        },
      );
    }
    const element = await mount(
      { value: '5', trend: 'up' },
      { content: '<svg slot="sparkline" aria-hidden="true"></svg>' },
    );
    expect(add.mock.contexts.filter((context) => context === element)).toEqual([]);
    expect(add.mock.contexts.filter((context) => context === document)).toEqual([]);
    expect(observers).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('warns once for a stat with no label, and not again', async () => {
    const element = await mount({ label: '', value: '5' });
    element.label = '';
    element.requestUpdate();
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/`label`/);
  });
});
