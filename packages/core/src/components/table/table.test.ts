import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkTable } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const table = (caption = '<caption>Stock</caption>') => `
  <table>
    ${caption}
    <thead><tr>
      <th><input type="checkbox" data-punk-select-all aria-label="Select all"></th>
      <th data-sort="name"><button type="button">Item</button></th>
      <th data-sort="count" aria-sort="none"><button type="button">Count</button></th>
      <th>Note</th>
    </tr></thead>
    <tbody>
      <tr data-value="fe"><td><input type="checkbox" data-punk-select aria-label="Select Iron"></td><th scope="row">Iron plate</th><td>120</td><td>Smelted on site</td></tr>
      <tr data-value="cu"><td><input type="checkbox" data-punk-select aria-label="Select Copper"></td><th scope="row">Copper plate</th><td>80</td><td>Imported</td></tr>
      <tr data-value="gear"><td><input type="checkbox" data-punk-select aria-label="Select Gear"></td><th scope="row">Iron gear</th><td>12</td><td>Assembled</td></tr>
    </tbody>
  </table>
`;

async function mount(attributes = '', inner = table(), width?: number) {
  const holder = track(document.createElement('div'));
  if (width) holder.style.inlineSize = `${width}px`;
  holder.innerHTML = `<punk-table ${attributes}>${inner}</punk-table>`;
  const element = holder.firstElementChild as PunkTable;
  await element.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await element.updateComplete;
  return element;
}

const scroller = (element: Element) =>
  element.shadowRoot?.querySelector('[part="scroller"]') as HTMLElement;
const sorts = (element: Element) =>
  [...element.querySelectorAll('th[data-sort]')].map((cell) => cell.getAttribute('aria-sort'));

describe('semantics and look', () => {
  it('keeps the native table, named by its caption, and styles its cells', async () => {
    const element = await mount();
    expect(page.getByRole('table', { name: 'Stock' }).element()).toBe(
      element.querySelector('table'),
    );
    const cell = element.querySelector('td') as HTMLElement;
    expect(getComputedStyle(cell).paddingInlineStart).not.toBe('0px');
    const header = element.querySelector('thead th') as HTMLElement;
    expect(getComputedStyle(header).position).toBe('sticky');
  });

  it('tints the selection checkboxes with the accent, not the platform blue', async () => {
    const element = await mount();
    const probe = track(document.createElement('span'));
    probe.style.color = 'var(--punk-color-accent, #f59b23)';
    const box = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(getComputedStyle(box).accentColor).toBe(getComputedStyle(probe).color);
  });

  it('lets an application rule win over its own', async () => {
    const style = track(document.createElement('style'), document.head);
    style.textContent = 'td { padding-inline-start: 31px; }';
    const element = await mount();
    expect(getComputedStyle(element.querySelector('td') as HTMLElement).paddingInlineStart).toBe(
      '31px',
    );
  });

  it('is a focusable region only while it overflows', async () => {
    const wide = await mount('', table(), 900);
    expect(scroller(wide).hasAttribute('tabindex')).toBe(false);
    const narrow = await mount('', table(), 180);
    expect(scroller(narrow).getAttribute('tabindex')).toBe('0');
    expect(page.getByRole('region', { name: 'Stock' }).element()).toBe(scroller(narrow));
    expect(narrow.parentElement?.scrollWidth).toBeLessThanOrEqual(181);
  });

  it('warns when its table has no name, or it has no table', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await mount('', table(''));
    await mount('', '<p>Nothing</p>');
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '<punk-table> Its table has no name. Give it a `<caption>`, or set `aria-label`.',
      '<punk-table> It has no `<table>` child.',
    ]);
    warn.mockClear();
    await mount('aria-label="Stock"', table(''));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('sorting', () => {
  it('cycles a column on its button, clears the others, and reports each change', async () => {
    const element = await mount();
    const changes: string[] = [];
    element.addEventListener('punk-sort-change', (event) =>
      changes.push(`${event.detail.key}:${event.detail.direction}`),
    );
    expect(sorts(element)).toEqual(['none', 'none']);
    const [name, count] = [...element.querySelectorAll('th[data-sort] button')] as HTMLElement[];
    await userEvent.click(name as HTMLElement);
    expect(sorts(element)).toEqual(['ascending', 'none']);
    await userEvent.click(name as HTMLElement);
    expect(sorts(element)).toEqual(['descending', 'none']);
    await userEvent.click(count as HTMLElement);
    expect(sorts(element)).toEqual(['none', 'ascending']);
    expect(changes).toEqual(['name:ascending', 'name:descending', 'count:ascending']);
    expect([element.sortKey, element.sortDirection]).toEqual(['count', 'ascending']);
  });

  it('takes the sort from code without an event, and gives aria-sort back when it leaves', async () => {
    const element = await mount('sort-key="name" sort-direction="descending"');
    const change = vi.fn();
    element.addEventListener('punk-sort-change', change);
    expect(sorts(element)).toEqual(['descending', 'none']);
    element.sortKey = 'count';
    await element.updateComplete;
    expect(sorts(element)).toEqual(['none', 'descending']);
    expect(change).not.toHaveBeenCalled();
    element.remove();
    expect(sorts(element)).toEqual([null, 'none']);
  });

  it('draws a different arrow for each direction, also under forced colors', async () => {
    for (const forced of [false, true]) {
      if (forced) await commands.setForcedColors('active');
      const element = await mount('sort-key="name"');
      const shape = () =>
        getComputedStyle(
          element.querySelector('th[data-sort="name"] button') as HTMLElement,
          '::after',
        ).clipPath;
      const ascending = shape();
      element.sortDirection = 'descending';
      await element.updateComplete;
      expect(shape()).not.toBe(ascending);
      element.sortKey = '';
      await element.updateComplete;
      expect(shape()).not.toBe(ascending);
    }
  });
});

describe('selection', () => {
  it('marks checked rows, keeps the select-all box in step, and reports each change', async () => {
    const element = await mount();
    const changes: string[][] = [];
    element.addEventListener('punk-selection-change', (event) => changes.push(event.detail.values));
    const boxes = [...element.querySelectorAll<HTMLInputElement>('[data-punk-select]')];
    const all = element.querySelector('[data-punk-select-all]') as HTMLInputElement;
    await userEvent.click(boxes[1] as HTMLInputElement);
    expect(all.indeterminate).toBe(true);
    expect(element.querySelector('tr[data-value="cu"]')?.hasAttribute('data-selected')).toBe(true);
    await userEvent.click(all);
    expect(element.values).toEqual(['fe', 'cu', 'gear']);
    expect([all.checked, all.indeterminate]).toEqual([true, false]);
    await userEvent.click(all);
    expect(element.values).toEqual([]);
    expect(changes).toEqual([['cu'], ['fe', 'cu', 'gear'], []]);
  });

  it('checks rows by value from code without an event', async () => {
    const element = await mount();
    const change = vi.fn();
    element.addEventListener('punk-selection-change', change);
    element.values = ['gear'];
    expect(element.values).toEqual(['gear']);
    expect(element.querySelector('tr[data-value="gear"]')?.hasAttribute('data-selected')).toBe(
      true,
    );
    expect(change).not.toHaveBeenCalled();
  });
});
