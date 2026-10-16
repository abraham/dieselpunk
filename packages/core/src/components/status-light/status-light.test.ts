import { commands, page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkStatusLight, StatusVariant } from './index.ts';

let warn: MockInstance<typeof console.warn>;

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const variants: StatusVariant[] = ['neutral', 'info', 'success', 'warning', 'danger'];

async function mount(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkStatusLight> {
  const element = document.createElement('punk-status-light');
  element.innerHTML = options.content ?? 'Running';
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
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
const shape = (element: Element) => element.shadowRoot?.querySelector('.shape') as HTMLElement;
const clear = (value: string) => value.replace(/(?:rgba?|color)\([^)]*\)/g, 'C');
/** How many corners a polygon has, whatever way the engine writes its coordinates. */
const points = (clipPath: string) => clipPath.split(',').length;

/** What a shape looks like with every color replaced by `C`, so it shows what color-blind users get. */
function silhouette(element: Element): string {
  const style = getComputedStyle(shape(element));
  return JSON.stringify({
    clipPath: style.clipPath,
    radius: style.borderTopLeftRadius,
    border: [style.borderTopStyle, style.borderTopWidth],
    filled: clear(style.backgroundColor) !== 'C' || style.backgroundColor !== 'rgba(0, 0, 0, 0)',
    transparent: style.backgroundColor === 'rgba(0, 0, 0, 0)',
  });
}

describe('shapes', () => {
  it('gives every variant its own shape, which stays apart once every color is gone', async () => {
    const found = new Set<string>();
    for (const variant of variants) found.add(silhouette(await mount({ variant })));
    expect(found.size).toBe(variants.length);
  });

  it('keeps them apart under forced colors, and keeps them drawn', async () => {
    await commands.setForcedColors('active');
    const found = new Set<string>();
    for (const variant of variants) {
      const element = await mount({ variant });
      found.add(silhouette(element));
      const style = getComputedStyle(shape(element));
      if (variant === 'neutral') {
        expect(style.borderTopStyle).toBe('solid');
        expect(style.borderTopWidth).toBe('2px');
      } else {
        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    }
    expect(found.size).toBe(variants.length);
  });

  it('draws a ring, a diamond, a circle, a triangle, and a square', async () => {
    const style = async (variant: StatusVariant) =>
      getComputedStyle(shape(await mount({ variant })));
    const ring = await style('neutral');
    expect([ring.borderTopWidth, ring.borderTopLeftRadius]).toEqual(['2px', '50%']);
    expect(ring.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect((await style('info')).clipPath).toMatch(/^polygon\(/);
    expect(points((await style('info')).clipPath)).toBe(4);
    expect((await style('success')).borderTopLeftRadius).toBe('50%');
    expect(points((await style('warning')).clipPath)).toBe(3);
    const square = await style('danger');
    expect([square.clipPath, square.borderTopLeftRadius]).toEqual(['none', '0px']);
  });

  it('draws an unknown variant as neutral', async () => {
    expect(silhouette(await mount({ variant: 'broken' }))).toBe(
      silhouette(await mount({ variant: 'neutral' })),
    );
  });

  it('puts the shape in an inset lens, and the shape meets 3:1 against it in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      const wrapper = container({ 'data-punk-theme': theme });
      for (const variant of variants) {
        const element = await mount({ variant }, { parent: wrapper });
        const lens = getComputedStyle(part(element, 'indicator'));
        const actual = ratio(toHex(lens.color), toHex(lens.backgroundColor));
        if (actual < 3) problems.push(`${theme} ${variant}: ${actual.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('uses a different color for each variant', async () => {
    const colors = new Set<string>();
    for (const variant of variants) {
      colors.add(getComputedStyle(part(await mount({ variant }), 'indicator')).color);
    }
    expect(colors.size).toBe(variants.length);
  });

  it('lets an icon replace the built-in shape', async () => {
    const element = await mount(
      { variant: 'success' },
      { content: '<svg slot="icon" width="12" height="12" aria-hidden="true"></svg>Running' },
    );
    expect(shape(element).getBoundingClientRect().width).toBe(0);
    expect(part(element, 'indicator').querySelector('slot')?.assignedElements()).toHaveLength(1);
  });
});

describe('text and semantics', () => {
  it('has no role by default, and the text is its content', async () => {
    const element = await mount({ variant: 'danger' }, { content: 'Offline' });
    expect(element.hasAttribute('role')).toBe(false);
    expect(element.textContent).toBe('Offline');
    expect(page.getByText('Offline').element()).toBeTruthy();
  });

  it('hides the shape from assistive technology', async () => {
    const element = await mount({ variant: 'danger' });
    expect(part(element, 'indicator').getAttribute('aria-hidden')).toBe('true');
  });

  it('is a polite live region with announce, and stops being one without', async () => {
    const element = await mount({ announce: '' }, { content: 'Offline' });
    expect(element.getAttribute('role')).toBe('status');
    expect(page.getByRole('status').element()).toBe(element);
    element.announce = false;
    await element.updateComplete;
    expect(element.hasAttribute('role')).toBe(false);
  });

  it('leaves a role the author set alone', async () => {
    const element = await mount({ role: 'note' });
    element.announce = true;
    await element.updateComplete;
    element.announce = false;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('note');
  });

  it('shows its text beside the shape, and wraps a long text without scrolling sideways', async () => {
    const wrapper = container({ lang: 'de' }, 187);
    const element = await mount(
      { variant: 'warning' },
      {
        content: 'Der Brennstoff im Primärkreislauf des Nordwerks wird in Kürze knapp werden',
        parent: wrapper,
      },
    );
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(187.5);
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(188);
    const lens = part(element, 'indicator').getBoundingClientRect();
    expect(lens.width).toBeCloseTo(20, 0);
    expect(lens.height).toBeCloseTo(20, 0);
  });

  it('breaks a text that is one very long word', async () => {
    const wrapper = container({}, 187);
    const element = await mount(
      {},
      { content: 'Zwischenproduktverarbeitungsanlagenbetriebsvorschrift', parent: wrapper },
    );
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(187.5);
    const label = part(element, 'label');
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
  });
});

describe('warnings', () => {
  function spy(): void {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
  const messages = () => warn.mock.calls.map((call) => String(call[0]));

  it('warns once when there is no text, and not when there is', async () => {
    spy();
    const bare = await mount({}, { content: '' });
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('<punk-status-light>');
    expect(messages()[0]).toContain('no text');
    bare.requestUpdate();
    await bare.updateComplete;
    expect(messages()).toHaveLength(1);
    warn.mockClear();
    await mount({}, { content: 'Running' });
    await mount({}, { content: '<span>Running</span>' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('counts an icon alone as no text', async () => {
    spy();
    await mount({}, { content: '<svg slot="icon" width="12" height="12"></svg>' });
    expect(messages()).toHaveLength(1);
  });

  it('warns again if the text goes away after being there', async () => {
    spy();
    const element = await mount({}, { content: 'Running' });
    element.textContent = '';
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(messages()).toHaveLength(1);
  });
});
