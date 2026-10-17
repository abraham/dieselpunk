import { commands, page as screen, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkPagination } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
  await setLocale('en');
});

async function mount(attributes = 'page="5" pages="12"', lang = 'en') {
  const holder = track(document.createElement('div'));
  holder.lang = lang;
  holder.innerHTML = `<punk-pagination ${attributes}></punk-pagination>`;
  const element = holder.firstElementChild as PunkPagination;
  await element.updateComplete;
  return element;
}

const labels = (element: Element) =>
  [...(element.shadowRoot?.querySelectorAll('[part="page"], [part="gap"]') ?? [])].map((node) =>
    node.textContent?.trim(),
  );
const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLButtonElement;

describe('semantics', () => {
  it('is a navigation landmark of named page buttons with the current one marked', async () => {
    const element = await mount();
    expect(screen.getByRole('navigation', { name: 'Pagination' }).element()).toBeTruthy();
    expect(labels(element)).toEqual(['1', '…', '4', '5', '6', '…', '12']);
    const current = screen.getByRole('button', { name: 'Page 5' }).element();
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Previous page' }).element()).toBe(
      part(element, 'previous'),
    );
    expect(screen.getByRole('button', { name: 'Next page' }).element()).toBe(part(element, 'next'));
  });

  it('disables previous on the first page and next on the last', async () => {
    const first = await mount('page="1" pages="3"');
    expect([part(first, 'previous').disabled, part(first, 'next').disabled]).toEqual([true, false]);
    const last = await mount('page="3" pages="3"');
    expect([part(last, 'previous').disabled, part(last, 'next').disabled]).toEqual([false, true]);
  });

  it('formats numbers and names for the language', async () => {
    const element = await mount('page="2" pages="3"', 'ar-EG');
    expect(labels(element)[1]).toBe('٢');
    await setLocale('de');
    await element.updateComplete;
    expect(part(element, 'next').getAttribute('aria-label')).toBe('Nächste Seite');
    expect(element.shadowRoot?.querySelector('[aria-current]')?.getAttribute('aria-label')).toBe(
      'Seite ٢',
    );
  });

  it('shows more pages around the current one with siblings', async () => {
    const element = await mount('page="10" pages="20" siblings="2"');
    expect(labels(element)).toEqual(['1', '…', '8', '9', '10', '11', '12', '…', '20']);
  });
});

describe('user changes', () => {
  it('goes to a page on click, sends punk-page-change, and keeps focus on the button', async () => {
    const element = await mount();
    const pages: number[] = [];
    element.addEventListener('punk-page-change', (event) => pages.push(event.detail.page));
    await userEvent.click(screen.getByRole('button', { name: 'Page 6' }));
    await element.updateComplete;
    expect(element.page).toBe(6);
    expect(element.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Page 6');
    await userEvent.click(part(element, 'next'));
    await element.updateComplete;
    expect(element.shadowRoot?.activeElement).toBe(part(element, 'next'));
    await userEvent.click(screen.getByRole('button', { name: 'Page 7' }));
    expect(pages).toEqual([6, 7]);
  });

  it('moves focus to the current page when next becomes disabled', async () => {
    const element = await mount('page="2" pages="3"');
    await userEvent.click(part(element, 'next'));
    await element.updateComplete;
    expect(element.shadowRoot?.activeElement?.getAttribute('aria-current')).toBe('page');
  });

  it('sends nothing for a page set from code', async () => {
    const element = await mount();
    const change = vi.fn();
    element.addEventListener('punk-page-change', change);
    element.page = 9;
    await element.updateComplete;
    expect(change).not.toHaveBeenCalled();
    expect(element.shadowRoot?.querySelector('[aria-current]')?.textContent?.trim()).toBe('9');
  });
});

describe('repairs', () => {
  it('clamps the page and repairs the count, warning once per problem', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    const element = await mount('page="40" pages="12"');
    expect(element.shadowRoot?.querySelector('[aria-current]')?.textContent?.trim()).toBe('12');
    element.requestUpdate();
    await element.updateComplete;
    element.pages = 0;
    await element.updateComplete;
    expect(labels(element)).toEqual(['1']);
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '<punk-pagination> `page` 40 is outside 1 to 12, so it is 12.',
      '<punk-pagination> `pages` is 0, so it is 1.',
    ]);
  });
});

describe('look', () => {
  it('sets the current page in, a different shape from the others, also under forced colors', async () => {
    for (const forced of [false, true]) {
      if (forced) await commands.setForcedColors('active');
      const element = await mount();
      const look = (button: Element) => {
        const style = getComputedStyle(button);
        return [
          style.boxShadow.replace(/rgba?\([^)]*\)/g, 'C'),
          style.borderTopStyle,
          style.borderTopWidth,
        ].join();
      };
      const current = element.shadowRoot?.querySelector('[aria-current]') as Element;
      const other = element.shadowRoot?.querySelector(
        '[part="page"]:not([aria-current])',
      ) as Element;
      expect(look(current)).not.toBe(look(other));
    }
  });
});
