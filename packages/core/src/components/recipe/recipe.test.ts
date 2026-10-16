import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, focusWithKeyboard, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import '../slot-grid/register.ts';
import type { PunkActivateDetail } from '../../internal/selectable-base.ts';
import type { PunkRecipe } from './index.ts';

let warn: MockInstance<typeof console.warn>;

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const art =
  '<svg slot="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';
const needs = '<span slot="ingredients">2 iron plates</span>';
const makes = '<span slot="products">Precision gear</span>';

async function mount(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkRecipe> {
  const element = document.createElement('punk-recipe');
  element.innerHTML = options.content ?? '';
  for (const [name, value] of Object.entries({ name: 'Precision gear', ...attributes })) {
    element.setAttribute(name, value);
  }
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
  element.shadowRoot?.querySelector(`[part="${name}"]`);
const text = (element: Element, name: string) => part(element, name)?.textContent?.trim();
const seconds = (value: number, lang = 'en') =>
  new Intl.NumberFormat(lang, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(value);
const tile = (element: Element) => element.shadowRoot?.querySelector('.recipe') as HTMLElement;

describe('name and role', () => {
  it('is a button named by its text, in reading order, including the ingredients and products', async () => {
    const element = await mount(
      { duration: '0.5', available: '', 'craftable-count': '3' },
      { content: art + needs + makes },
    );
    const name = `Precision gear ${seconds(0.5)} can craft 3 2 iron plates Precision gear`;
    expect(page.getByRole('button', { name, exact: true }).element()).toBe(element);
  });

  it('is named by whatever text it has, with or without a name', async () => {
    const element = await mount({ name: '', available: '' }, { content: needs });
    expect(page.getByRole('button', { name: '2 iron plates', exact: true }).element()).toBe(
      element,
    );
  });

  it('is pressed only after it has been given a selected state', async () => {
    const element = await mount();
    expect(element.hasAttribute('aria-pressed')).toBe(false);
    element.selected = false;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('false');
    element.selected = true;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(element.getAttribute('role')).toBe('button');
  });

  it('is disabled for assistive technology, keeps its name, and cannot be focused', async () => {
    const element = await mount({ disabled: '', available: '' });
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(page.getByRole('button', { name: 'Precision gear', exact: true }).element()).toBe(
      element,
    );
    element.focus();
    expect(document.activeElement).not.toBe(element);
  });

  it('follows a name that changes', async () => {
    const element = await mount({ available: '' });
    element.name = 'Coil';
    await element.updateComplete;
    expect(page.getByRole('button', { name: 'Coil', exact: true }).element()).toBe(element);
  });
});

describe('availability', () => {
  it('says "unavailable" in a word when the recipe cannot be made', async () => {
    const element = await mount();
    expect(text(element, 'status')).toBe('unavailable');
    expect(
      page.getByRole('button', { name: 'Precision gear unavailable', exact: true }).element(),
    ).toBe(element);
  });

  it('says how many can be made, and nothing when it can be made but the count is zero', async () => {
    const three = await mount({ available: '', 'craftable-count': '3' });
    expect(text(three, 'status')).toBe('can craft 3');
    const none = await mount({ available: '' });
    expect(part(none, 'status')).toBeNull();
    expect(page.getByRole('button', { name: 'Precision gear', exact: true }).element()).toBe(none);
  });

  it('is unavailable whatever the count', async () => {
    const element = await mount({ 'craftable-count': '5' });
    expect(text(element, 'status')).toBe('unavailable');
  });

  it('formats the count for the page, and is not abbreviated', async () => {
    const wrapper = container({ lang: 'de' });
    const element = await mount({ available: '', 'craftable-count': '1200' }, { parent: wrapper });
    expect(text(element, 'status')).toBe(`can craft ${new Intl.NumberFormat('de').format(1200)}`);
  });

  it('draws unavailable with a dashed chip and available with a solid one', async () => {
    const solid = await mount({ available: '', 'craftable-count': '2' });
    const dashed = await mount();
    expect(getComputedStyle(part(solid, 'status') as Element).borderTopStyle).toBe('solid');
    expect(getComputedStyle(part(dashed, 'status') as Element).borderTopStyle).toBe('dashed');
  });

  it('can be translated', async () => {
    const { setStrings, resetStrings } = await import('../../utilities/localize.ts');
    setStrings({ unavailable: 'nicht verfügbar', craftable: '{count}× herstellbar' });
    try {
      expect(text(await mount(), 'status')).toBe('nicht verfügbar');
      expect(text(await mount({ available: '', 'craftable-count': '4' }), 'status')).toBe(
        '4× herstellbar',
      );
    } finally {
      resetStrings();
    }
  });

  it('rounds the count down, reads a removed attribute as zero, and warns once for a bad one', async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fraction = await mount({ available: '', 'craftable-count': '2.9' });
    expect(text(fraction, 'status')).toBe('can craft 2');
    const removed = await mount({ available: '', 'craftable-count': '4' });
    removed.removeAttribute('craftable-count');
    await removed.updateComplete;
    expect(part(removed, 'status')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    const bad = await mount({ available: '', 'craftable-count': '-2' });
    expect(part(bad, 'status')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[1]?.[0])).toContain('craftable-count');
  });
});

describe('duration', () => {
  it('is shown as a unit for the language of the page', async () => {
    expect(text(await mount({ duration: '0.5' }), 'duration')).toBe(seconds(0.5));
    const wrapper = container({ lang: 'de' });
    const german = await mount({ duration: '12' }, { parent: wrapper });
    expect(text(german, 'duration')).toBe(seconds(12, 'de'));
    expect(text(german, 'duration')).not.toBe(seconds(12, 'en'));
  });

  it('shows at most two decimals, and zero as a time', async () => {
    expect(text(await mount({ duration: '1.2345' }), 'duration')).toBe(seconds(1.23));
    expect(text(await mount({ duration: '0' }), 'duration')).toBe(seconds(0));
  });

  it('is left out when unset, including after the attribute is removed', async () => {
    const element = await mount({ duration: '2' });
    expect(part(element, 'duration')).not.toBeNull();
    element.removeAttribute('duration');
    await element.updateComplete;
    expect(part(element, 'duration')).toBeNull();
  });

  it('is clamped when negative and left out when it is not a number, each with one warning', async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const negative = await mount({ duration: '-3' });
    expect(text(negative, 'duration')).toBe(seconds(0));
    expect(warn).toHaveBeenCalledTimes(1);
    const junk = await mount({ duration: 'soon' });
    expect(part(junk, 'duration')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    negative.requestUpdate();
    await negative.updateComplete;
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('content', () => {
  it('shows the icon plate, ingredients, products, and arrow only when there is something in them', async () => {
    const bare = await mount();
    const hidden = (element: Element, selector: string) =>
      element.shadowRoot?.querySelector(selector)?.hasAttribute('hidden');
    expect(hidden(bare, '.icon')).toBe(true);
    expect(hidden(bare, '.flow')).toBe(true);

    const input = await mount({}, { content: needs });
    expect(hidden(input, '.flow')).toBe(false);
    expect(hidden(input, '.ingredients')).toBe(false);
    expect(hidden(input, '.products')).toBe(true);
    expect(hidden(input, '.arrow')).toBe(true);

    const full = await mount({}, { content: art + needs + makes });
    expect(hidden(full, '.icon')).toBe(false);
    expect(hidden(full, '.arrow')).toBe(false);
    expect(full.shadowRoot?.querySelector('.arrow')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('follows content added or removed later', async () => {
    const element = await mount({}, { content: needs });
    const products = document.createElement('span');
    products.slot = 'products';
    products.textContent = 'Gear';
    element.append(products);
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.arrow')?.hasAttribute('hidden')).toBe(false);
    products.remove();
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.arrow')?.hasAttribute('hidden')).toBe(true);
  });

  it('flips the arrow for a right-to-left page', async () => {
    const ltr = await mount({}, { content: needs + makes });
    const rtl = await mount({}, { content: needs + makes, parent: container({ dir: 'rtl' }) });
    const arrow = (element: Element) =>
      getComputedStyle(element.shadowRoot?.querySelector('.arrow') as Element).scale;
    expect(arrow(ltr)).toBe('none');
    expect(arrow(rtl)).toBe('-1 1');
  });
});

describe('layout', () => {
  it('wraps a long name and never scrolls sideways, down to a very narrow container', async () => {
    const long =
      'Präzisionszahnrad für schwere industrielle Getriebe der Baureihe zwei, mit Zwischenprodukten';
    for (const width of [187, 256, 512]) {
      const wrapper = container({ lang: 'de' }, width);
      const element = await mount(
        { name: long, duration: '12', available: '', 'craftable-count': '1200' },
        { content: art + needs + makes, parent: wrapper },
      );
      const box = element.getBoundingClientRect();
      expect(box.width, `${width}px`).toBeLessThanOrEqual(width + 0.5);
      expect(tile(element).scrollWidth, `${width}px`).toBeLessThanOrEqual(
        tile(element).clientWidth + 1,
      );
      expect(wrapper.scrollWidth, `${width}px`).toBeLessThanOrEqual(width + 1);
    }
  });

  it('breaks a name that is one very long word', async () => {
    const wrapper = container({}, 187);
    const element = await mount(
      { name: 'Zwischenproduktverarbeitungsanlagenbetriebsvorschrift' },
      { parent: wrapper },
    );
    expect(tile(element).scrollWidth).toBeLessThanOrEqual(tile(element).clientWidth + 1);
  });

  it('lets the text column shrink below its widest unbreakable content', async () => {
    const wrapper = container({}, 200);
    const unbreakable = `<span slot="ingredients" style="white-space: nowrap">${'iron plates '.repeat(8)}</span>`;
    const element = await mount({}, { content: art + unbreakable, parent: wrapper });
    const body = element.shadowRoot?.querySelector('.body') as HTMLElement;
    expect(body.getBoundingClientRect().width).toBeLessThanOrEqual(tile(element).clientWidth);
  });

  it('puts the text under the icon when it would be squeezed beside it, and beside it otherwise', async () => {
    const rows: Array<[number, boolean]> = [
      [187, true],
      [512, false],
    ];
    for (const [width, below] of rows) {
      const wrapper = container({}, width);
      const element = await mount(
        { name: 'Precision gear for heavy industrial drives', duration: '12', available: '' },
        { content: art + needs + makes, parent: wrapper },
      );
      const icon = (part(element, 'icon') as HTMLElement).getBoundingClientRect();
      const body = (
        element.shadowRoot?.querySelector('.body') as HTMLElement
      ).getBoundingClientRect();
      expect(body.top >= icon.bottom - 0.5, `${width}px`).toBe(below);
    }
  });

  it('grows with its content and keeps a minimum height', async () => {
    const short = await mount();
    const tall = await mount({}, { content: art + needs + makes, parent: container({}, 200) });
    expect(short.getBoundingClientRect().height).toBeGreaterThanOrEqual(40 + 16 - 0.5);
    expect(tall.getBoundingClientRect().height).toBeGreaterThan(
      short.getBoundingClientRect().height,
    );
  });

  it('sizes the icon plate from the slot size', async () => {
    const wrapper = container();
    wrapper.style.setProperty('--punk-slot-size', '56px');
    const element = await mount({}, { content: art, parent: wrapper });
    expect((part(element, 'icon') as HTMLElement).getBoundingClientRect().width).toBeCloseTo(56, 0);
  });
});

describe('activation', () => {
  it('activates once on a click, Enter, and Space, with its value', async () => {
    const element = await mount({ value: 'precision-gear' }, { content: art + needs + makes });
    const handler = vi.fn<(event: CustomEvent<PunkActivateDetail>) => void>();
    document.body.addEventListener('punk-activate', handler);
    await userEvent.click(element);
    element.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(handler).toHaveBeenCalledTimes(3);
    for (const [event] of handler.mock.calls) {
      expect(event.detail).toEqual({ value: 'precision-gear', item: element });
    }
    document.body.removeEventListener('punk-activate', handler);
  });

  it('activates from a click on its ingredients or its text, not only its edge', async () => {
    const element = await mount({}, { content: art + needs + makes });
    const handler = vi.fn();
    element.addEventListener('punk-activate', handler);
    await userEvent.click(element.querySelector('[slot="ingredients"]') as HTMLElement);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const element = await mount({ disabled: '' });
    const handler = vi.fn();
    element.addEventListener('punk-activate', handler);
    element.click();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('states', () => {
  const shadow = (element: Element) =>
    getComputedStyle(tile(element)).boxShadow.replace(/(?:rgba?|color)\([^)]*\)/g, 'C');

  it('draws selected, hovered, and disabled differently once every color is gone', async () => {
    const idle = await mount();
    const selected = await mount({ selected: '' });
    const disabled = await mount({ disabled: '' });
    const hovered = await mount();
    const found = [shadow(idle), shadow(selected), shadow(disabled)];
    await userEvent.hover(hovered);
    found.push(shadow(hovered));
    expect(new Set(found).size).toBe(4);
    await userEvent.unhover(hovered);
  });

  it('uses a thicker ring for selected', async () => {
    const idle = await mount();
    const selected = await mount({ selected: '' });
    expect(getComputedStyle(tile(idle)).boxShadow).toContain('0px 0px 0px 2px');
    expect(getComputedStyle(tile(selected)).boxShadow).toContain('0px 0px 0px 3px');
  });

  it('shows keyboard focus with the two-tone ring', async () => {
    const element = await mount({}, { content: needs });
    await focusWithKeyboard(element);
    expect(document.activeElement).toBe(element);
    expect(getComputedStyle(tile(element), '::after').boxShadow).not.toBe('none');
    expect(getComputedStyle(element).outlineStyle).toBe('none');
  });

  it('keeps selected and unavailable apart under forced colors', async () => {
    await commands.setForcedColors('active');
    const idle = await mount({ available: '', 'craftable-count': '2' });
    const selected = await mount({ selected: '', available: '', 'craftable-count': '2' });
    const unavailable = await mount();
    expect(getComputedStyle(tile(idle)).boxShadow).toBe('none');
    expect(getComputedStyle(tile(idle)).outlineStyle).toBe('none');
    expect(getComputedStyle(tile(selected)).outlineStyle).toBe('solid');
    expect(getComputedStyle(tile(selected)).outlineWidth).toBe('3px');
    expect(getComputedStyle(part(unavailable, 'status') as Element).borderTopStyle).toBe('dashed');
    expect(getComputedStyle(part(idle, 'status') as Element).borderTopStyle).toBe('solid');
  });
});

describe('in a slot grid', () => {
  it('is an option the grid selects, with the name unchanged', async () => {
    const grid = document.createElement('punk-slot-grid');
    grid.setAttribute('aria-label', 'Recipes');
    grid.setAttribute('selection', 'single');
    const recipes = ['Gear', 'Coil', 'Plate'].map((name, index) => {
      const recipe = document.createElement('punk-recipe');
      recipe.setAttribute('name', name);
      recipe.setAttribute('value', `r${index}`);
      recipe.setAttribute('available', '');
      return grid.appendChild(recipe);
    });
    track(grid);
    await grid.updateComplete;
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all(recipes.map((recipe) => recipe.updateComplete));

    expect(recipes[0]?.getAttribute('role')).toBe('option');
    expect(recipes[0]?.hasAttribute('aria-pressed')).toBe(false);
    expect(page.getByRole('option', { name: 'Coil', exact: true }).element()).toBe(recipes[1]);
    await userEvent.click(recipes[1] as HTMLElement);
    expect(grid.values).toEqual(['r1']);
    expect(recipes[1]?.selected).toBe(true);
    expect(page.getByRole('option', { selected: true }).element()).toBe(recipes[1]);
  });
});

describe('warnings', () => {
  it('warns once when nothing names it, and not when a name, aria-label, or content does', async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bare = await mount({ name: '' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-recipe>');
    expect(String(warn.mock.calls[0]?.[0])).toContain('accessible name');
    bare.requestUpdate();
    await bare.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockClear();
    await mount({ name: '', 'aria-label': 'Recipe' });
    await mount({ name: '', 'aria-labelledby': 'somewhere' });
    await mount({ name: '' }, { content: makes });
    await mount({ name: 'Gear' });
    expect(warn).not.toHaveBeenCalled();
  });
});
