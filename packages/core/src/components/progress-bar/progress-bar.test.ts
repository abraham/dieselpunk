import { commands, page, server } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { baseTokens } from '../../tokens/base.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import { addStylesheets, cleanup, rgb, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { ProgressVariant, PunkProgressBar } from './index.ts';

interface BarOptions {
  value?: number | string;
  max?: number | string;
  variant?: ProgressVariant | string;
  label?: string;
  labelHidden?: boolean;
  showValue?: boolean;
  ariaLabel?: string;
  parent?: Element;
}

const dark = themes.dark.tokens;
let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await commands.setForcedColors(null);
});

async function mount(options: BarOptions = {}): Promise<PunkProgressBar> {
  const element = document.createElement('punk-progress-bar');
  if (options.value !== undefined) element.setAttribute('value', String(options.value));
  if (options.max !== undefined) element.setAttribute('max', String(options.max));
  if (options.variant) element.setAttribute('variant', options.variant);
  if (options.label !== undefined) element.label = options.label;
  else if (options.ariaLabel === undefined) element.label = 'Crafting';
  if (options.labelHidden) element.labelHidden = true;
  if (options.showValue) element.showValue = true;
  if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function part(bar: PunkProgressBar, name: string): HTMLElement {
  const found = bar.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!found) throw new Error(`Missing part "${name}"`);
  return found;
}

const track$ = (bar: PunkProgressBar) => part(bar, 'track');
const aria = (bar: PunkProgressBar, name: string) => track$(bar).getAttribute(name);

function barWarnings(): unknown[][] {
  return warn.mock.calls.filter(([message]) => String(message).includes('<punk-progress-bar>'));
}

function container(styles: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  const element = track(document.createElement('div'));
  Object.assign(element.style, styles);
  return element;
}

/** The fill's current rendered width, which reflects an in-flight transition. */
const fillWidth = (bar: PunkProgressBar): number => part(bar, 'fill').getBoundingClientRect().width;

describe('determinate semantics (12.6.1)', () => {
  it('exposes a progressbar with the correct values', async () => {
    const bar = await mount({ value: 64, max: 100 });
    expect(track$(bar).getAttribute('role')).toBe('progressbar');
    expect(aria(bar, 'aria-valuemin')).toBe('0');
    expect(aria(bar, 'aria-valuemax')).toBe('100');
    expect(aria(bar, 'aria-valuenow')).toBe('64');
    expect(aria(bar, 'aria-valuetext')).toBe('64%');
  });

  it('is found by role and name', async () => {
    await mount({ value: 10, label: 'Crafting precision gear' });
    expect(
      page.getByRole('progressbar', { name: 'Crafting precision gear', exact: true }).query(),
    ).not.toBeNull();
  });

  it('uses a max other than 100 for the percentage', async () => {
    const bar = await mount({ value: 50, max: 200 });
    expect(aria(bar, 'aria-valuemax')).toBe('200');
    expect(aria(bar, 'aria-valuenow')).toBe('50');
    expect(aria(bar, 'aria-valuetext')).toBe('25%');
  });

  it('rounds the percentage to a whole number', async () => {
    expect(aria(await mount({ value: 1, max: 3 }), 'aria-valuetext')).toBe('33%');
    expect(aria(await mount({ value: 2, max: 3 }), 'aria-valuetext')).toBe('67%');
  });

  it('accepts zero and full', async () => {
    const zero = await mount({ value: 0 });
    expect(aria(zero, 'aria-valuenow')).toBe('0');
    expect(aria(zero, 'aria-valuetext')).toBe('0%');
    expect(fillWidth(zero)).toBe(0);

    const full = await mount({ value: 100, parent: container({ width: '200px' }) });
    expect(aria(full, 'aria-valuetext')).toBe('100%');
  });

  it('reflects value to an attribute and reads it back', async () => {
    const bar = await mount();
    bar.value = 42;
    await bar.updateComplete;
    expect(bar.getAttribute('value')).toBe('42');

    bar.setAttribute('value', '7');
    expect(bar.value).toBe(7);
    bar.value = undefined;
    await bar.updateComplete;
    expect(bar.hasAttribute('value')).toBe(false);
  });

  it('treats an empty value attribute as indeterminate, not zero', async () => {
    const bar = await mount({ value: '' });
    expect(bar.value).toBeUndefined();
    expect(track$(bar).hasAttribute('aria-valuenow')).toBe(false);
  });

  it('reflects max, variant, and label', async () => {
    const bar = await mount({ value: 1, variant: 'danger', label: 'Heat' });
    expect(bar.getAttribute('max')).toBe('100');
    expect(bar.getAttribute('variant')).toBe('danger');
    expect(bar.getAttribute('label')).toBe('Heat');
  });
});

describe('indeterminate (12.6.2)', () => {
  it('renders indeterminate without aria-valuenow or aria-valuetext', async () => {
    const bar = await mount();
    expect(bar.value).toBeUndefined();
    expect(track$(bar).getAttribute('role')).toBe('progressbar');
    expect(track$(bar).hasAttribute('aria-valuenow')).toBe(false);
    expect(track$(bar).hasAttribute('aria-valuetext')).toBe(false);
    expect(aria(bar, 'aria-valuemin')).toBe('0');
    expect(aria(bar, 'aria-valuemax')).toBe('100');
  });

  it('fills the whole track with a scrolling stripe', async () => {
    const bar = await mount({ parent: container({ width: '300px' }) });
    const fill = part(bar, 'fill');
    expect(fillWidth(bar)).toBe(track$(bar).getBoundingClientRect().width);
    expect(getComputedStyle(fill).animationName).toBe('punk-progress-slide');
    expect(getComputedStyle(fill).backgroundImage).toContain('linear-gradient');
  });

  it('shows no value text even with show-value', async () => {
    const bar = await mount({ showValue: true });
    expect(part(bar, 'value').hidden).toBe(true);
  });

  it('becomes determinate when a value is set, and back again', async () => {
    const bar = await mount();
    bar.value = 30;
    await bar.updateComplete;
    expect(aria(bar, 'aria-valuenow')).toBe('30');
    expect(getComputedStyle(part(bar, 'fill')).animationName).toBe('none');

    bar.value = undefined;
    await bar.updateComplete;
    expect(track$(bar).hasAttribute('aria-valuenow')).toBe(false);
  });
});

describe('clamping and dev warnings (12.6.3)', () => {
  it('clamps a value above max, and warns once', async () => {
    const bar = await mount({ value: 150 });
    expect(aria(bar, 'aria-valuenow')).toBe('100');
    expect(aria(bar, 'aria-valuetext')).toBe('100%');
    expect(barWarnings()).toHaveLength(1);
    expect(String(barWarnings()[0]?.[0])).toContain('outside');
  });

  it('clamps a negative value to zero, and warns', async () => {
    const bar = await mount({ value: -5 });
    expect(aria(bar, 'aria-valuenow')).toBe('0');
    expect(aria(bar, 'aria-valuetext')).toBe('0%');
    expect(barWarnings()).toHaveLength(1);
  });

  it('treats a non-numeric value as indeterminate, and warns', async () => {
    const bar = await mount({ value: 'abc' });
    expect(track$(bar).hasAttribute('aria-valuenow')).toBe(false);
    expect(barWarnings()).toHaveLength(1);
    expect(String(barWarnings()[0]?.[0])).toContain('finite');
  });

  it('treats Infinity and NaN as indeterminate', async () => {
    const bar = await mount();
    for (const bad of [Infinity, -Infinity, NaN]) {
      bar.value = bad;
      await bar.updateComplete;
      expect(track$(bar).hasAttribute('aria-valuenow'), String(bad)).toBe(false);
    }
  });

  it('treats a max that is not above zero as 100, and warns', async () => {
    for (const max of [0, -10]) {
      warn.mockClear();
      const bar = await mount({ value: 50, max });
      expect(aria(bar, 'aria-valuemax'), String(max)).toBe('100');
      expect(aria(bar, 'aria-valuetext'), String(max)).toBe('50%');
      expect(barWarnings(), String(max)).toHaveLength(1);
      expect(String(barWarnings()[0]?.[0])).toContain('max');
    }
  });

  it('treats a max that is not a number as 100', async () => {
    const bar = await mount({ value: 25, max: 'many' });
    expect(aria(bar, 'aria-valuemax')).toBe('100');
    expect(aria(bar, 'aria-valuetext')).toBe('25%');
    expect(barWarnings()).toHaveLength(1);
  });

  it('does not warn for values in range', async () => {
    await mount({ value: 0 });
    await mount({ value: 100 });
    await mount({ value: 50, max: 50 });
    expect(barWarnings()).toHaveLength(0);
  });

  it('warns once per occurrence, not on every update', async () => {
    const bar = await mount({ value: 150 });
    bar.value = 160;
    await bar.updateComplete;
    bar.showValue = true;
    await bar.updateComplete;
    expect(barWarnings()).toHaveLength(1);

    bar.value = 50;
    await bar.updateComplete;
    bar.value = 200;
    await bar.updateComplete;
    expect(barWarnings()).toHaveLength(2);
  });

  it('warns separately for different problems at once', async () => {
    await mount({ value: 150, max: 0 });
    const messages = barWarnings().map(([message]) => String(message));
    expect(messages.some((message) => message.includes('`max`'))).toBe(true);
    expect(messages.some((message) => message.includes('outside'))).toBe(true);
  });
});

describe('animation and immediate ARIA values (12.6.4)', () => {
  it('updates ARIA values at once while the fill is still animating', async () => {
    const bar = await mount({ value: 20, parent: container({ width: '400px' }) });
    await vi.waitFor(() => expect(Math.round(fillWidth(bar))).toBe(80));

    bar.value = 80;
    await bar.updateComplete;
    expect(aria(bar, 'aria-valuenow')).toBe('80');
    expect(aria(bar, 'aria-valuetext')).toBe('80%');
    // The fill has only just started to move toward 320px.
    expect(fillWidth(bar)).toBeLessThan(320);

    await vi.waitFor(() => expect(Math.round(fillWidth(bar))).toBe(320), { timeout: 2000 });
  });

  it('uses the duration token for the transition', async () => {
    const bar = await mount({ value: 10 });
    expect(getComputedStyle(part(bar, 'fill')).transitionDuration).toBe(
      `${parseFloat(baseTokens['duration-normal']) / 1000}s`,
    );
  });

  it('sizes the fill to the ratio of the track', async () => {
    const bar = await mount({ value: 25, parent: container({ width: '400px' }) });
    await vi.waitFor(() => expect(Math.round(fillWidth(bar))).toBe(100));
  });

  it('starts the fill at the inline start in both directions', async () => {
    const ltr = await mount({ value: 25, parent: container({ width: '400px' }) });
    await vi.waitFor(() => expect(Math.round(fillWidth(ltr))).toBe(100));
    expect(part(ltr, 'fill').getBoundingClientRect().left).toBe(
      track$(ltr).getBoundingClientRect().left,
    );

    const wrapper = container({ width: '400px' });
    wrapper.dir = 'rtl';
    const rtl = await mount({ value: 25, parent: wrapper });
    await vi.waitFor(() => expect(Math.round(fillWidth(rtl))).toBe(100));
    expect(part(rtl, 'fill').getBoundingClientRect().right).toBe(
      track$(rtl).getBoundingClientRect().right,
    );
  });
});

describe('variants without color (12.6.5)', () => {
  const all: ProgressVariant[] = ['default', 'success', 'warning', 'danger'];

  async function fillStyles(options: BarOptions = {}) {
    const result: Record<string, string> = {};
    for (const variant of all) {
      const bar = await mount({ value: 60, variant, ...options });
      result[variant] = getComputedStyle(part(bar, 'fill')).backgroundImage;
    }
    return result;
  }

  it('gives each variant a different fill pattern', async () => {
    const images = await fillStyles();
    expect(images['default']).toBe('none');
    expect(new Set(Object.values(images)).size).toBe(4);
    expect(images['success']).toContain('repeating-linear-gradient');
    expect(images['warning']).toContain('repeating-linear-gradient');
    expect(images['danger']?.match(/repeating-linear-gradient/g)).toHaveLength(2);
  });

  it('still differs when every status color is the same', async () => {
    const wrapper = container();
    for (const name of ['success', 'warning', 'danger', 'accent']) {
      wrapper.style.setProperty(`--punk-color-${name}`, '#336699');
    }
    const images = await fillStyles({ parent: wrapper });
    expect(new Set(Object.values(images)).size).toBe(4);
  });

  it('renders an unknown variant like the default', async () => {
    const bar = await mount({ value: 60, variant: 'banana' });
    expect(getComputedStyle(part(bar, 'fill')).backgroundImage).toBe('none');
    expect(getComputedStyle(part(bar, 'fill')).backgroundColor).toBe(rgb(dark['color-accent']));
  });

  it('uses the accent for default and the status color for each other variant', async () => {
    const colors = {
      default: dark['color-accent'],
      success: dark['color-success'],
      warning: dark['color-warning'],
      danger: dark['color-danger'],
    } as const;
    for (const variant of all) {
      const bar = await mount({ value: 60, variant });
      const style = getComputedStyle(part(bar, 'fill'));
      const source = variant === 'default' ? style.backgroundColor : style.backgroundImage;
      expect(source, variant).toContain(rgb(colors[variant]));
    }
  });
});

describe('value text and label (12.6.6)', () => {
  it('shows the percentage with show-value', async () => {
    const bar = await mount({ value: 64, showValue: true });
    expect(part(bar, 'value').hidden).toBe(false);
    expect(part(bar, 'value').textContent).toBe('64%');
  });

  it('hides the value text without show-value, but keeps it for assistive tools', async () => {
    const bar = await mount({ value: 64 });
    expect(part(bar, 'value').hidden).toBe(true);
    expect(aria(bar, 'aria-valuetext')).toBe('64%');
  });

  it('formats for the nearest lang ancestor', async () => {
    const german = container();
    german.lang = 'de';
    const bar = await mount({ value: 50, showValue: true, parent: german });
    const expected = new Intl.NumberFormat('de', { style: 'percent' }).format(0.5);
    expect(part(bar, 'value').textContent).toBe(expected);
    expect(aria(bar, 'aria-valuetext')).toBe(expected);

    const english = container();
    english.lang = 'en-US';
    const other = await mount({ value: 50, showValue: true, parent: english });
    expect(part(other, 'value').textContent).toBe('50%');
    expect(expected).not.toBe('50%');
  });

  it('prefers the nearest lang over a farther one', async () => {
    const outer = container();
    outer.lang = 'de';
    const inner = document.createElement('div');
    inner.lang = 'en-US';
    outer.append(inner);
    const bar = await mount({ value: 50, showValue: true, parent: inner });
    expect(part(bar, 'value').textContent).toBe('50%');
  });

  it('follows a lang that sits across a shadow boundary', async () => {
    const host = container();
    host.lang = 'de';
    const root = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    root.append(wrapper);
    const bar = await mount({ value: 50, showValue: true, parent: wrapper });
    expect(part(bar, 'value').textContent).toBe(
      new Intl.NumberFormat('de', { style: 'percent' }).format(0.5),
    );
  });

  it('treats lang="" as unknown, so the browser default applies', async () => {
    const outer = container();
    outer.lang = 'de';
    const inner = document.createElement('div');
    inner.setAttribute('lang', '');
    outer.append(inner);
    const bar = await mount({ value: 50, showValue: true, parent: inner });
    expect(part(bar, 'value').textContent).toBe(
      new Intl.NumberFormat(undefined, { style: 'percent' }).format(0.5),
    );
  });

  it('falls back when the language tag is not valid', async () => {
    const wrapper = container();
    wrapper.setAttribute('lang', 'not a real tag!!');
    const bar = await mount({ value: 50, showValue: true, parent: wrapper });
    expect(part(bar, 'value').textContent).toMatch(/50/);
  });

  it('updates the text when lang changes at the next render', async () => {
    const wrapper = container();
    const bar = await mount({ value: 50, showValue: true, parent: wrapper });
    const before = part(bar, 'value').textContent;
    wrapper.lang = 'de';
    bar.requestUpdate();
    await bar.updateComplete;
    expect(part(bar, 'value').textContent).toBe(
      new Intl.NumberFormat('de', { style: 'percent' }).format(0.5),
    );
    expect(before).toBe('50%');
  });
});

describe('label and name', () => {
  it('shows the label above the bar, and names the track from it', async () => {
    const bar = await mount({ value: 10, label: 'Crafting' });
    expect(part(bar, 'label').textContent).toBe('Crafting');
    expect(part(bar, 'label').getBoundingClientRect().height).toBeGreaterThan(1);
    expect(aria(bar, 'aria-labelledby')).toBe('label');
    expect(bar.shadowRoot?.getElementById('label')).toBe(part(bar, 'label'));
  });

  it('keeps a hidden label as the accessible name without showing it', async () => {
    const bar = await mount({ value: 10, label: 'Crafting', labelHidden: true });
    const box = part(bar, 'label').getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
    expect(page.getByRole('progressbar', { name: 'Crafting', exact: true }).query()).not.toBeNull();
  });

  it('takes no vertical space when nothing is shown above the track', async () => {
    const bar = await mount({ value: 10, label: 'Crafting', labelHidden: true });
    const trackBox = track$(bar).getBoundingClientRect();
    expect(bar.getBoundingClientRect().height).toBe(trackBox.height);
  });

  it('puts the label at the inline start and the value at the inline end', async () => {
    const bar = await mount({ value: 50, showValue: true, parent: container({ width: '400px' }) });
    const label = part(bar, 'label').getBoundingClientRect();
    const value = part(bar, 'value').getBoundingClientRect();
    const box = bar.getBoundingClientRect();
    expect(label.left).toBe(box.left);
    expect(Math.round(value.right)).toBe(Math.round(box.right));
  });

  it('is named by a host aria-label when there is no label', async () => {
    const bar = await mount({ value: 10, label: '', ariaLabel: 'Smelting' });
    expect(aria(bar, 'aria-label')).toBe('Smelting');
    expect(track$(bar).hasAttribute('aria-labelledby')).toBe(false);
    expect(page.getByRole('progressbar', { name: 'Smelting', exact: true }).query()).not.toBeNull();
    expect(barWarnings()).toHaveLength(0);
  });

  it('prefers the label over a host aria-label', async () => {
    const bar = await mount({ value: 10, label: 'Label', ariaLabel: 'Ignored' });
    expect(track$(bar).hasAttribute('aria-label')).toBe(false);
    expect(page.getByRole('progressbar', { name: 'Label', exact: true }).query()).not.toBeNull();
  });

  it('warns once when it has no name at all', async () => {
    const bar = await mount({ value: 10, label: '' });
    expect(barWarnings()).toHaveLength(1);
    expect(String(barWarnings()[0]?.[0])).toContain('accessible name');
    bar.requestUpdate();
    await bar.updateComplete;
    expect(barWarnings()).toHaveLength(1);
  });

  it('follows a label that changes', async () => {
    const bar = await mount({ value: 10, label: 'One' });
    bar.label = 'Two';
    await bar.updateComplete;
    expect(page.getByRole('progressbar', { name: 'Two', exact: true }).query()).not.toBeNull();
  });
});

describe('appearance, unstyled (12.1.3)', () => {
  it('renders the default dark, compact appearance with no stylesheet', async () => {
    const bar = await mount({ value: 50 });
    const track = getComputedStyle(track$(bar));
    expect(track.backgroundColor).toBe(rgb(dark['color-panel-inset']));
    expect(getComputedStyle(part(bar, 'fill')).backgroundColor).toBe(rgb(dark['color-accent']));
    expect(getComputedStyle(bar).display).toBe('block');
    const expected = parseFloat(baseTokens['control-height-sm']) * 0.6;
    expect(track$(bar).getBoundingClientRect().height).toBeCloseTo(expected, 1);
  });

  it('honors --punk-progress-height', async () => {
    const bar = await mount({ value: 50 });
    bar.style.setProperty('--punk-progress-height', '30px');
    expect(track$(bar).getBoundingClientRect().height).toBe(30);
  });

  it('grows with the density', async () => {
    addStylesheets();
    const compact = await mount({ value: 50, parent: container() });
    const low = container();
    low.setAttribute('data-punk-density', 'low');
    const roomy = await mount({ value: 50, parent: low });
    expect(track$(roomy).getBoundingClientRect().height).toBeGreaterThan(
      track$(compact).getBoundingClientRect().height,
    );
  });

  it('follows each theme', async () => {
    addStylesheets();
    for (const name of themeNames) {
      const wrapper = container();
      wrapper.setAttribute('data-punk-theme', name);
      const bar = await mount({ value: 50, parent: wrapper });
      const tokens = themes[name].tokens;
      expect(getComputedStyle(track$(bar)).backgroundColor, name).toBe(
        rgb(tokens['color-panel-inset']),
      );
      expect(getComputedStyle(part(bar, 'fill')).backgroundColor, name).toBe(
        rgb(tokens['color-accent']),
      );
    }
  });

  it('fills the width of its container and imposes no fixed width', async () => {
    const wrapper = container({ width: '320px' });
    const bar = await mount({ value: 50, parent: wrapper });
    expect(bar.getBoundingClientRect().width).toBe(320);
    expect(bar.style.width).toBe('');
  });

  it('keeps the bevel above a full bar', async () => {
    const bar = await mount({ value: 100 });
    const bevel = getComputedStyle(track$(bar), '::after');
    expect(bevel.content).toBe('""');
    expect(bevel.boxShadow).not.toBe('none');
    expect(bevel.pointerEvents).toBe('none');
  });
});

describe('forced colors', () => {
  it.skipIf(server.browser !== 'chromium')(
    'uses system colors and keeps the patterns',
    async () => {
      const bar = await mount({ value: 60, variant: 'danger' });
      await commands.setForcedColors('active');
      expect(getComputedStyle(track$(bar)).borderTopWidth).toBe('2px');
      const fill = getComputedStyle(part(bar, 'fill'));
      expect(fill.forcedColorAdjust).toBe('none');
      expect(fill.backgroundImage).toContain('repeating-linear-gradient');
    },
  );
});
