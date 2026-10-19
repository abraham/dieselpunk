import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkList, PunkListItem } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const rows = `
  <punk-list-item value="iron">Iron plate<span slot="description">Smelted</span></punk-list-item>
  <punk-list-item value="copper">Copper plate</punk-list-item>
  <punk-list-item value="steel" disabled>Steel beam</punk-list-item>
  <punk-list-item value="gear">Gear<span slot="end">12</span></punk-list-item>
`;

async function mount(attributes = 'aria-label="Items" selection="single"', inner = rows) {
  const holder = track(document.createElement('div'));
  holder.innerHTML = `<punk-list ${attributes}>${inner}</punk-list>`;
  const list = holder.firstElementChild as PunkList;
  await list.updateComplete;
  await new Promise((resolve) => setTimeout(resolve));
  const items = [...list.querySelectorAll('punk-list-item')] as PunkListItem[];
  await Promise.all(items.map((item) => item.updateComplete));
  return { list, items };
}

const attrs = (items: Element[], name: string) => items.map((item) => item.getAttribute(name));

describe('roles', () => {
  it('is a list of listitems that take no focus without selection', async () => {
    const { list, items } = await mount('aria-label="Items"');
    expect(list.getAttribute('role')).toBe('list');
    expect(attrs(items, 'role')).toEqual(['listitem', 'listitem', 'listitem', 'listitem']);
    expect(attrs(items, 'tabindex')).toEqual([null, null, null, null]);
    expect(attrs(items, 'aria-selected')).toEqual([null, null, null, null]);
  });

  it('is a listbox of options with one tab stop when it selects', async () => {
    const { list, items } = await mount('aria-label="Items" selection="multiple"');
    expect(page.getByRole('listbox', { name: 'Items' }).element()).toBe(list);
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    expect(page.getByRole('option', { name: 'Gear 12' }).element()).toBe(items[3]);
    expect(attrs(items, 'tabindex')).toEqual(['0', '-1', null, '-1']);
    expect(attrs(items, 'aria-selected')).toEqual(['false', 'false', 'false', 'false']);
  });

  it('gives an item its own role back when it leaves', async () => {
    const { items } = await mount();
    const item = items[0] as PunkListItem;
    item.remove();
    track(item);
    await new Promise((resolve) => setTimeout(resolve));
    await item.updateComplete;
    expect(item.getAttribute('role')).toBe('button');
    expect(item.hasAttribute('aria-selected')).toBe(false);
  });
});

describe('keyboard and selection', () => {
  it('moves focus without selecting, and selects with Space, once per change', async () => {
    const { list, items } = await mount();
    const changes: string[][] = [];
    list.addEventListener('punk-selection-change', (event) => changes.push(event.detail.values));
    items[0]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    expect(list.values).toEqual([]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[3]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[3]);
    await userEvent.keyboard(' ');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(items[0]);
    expect(changes).toEqual([['gear']]);
    expect(attrs(items, 'aria-selected')).toEqual(['false', 'false', 'false', 'true']);
  });

  it('toggles, extends, and selects all in multiple', async () => {
    const { list, items } = await mount('aria-label="Items" selection="multiple"');
    await userEvent.click(items[0] as PunkListItem);
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(list.values).toEqual(['iron', 'copper']);
    await userEvent.click(items[0] as PunkListItem);
    expect(list.values).toEqual(['copper']);
    items[0]?.focus();
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(list.values).toEqual(['iron', 'copper', 'gear']);
  });

  it('activates with Enter and a click, and Space does not activate', async () => {
    const { list, items } = await mount();
    const activated: string[] = [];
    list.addEventListener('punk-activate', (event) => activated.push(event.detail.value));
    items[1]?.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.click(items[3] as PunkListItem);
    expect(activated).toEqual(['copper', 'gear']);
    expect(list.values).toEqual(['gear']);
  });

  it('selects by value from code, before and after the items exist, and sends nothing', async () => {
    const holder = track(document.createElement('div'));
    const list = document.createElement('punk-list');
    list.setAttribute('aria-label', 'Items');
    list.selection = 'single';
    list.values = ['copper'];
    list.innerHTML = rows;
    const change = vi.fn();
    list.addEventListener('punk-selection-change', change);
    holder.append(list);
    await new Promise((resolve) => setTimeout(resolve));
    const items = [...list.querySelectorAll('punk-list-item')];
    expect(attrs(items, 'aria-selected')).toEqual(['false', 'true', 'false', 'false']);
    list.values = ['gear'];
    expect(list.values).toEqual(['gear']);
    expect(change).not.toHaveBeenCalled();
  });
});

describe('look and warnings', () => {
  it('shows a check on a selected row, which survives forced colors', async () => {
    for (const forced of [false, true]) {
      if (forced) await commands.setForcedColors('active');
      const { list, items } = await mount();
      list.values = ['iron'];
      await items[0]?.updateComplete;
      const check = (item: PunkListItem) =>
        getComputedStyle(item.shadowRoot?.querySelector('[part="check"]') as HTMLElement)
          .visibility;
      expect(check(items[0] as PunkListItem)).toBe('visible');
      expect(check(items[1] as PunkListItem)).toBe('hidden');
    }
  });

  it('dims all of a disabled row, its description and slots included', async () => {
    const { items } = await mount(
      'aria-label="Items" selection="single"',
      '<punk-list-item value="a">A<span slot="description">On</span></punk-list-item>' +
        '<punk-list-item value="b" disabled>B<span slot="description">Off</span><span slot="end">3</span></punk-list-item>',
    );
    const color = (item: PunkListItem, name: string) =>
      getComputedStyle(item.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement).color;
    const off = items[1] as PunkListItem;
    expect(color(off, 'description')).toBe(color(off, 'item'));
    expect(color(off, 'end')).toBe(color(off, 'item'));
    expect(color(items[0] as PunkListItem, 'description')).not.toBe(color(off, 'description'));
  });

  it('warns about a missing name, a stray child, and missing values', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await mount('selection="single"', '<punk-list-item>A</punk-list-item><p>B</p>');
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '<punk-list> It contains elements that are not `punk-list-item`, so they are ignored.',
      '<punk-list> It has no accessible name. Set `aria-label`.',
      '<punk-list> Its items need distinct, non-empty `value`s to be selected.',
    ]);
  });
});
