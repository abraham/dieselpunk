import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkDescriptionList } from './index.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const pairs = '<dt>Speed</dt><dd>0.75</dd><dt>Output</dt><dd>1,240 /min</dd><dd>80 MW</dd>';

async function mount(content = pairs, width = 480, dir = 'ltr'): Promise<PunkDescriptionList> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = `${width}px`;
  wrapper.dir = dir;
  wrapper.innerHTML = `<punk-description-list>${content}</punk-description-list>`;
  const element = wrapper.firstElementChild as PunkDescriptionList;
  await element.updateComplete;
  return element;
}

const box = (element: PunkDescriptionList, selector: string) =>
  (element.querySelector(selector) as HTMLElement).getBoundingClientRect();

describe('semantics', () => {
  it('puts the application terms and values in a native dl', async () => {
    const element = await mount();
    const list = element.shadowRoot?.querySelector('[part="list"]');
    expect(list?.localName).toBe('dl');
    const slot = list?.querySelector('slot') as HTMLSlotElement;
    expect(slot.assignedElements().map((child) => child.localName)).toEqual([
      'dt',
      'dd',
      'dt',
      'dd',
      'dd',
    ]);
    expect(element.hasAttribute('role')).toBe(false);
    expect(
      page
        .getByRole('term')
        .elements()
        .map((term) => term.textContent),
    ).toEqual(['Speed', 'Output']);
    expect(page.getByRole('definition').elements()).toHaveLength(3);
  });
});

describe('layout', () => {
  it('sets each term beside its first value, and further values below it', async () => {
    const element = await mount();
    const term = box(element, 'dt:nth-of-type(2)');
    const [first, second] = [...element.querySelectorAll('dd')]
      .slice(1)
      .map((value) => value.getBoundingClientRect()) as [DOMRect, DOMRect];
    expect(first.top).toBeLessThan(term.bottom);
    expect(first.bottom).toBeGreaterThan(term.top);
    expect(first.left).toBeGreaterThan(term.right);
    expect(second.left).toBeCloseTo(first.left, 0);
    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
  });

  it('mirrors the columns in right-to-left text', async () => {
    const element = await mount(pairs, 480, 'rtl');
    expect(box(element, 'dd').right).toBeLessThan(box(element, 'dt').left);
  });

  it('puts each term above its values when narrow', async () => {
    const element = await mount(pairs, 260);
    const term = box(element, 'dt');
    const value = box(element, 'dd');
    expect(value.top).toBeGreaterThanOrEqual(term.bottom - 0.5);
    expect(value.left).toBeCloseTo(term.left, 0);
  });

  it('keeps long terms and values inside a narrow container', async () => {
    const element = await mount(
      '<dt>Fertigungsgeschwindigkeitsberechnungsgrundlage</dt><dd>Zwischenproduktverarbeitungsanlage</dd>',
      187,
    );
    const holder = element.parentElement as HTMLElement;
    expect(holder.scrollWidth).toBeLessThanOrEqual(188);
    const wide = await mount(
      '<dt>Fertigungsgeschwindigkeitsberechnungsgrundlage</dt><dd>Zwischenproduktverarbeitungsanlage</dd>',
      400,
    );
    expect((wide.parentElement as HTMLElement).scrollWidth).toBeLessThanOrEqual(401);
  });
});

describe('appearance', () => {
  it('draws terms in the muted text color and values in tabular figures in every theme', async () => {
    addStylesheets();
    for (const theme of themeNames) {
      const element = await mount();
      element.parentElement?.setAttribute('data-punk-theme', theme);
      const probe = (element.parentElement as HTMLElement).appendChild(
        document.createElement('span'),
      );
      probe.style.color = 'var(--punk-color-text-muted)';
      const term = getComputedStyle(element.querySelector('dt') as Element);
      const value = getComputedStyle(element.querySelector('dd') as Element);
      expect(term.color, theme).toBe(getComputedStyle(probe).color);
      expect(value.fontVariantNumeric, theme).toBe('tabular-nums');
      expect(term.marginInlineStart).toBe('0px');
      expect(value.marginInlineStart).toBe('0px');
    }
  });

  it('has no surface by default, and an inset well with rules between rows as inset', async () => {
    const plain = await mount();
    const list = (element: PunkDescriptionList) =>
      getComputedStyle(element.shadowRoot?.querySelector('[part="list"]') as Element);
    expect(list(plain).backgroundColor).toBe('rgba(0, 0, 0, 0)');

    const element = await mount();
    element.variant = 'inset';
    await element.updateComplete;
    expect(list(element).backgroundColor).toBe('rgb(41, 43, 40)');
    const rule = (selector: string) =>
      getComputedStyle(element.querySelector(selector) as Element).borderTopWidth;
    expect([rule('dt:nth-of-type(1)'), rule('dd:nth-of-type(1)')]).toEqual(['0px', '0px']);
    expect([rule('dt:nth-of-type(2)'), rule('dd:nth-of-type(2)')]).toEqual(['1px', '1px']);
    expect(box(element, 'dt:nth-of-type(2)').top).toBeCloseTo(
      box(element, 'dd:nth-of-type(2)').top,
      0,
    );
  });
});

describe('warnings', () => {
  it('warns about a child that is not a term or a value, once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('<dt>Speed</dt><dd>0.75</dd><p>Note</p>');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      '<punk-description-list> Its children must be <dt> and <dd> elements, and a <p> is not.',
    );
    element.append(document.createElement('dd'));
    await new Promise((resolve) => setTimeout(resolve));
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns when it starts with a value, and not for a correct list', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount();
    await new Promise((resolve) => setTimeout(resolve));
    expect(warn).not.toHaveBeenCalled();
    await mount('<dd>0.75</dd><dt>Speed</dt><dd>1</dd>');
    await new Promise((resolve) => setTimeout(resolve));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('It starts with a <dd>, which has no term.');
  });
});
