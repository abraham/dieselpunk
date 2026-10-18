import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkBreadcrumb, PunkBreadcrumbItem } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await setLocale('en');
});

const trail = `
  <punk-breadcrumb-item href="#base">Base</punk-breadcrumb-item>
  <punk-breadcrumb-item href="#north">North works</punk-breadcrumb-item>
  <punk-breadcrumb-item href="#line">Line 2</punk-breadcrumb-item>
  <punk-breadcrumb-item href="#asm">Assembler</punk-breadcrumb-item>
  <punk-breadcrumb-item current>Settings</punk-breadcrumb-item>
`;

async function mount(attributes = '', inner = trail) {
  const holder = track(document.createElement('div'));
  holder.innerHTML = `<punk-breadcrumb ${attributes}>${inner}</punk-breadcrumb>`;
  const element = holder.firstElementChild as PunkBreadcrumb;
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;
  const items = [...element.querySelectorAll('punk-breadcrumb-item')] as PunkBreadcrumbItem[];
  await Promise.all(items.map((item) => item.updateComplete));
  return { element, items };
}

const visible = (items: PunkBreadcrumbItem[]) =>
  items.filter((item) => !item.hidden).map((item) => item.textContent?.trim());

describe('semantics', () => {
  it('is a navigation landmark of a list of links, with the current page marked', async () => {
    const { items } = await mount();
    expect(page.getByRole('navigation', { name: 'Breadcrumb' }).element()).toBeTruthy();
    expect(items.every((item) => item.getAttribute('role') === 'listitem')).toBe(true);
    expect(page.getByRole('link', { name: 'North works' }).element().getAttribute('href')).toBe(
      '#north',
    );
    const current = items[4]?.shadowRoot?.querySelector('[part="link"]') as HTMLElement;
    expect(current.localName).toBe('span');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('takes its name from label, or the locale', async () => {
    await mount('label="Path"');
    expect(page.getByRole('navigation', { name: 'Path' }).element()).toBeTruthy();
    const { element } = await mount();
    await setLocale('de');
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Navigationspfad',
    );
  });

  it('hides the separator before the first item only', async () => {
    const { items } = await mount();
    const shown = items.map(
      (item) =>
        getComputedStyle(item.shadowRoot?.querySelector('[part="separator"]') as HTMLElement)
          .display,
    );
    expect(shown).toEqual(['none', 'block', 'block', 'block', 'block']);
  });

  it('wraps instead of scrolling in a narrow container', async () => {
    const { element } = await mount();
    element.style.inlineSize = '160px';
    expect(element.scrollWidth).toBeLessThanOrEqual(161);
  });
});

describe('collapsing', () => {
  it('shows the first and last items around a button, which reveals the rest and takes focus to them', async () => {
    const { element, items } = await mount('max-items="3"');
    expect(visible(items)).toEqual(['Base', 'Assembler', 'Settings']);
    const more = page.getByRole('button', { name: 'Show full path' });
    await userEvent.click(more);
    await element.updateComplete;
    expect(visible(items)).toEqual(['Base', 'North works', 'Line 2', 'Assembler', 'Settings']);
    await new Promise((resolve) => setTimeout(resolve));
    expect(items[1]?.shadowRoot?.activeElement?.getAttribute('href')).toBe('#north');
    expect(document.activeElement).toBe(items[1]);
  });

  it('shows everything without max-items, or below 2', async () => {
    const { element, items } = await mount('max-items="1"');
    expect(visible(items)).toHaveLength(5);
    expect(element.shadowRoot?.querySelector<HTMLElement>('.more-item')?.hidden).toBe(true);
  });

  it('gives back the slot and hidden the author had when an item leaves', async () => {
    const { items } = await mount('max-items="2"');
    const item = items[2] as PunkBreadcrumbItem;
    expect([item.slot, item.hidden]).toEqual(['rest', true]);
    item.remove();
    await new Promise((resolve) => setTimeout(resolve));
    expect([item.hasAttribute('slot'), item.hidden]).toEqual([false, false]);
  });
});

describe('links (specs/security.md §4.2)', () => {
  const linkOf = (item: PunkBreadcrumbItem) =>
    item.shadowRoot?.querySelector('[part="link"]') as HTMLElement;
  const warnings = () =>
    vi.mocked(console.warn).mock.calls.filter(([text]) => String(text).includes('`href`'));

  it('links http:, https:, mailto:, and relative URLs', async () => {
    const urls = [
      'https://example.com/a',
      'http://example.com',
      'mailto:ops@example.com',
      '../line',
    ];
    const inner = urls
      .map((url) => `<punk-breadcrumb-item href="${url}">Step</punk-breadcrumb-item>`)
      .join('');
    const { items } = await mount('', inner);
    expect(items.map((item) => linkOf(item).getAttribute('href'))).toEqual(urls);
    expect(warnings()).toHaveLength(0);
  });

  it('renders an href that could run script as text, and warns once', async () => {
    const urls = [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,x',
    ];
    const inner = urls.map(() => '<punk-breadcrumb-item>Step</punk-breadcrumb-item>').join('');
    const { items } = await mount('', inner);
    for (const [index, item] of items.entries()) {
      item.href = urls[index] as string;
      await item.updateComplete;
      const link = linkOf(item);
      expect(link.localName, urls[index]).toBe('span');
      expect(link.hasAttribute('href'), urls[index]).toBe(false);
    }
    expect(page.getByRole('link').elements()).toHaveLength(0);
    expect(warnings()).toHaveLength(urls.length);

    const item = items[0] as PunkBreadcrumbItem;
    item.current = true;
    await item.updateComplete;
    expect(warnings()).toHaveLength(urls.length);
  });

  it('warns again when an unsafe href comes back after a safe one', async () => {
    const { items } = await mount('', '<punk-breadcrumb-item>Step</punk-breadcrumb-item>');
    const item = items[0] as PunkBreadcrumbItem;
    for (const href of ['javascript:void 0', '#north', 'javascript:void 0']) {
      item.href = href;
      await item.updateComplete;
    }
    expect(warnings()).toHaveLength(2);
    expect(linkOf(item).localName).toBe('span');
  });
});
