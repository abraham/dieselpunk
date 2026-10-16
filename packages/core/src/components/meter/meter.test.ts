import { setLocale } from '../../../test/browser/locale.ts';
import { commands, page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkMeter } from './index.ts';

let warn: MockInstance<typeof console.warn>;

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(
  attributes: Record<string, string> = {},
  parent?: Element,
): Promise<PunkMeter> {
  const element = document.createElement('punk-meter');
  for (const [name, value] of Object.entries({ label: 'Reactor heat', ...attributes })) {
    element.setAttribute(name, value);
  }
  track(element, parent);
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
const text = (element: Element, name: string) => part(element, name).textContent?.trim();
const rect = (element: Element) => element.getBoundingClientRect();
const zones = { low: '30', high: '70', optimum: '50' };

describe('semantics', () => {
  it('is a meter with its range, value, and a value text, named by its label', async () => {
    const element = await mount({ value: '64', min: '0', max: '100' });
    const track = part(element, 'track');
    expect(track.getAttribute('role')).toBe('meter');
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('100');
    expect(track.getAttribute('aria-valuenow')).toBe('64');
    expect(track.getAttribute('aria-valuetext')).toBe('64%');
    expect(page.getByRole('meter', { name: 'Reactor heat', exact: true }).element()).toBe(track);
  });

  it('keeps the range and the clamped value in the units it was given', async () => {
    const element = await mount({ value: '15', min: '10', max: '20' });
    const track = part(element, 'track');
    expect(track.getAttribute('aria-valuemin')).toBe('10');
    expect(track.getAttribute('aria-valuemax')).toBe('20');
    expect(track.getAttribute('aria-valuenow')).toBe('15');
    expect(track.getAttribute('aria-valuetext')).toBe('50%');
  });

  it('is named by aria-label when it has no label, and the label wins when it has both', async () => {
    const unlabeled = await mount({ label: '', 'aria-label': 'Power' });
    expect(page.getByRole('meter', { name: 'Power', exact: true }).element()).toBe(
      part(unlabeled, 'track'),
    );
    const both = await mount({ label: 'Heat', 'aria-label': 'Power' });
    expect(page.getByRole('meter', { name: 'Heat', exact: true }).element()).toBe(
      part(both, 'track'),
    );
  });

  it('adds the state in words to the value text, and nothing for the best state', async () => {
    const good = await mount({ ...zones, value: '50' });
    const poor = await mount({ ...zones, value: '15' });
    const bad = await mount({ ...zones, optimum: '10', value: '90' });
    expect(part(good, 'track').getAttribute('aria-valuetext')).toBe('50%');
    expect(part(poor, 'track').getAttribute('aria-valuetext')).toBe('15%, warning');
    expect(part(bad, 'track').getAttribute('aria-valuetext')).toBe('90%, critical');
  });

  it('formats the percentage for the language of the page, and can be translated', async () => {
    const wrapper = container({ lang: 'de' });
    const german = await mount({ value: '64' }, wrapper);
    expect(part(german, 'track').getAttribute('aria-valuetext')).toBe(
      new Intl.NumberFormat('de', { style: 'percent' }).format(0.64),
    );
    await setLocale('de');
    try {
      const poor = await mount({ ...zones, value: '15' });
      expect(part(poor, 'track').getAttribute('aria-valuetext')).toBe('15%, Warnung');
    } finally {
      await setLocale('en');
    }
  });

  it('follows changes to its properties', async () => {
    const element = await mount({ value: '10' });
    element.value = 80;
    await element.updateComplete;
    expect(part(element, 'track').getAttribute('aria-valuenow')).toBe('80');
    element.label = 'Coolant';
    await element.updateComplete;
    expect(page.getByRole('meter', { name: 'Coolant', exact: true }).element()).toBe(
      part(element, 'track'),
    );
  });

  it('reads removed number attributes as their defaults, without a warning', async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount({ value: '40', min: '10', max: '50', segments: '4' });
    for (const name of ['value', 'min', 'max', 'segments']) element.removeAttribute(name);
    await element.updateComplete;
    const track = part(element, 'track');
    expect(track.getAttribute('aria-valuenow')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('100');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('header', () => {
  it('shows the label, and the value text only with show-value', async () => {
    const element = await mount({ value: '64' });
    expect(text(element, 'label')).toBe('Reactor heat');
    expect(part(element, 'value').hasAttribute('hidden')).toBe(true);
    element.showValue = true;
    await element.updateComplete;
    expect(text(element, 'value')).toBe('64%');
    expect(part(element, 'value').hasAttribute('hidden')).toBe(false);
  });

  it('shows the state in the value text too', async () => {
    const element = await mount({ ...zones, value: '15', 'show-value': '' });
    expect(text(element, 'value')).toBe('15%, warning');
  });

  it('keeps a hidden label as the name without showing it', async () => {
    const element = await mount({ 'label-hidden': '' });
    expect(rect(part(element, 'label')).width).toBeLessThanOrEqual(1);
    expect(page.getByRole('meter', { name: 'Reactor heat', exact: true }).element()).toBe(
      part(element, 'track'),
    );
    expect(rect(part(element, 'header')).height).toBeLessThanOrEqual(1);
  });

  it('leaves no empty row above the track when there is nothing to show', async () => {
    const element = await mount({ label: '', 'aria-label': 'Power' });
    expect(rect(part(element, 'track')).top).toBeCloseTo(rect(element).top, 0);
  });
});

describe('fill', () => {
  const fillOf = (element: PunkMeter) => part(element, 'fill');

  it('lights a whole number of segments, at least one above the minimum, and all only at the maximum', async () => {
    const cases: Array<[string, number]> = [
      ['0', 0],
      ['1', 1],
      ['26', 3],
      ['50', 5],
      ['64', 6],
      ['99', 9],
      ['100', 10],
    ];
    const wrapper = container({}, 400);
    for (const [value, lit] of cases) {
      const element = await mount({ value }, wrapper);
      const full = rect(part(element, 'track')).width;
      expect(rect(fillOf(element)).width, `value ${value}`).toBeCloseTo((full * lit) / 10, 0);
    }
  });

  it('follows the segment count', async () => {
    const wrapper = container({}, 400);
    const element = await mount({ value: '50', segments: '4' }, wrapper);
    expect(rect(fillOf(element)).width).toBeCloseTo(rect(part(element, 'track')).width / 2, 0);
    element.segments = 5;
    await element.updateComplete;
    await Promise.all(
      fillOf(element)
        .getAnimations()
        .map((animation) => animation.finished),
    );
    expect(rect(fillOf(element)).width).toBeCloseTo(
      (rect(part(element, 'track')).width * 3) / 5,
      0,
    );
  });

  it('costs the same number of nodes whatever the segment count', async () => {
    const counts = new Set<number>();
    for (const segments of ['2', '10', '100']) {
      const element = await mount({ segments, value: '50' });
      counts.add(element.shadowRoot?.querySelectorAll('*').length ?? 0);
    }
    expect(counts.size).toBe(1);
  });

  it('cuts the track into segments with trough-colored lines', async () => {
    const element = await mount({ value: '50' });
    const segments = element.shadowRoot?.querySelector('.segments') as HTMLElement;
    expect(getComputedStyle(segments).backgroundImage).toContain('repeating-linear-gradient');
  });

  it('grows from the inline start, so it fills from the right in a right-to-left page', async () => {
    const wrapper = container({ dir: 'rtl' }, 300);
    const element = await mount({ value: '50' }, wrapper);
    expect(rect(fillOf(element)).right).toBeCloseTo(rect(part(element, 'track')).right, 0);
    const ltr = await mount({ value: '50' }, container({}, 300));
    expect(rect(fillOf(ltr)).left).toBeCloseTo(rect(part(ltr, 'track')).left, 0);
    const segments = (meter: PunkMeter) =>
      getComputedStyle(meter.shadowRoot?.querySelector('.segments') as Element).backgroundImage;
    expect(segments(element)).not.toBe(segments(ltr));
  });

  it('animates the length, and updates the values at once', async () => {
    const element = await mount({ value: '10' });
    expect(getComputedStyle(fillOf(element)).transitionDuration).not.toBe('0s');
    expect(getComputedStyle(fillOf(element)).transitionProperty).toBe('inline-size');
    element.value = 90;
    await element.updateComplete;
    expect(part(element, 'track').getAttribute('aria-valuenow')).toBe('90');
  });
});

describe('state patterns', () => {
  const pattern = (element: PunkMeter) =>
    getComputedStyle(part(element, 'fill')).backgroundImage.replace(
      /(?:rgba?|color)\([^)]*\)/g,
      'C',
    );

  async function states() {
    return {
      none: await mount({ value: '50' }),
      optimal: await mount({ ...zones, value: '50' }),
      suboptimal: await mount({ ...zones, value: '15' }),
      critical: await mount({ ...zones, optimum: '10', value: '90' }),
    };
  }

  it('tells good, poor, and bad apart by pattern once every color is gone', async () => {
    const { optimal, suboptimal, critical } = await states();
    expect(new Set([pattern(optimal), pattern(suboptimal), pattern(critical)]).size).toBe(3);
    expect(pattern(optimal)).toBe('none');
  });

  it('keeps them apart under forced colors', async () => {
    await commands.setForcedColors('active');
    const { optimal, suboptimal, critical } = await states();
    expect(new Set([pattern(optimal), pattern(suboptimal), pattern(critical)]).size).toBe(3);
  });

  it('uses the accent when there is no state, and a different color for each state', async () => {
    const { none, optimal, suboptimal, critical } = await states();
    const colors = [none, optimal, suboptimal, critical].map((meter) =>
      getComputedStyle(part(meter, 'fill')).getPropertyValue('--_c').trim(),
    );
    expect(new Set(colors).size).toBe(4);
  });

  it('meets 3:1 against the trough in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      const wrapper = container({ 'data-punk-theme': theme });
      const wrapped = {
        none: await mount({ value: '50' }, wrapper),
        optimal: await mount({ ...zones, value: '50' }, wrapper),
        suboptimal: await mount({ ...zones, value: '15' }, wrapper),
        critical: await mount({ ...zones, optimum: '10', value: '90' }, wrapper),
      };
      for (const [state, meter] of Object.entries(wrapped)) {
        const fill = getComputedStyle(part(meter, 'fill')).getPropertyValue('--_c').trim();
        const trough = toHex(getComputedStyle(part(meter, 'track')).backgroundColor);
        const actual = ratio(fill, trough);
        if (actual < 3) problems.push(`${theme} ${state}: ${actual.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('orientation', () => {
  it('lays a vertical meter out at its own length and thickness, filling from the bottom', async () => {
    const element = await mount({ orientation: 'vertical', value: '50' });
    const track = rect(part(element, 'track'));
    expect(track.height).toBeCloseTo(44 * 3, 0);
    expect(track.width).toBeCloseTo(28 * 0.6, 0);
    const fill = rect(part(element, 'fill'));
    expect(fill.bottom).toBeCloseTo(track.bottom, 0);
    expect(fill.height).toBeCloseTo(track.height / 2, 0);
  });

  it('uses --punk-meter-length and --punk-meter-thickness', async () => {
    const wrapper = container();
    wrapper.style.setProperty('--punk-meter-length', '200px');
    wrapper.style.setProperty('--punk-meter-thickness', '24px');
    const vertical = await mount({ orientation: 'vertical' }, wrapper);
    expect(rect(part(vertical, 'track')).height).toBeCloseTo(200, 0);
    expect(rect(part(vertical, 'track')).width).toBeCloseTo(24, 0);
    const horizontal = await mount({}, wrapper);
    expect(rect(part(horizontal, 'track')).height).toBeCloseTo(24, 0);
  });

  it('treats an unknown orientation as horizontal', async () => {
    const element = await mount({ orientation: 'diagonal', value: '50' }, container({}, 300));
    const track = rect(part(element, 'track'));
    expect(track.width).toBeGreaterThan(track.height);
    expect(track.height).toBeCloseTo(28 * 0.6, 0);
    expect(rect(part(element, 'fill')).left).toBeCloseTo(track.left, 0);
  });

  it('puts vertical meters side by side', async () => {
    const wrapper = container({}, 300);
    const first = await mount({ orientation: 'vertical' }, wrapper);
    const second = await mount({ orientation: 'vertical' }, wrapper);
    expect(rect(first).top).toBeCloseTo(rect(second).top, 0);
  });
});

describe('layout', () => {
  it('never scrolls sideways, even with a long label and value text in a narrow container', async () => {
    const wrapper = container({ lang: 'de' }, 187);
    const element = await mount(
      {
        label: 'Reaktorwärme im Primärkreislauf des Nordwerks',
        ...zones,
        value: '15',
        'show-value': '',
      },
      wrapper,
    );
    expect(rect(element).width).toBeLessThanOrEqual(187.5);
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(188);
    // With no room beside the label, the value text drops below it instead of squeezing it.
    expect(rect(part(element, 'value')).top).toBeGreaterThanOrEqual(
      rect(part(element, 'label')).bottom - 1,
    );
  });
});

describe('warnings', () => {
  function spy(): void {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
  const messages = () => warn.mock.calls.map((call) => String(call[0]));

  it('clamps a value outside the range and warns once', async () => {
    spy();
    const element = await mount({ value: '140' });
    expect(part(element, 'track').getAttribute('aria-valuenow')).toBe('100');
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('<punk-meter>');
    expect(messages()[0]).toContain('clamped');
    element.requestUpdate();
    await element.updateComplete;
    expect(messages()).toHaveLength(1);
  });

  it('uses the minimum for a value that is not a number', async () => {
    spy();
    const element = await mount({ value: 'full', min: '10', max: '20' });
    expect(part(element, 'track').getAttribute('aria-valuenow')).toBe('10');
    expect(messages()).toHaveLength(1);
  });

  it('falls back to 0 to 100 for a range that is not one', async () => {
    spy();
    const element = await mount({ min: '50', max: '10', value: '40' });
    const track = part(element, 'track');
    expect([track.getAttribute('aria-valuemin'), track.getAttribute('aria-valuemax')]).toEqual([
      '0',
      '100',
    ]);
    expect(messages().some((message) => message.includes('not a range'))).toBe(true);
  });

  it('warns about boundaries that are out of range or the wrong way round, and a bad segment count', async () => {
    spy();
    await mount({ low: '-5' });
    await mount({ low: '60', high: '40' });
    await mount({ segments: '1' });
    expect(messages()).toHaveLength(3);
    expect(messages().some((message) => message.includes('`low`'))).toBe(true);
    expect(messages().some((message) => message.includes('raised'))).toBe(true);
    expect(messages().some((message) => message.includes('`segments`'))).toBe(true);
  });

  it('warns once without a name, and not with a label or an aria-label', async () => {
    spy();
    await mount({ label: '' });
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('accessible name');
    warn.mockClear();
    await mount();
    await mount({ label: '', 'aria-label': 'Heat' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn for good values at the edges of the range', async () => {
    spy();
    await mount({ value: '0' });
    await mount({ value: '100', ...zones });
    await mount({ low: '0', high: '100', optimum: '100', value: '50' });
    expect(warn).not.toHaveBeenCalled();
  });
});
