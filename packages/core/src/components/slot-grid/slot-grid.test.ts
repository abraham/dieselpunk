import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import '../slot/register.ts';
import '../item-stack/register.ts';
import { PunkSelectableBase } from '../../internal/selectable-base.ts';
import { registerElement } from '../../utilities/register-element.ts';
import type { PunkActivateDetail } from '../../internal/selectable-base.ts';
import type { PunkSlotGrid, PunkSelectionChangeDetail } from './index.ts';

let warn: MockInstance<typeof console.warn>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Item = HTMLElement & {
  disabled: boolean;
  selected: boolean;
  value: string;
  updateComplete: Promise<boolean>;
};

interface Options {
  selection?: string;
  count?: number;
  columns?: number;
  width?: number;
  dir?: 'ltr' | 'rtl';
  kind?: 'slot' | 'stack';
  attributes?: Record<string, string>;
  disabled?: number[];
  /** Index of the items given no value. */
  valueless?: number[];
  label?: string | null;
}

const art =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';

function wrapper(options: { width?: number; dir?: 'ltr' | 'rtl' } = {}): HTMLElement {
  const element = document.createElement('div');
  element.style.inlineSize = `${options.width ?? 400}px`;
  if (options.dir) element.dir = options.dir;
  return track(element);
}

function makeItem(index: number, options: Options): Item {
  const stack = options.kind === 'stack';
  const element = document.createElement(stack ? 'punk-item-stack' : 'punk-slot') as Item;
  if (stack) {
    element.setAttribute('name', `Item ${index}`);
    element.setAttribute('count', String(index * 10));
    element.innerHTML = art.replace('<svg', '<svg slot="icon"');
  } else {
    element.setAttribute('label', `Slot ${index}`);
    element.innerHTML = art;
  }
  if (!options.valueless?.includes(index)) element.setAttribute('value', `v${index}`);
  if (options.disabled?.includes(index)) element.setAttribute('disabled', '');
  return element;
}

/** Waits for the grid to adopt its items, which happens after `slotchange`. */
async function settle(grid: PunkSlotGrid): Promise<void> {
  await grid.updateComplete;
  for (let round = 0; round < 2; round++) {
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all([...grid.children].map((child) => (child as Item).updateComplete));
  }
}

async function mountGrid(options: Options = {}) {
  const parent = wrapper(options);
  const grid = document.createElement('punk-slot-grid');
  if (options.label !== null) grid.setAttribute('aria-label', options.label ?? 'Module slots');
  if (options.selection !== undefined) grid.setAttribute('selection', options.selection);
  if (options.columns !== undefined) grid.setAttribute('columns', String(options.columns));
  for (const [name, value] of Object.entries(options.attributes ?? {}))
    grid.setAttribute(name, value);
  const items = Array.from({ length: options.count ?? 8 }, (_, index) => {
    const item = makeItem(index + 1, options);
    grid.append(item);
    return item;
  });
  parent.append(grid);
  await settle(grid);
  return { grid, items, parent };
}

function focusItem(item: HTMLElement): void {
  if (!document.hasFocus()) window.focus();
  item.focus();
}

function tabStops(grid: Element): HTMLElement[] {
  return [...grid.children].filter(
    (child) => child.getAttribute('tabindex') === '0',
  ) as HTMLElement[];
}

function listenForChanges(grid: PunkSlotGrid) {
  const handler = vi.fn<(event: CustomEvent<PunkSelectionChangeDetail>) => void>();
  grid.addEventListener('punk-selection-change', handler);
  return handler;
}

function listenForActivation(grid: PunkSlotGrid) {
  const handler = vi.fn<(event: CustomEvent<PunkActivateDetail>) => void>();
  grid.addEventListener('punk-activate', handler);
  return handler;
}

async function press(key: string): Promise<void> {
  await userEvent.keyboard(key);
}

const focusedValue = () => (document.activeElement as Item | null)?.value;

describe('roles and states', () => {
  it('is a group of buttons when nothing can be selected', async () => {
    const { grid, items } = await mountGrid();
    expect(grid.getAttribute('role')).toBe('group');
    expect(grid.hasAttribute('aria-multiselectable')).toBe(false);
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('button');
      expect(item.hasAttribute('aria-selected')).toBe(false);
      expect(item.hasAttribute('aria-pressed')).toBe(false);
    }
    expect(page.getByRole('group', { name: 'Module slots', exact: true }).element()).toBe(grid);
    expect(page.getByRole('button', { name: 'Slot 3', exact: true }).element()).toBe(items[2]);
  });

  it('is a listbox of options when one can be selected', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    expect(grid.getAttribute('role')).toBe('listbox');
    expect(grid.hasAttribute('aria-multiselectable')).toBe(false);
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('option');
      expect(item.getAttribute('aria-selected')).toBe('false');
      expect(item.hasAttribute('aria-pressed')).toBe(false);
    }
    expect(page.getByRole('listbox', { name: 'Module slots', exact: true }).element()).toBe(grid);
    expect(page.getByRole('option', { name: 'Slot 3', exact: true }).element()).toBe(items[2]);
  });

  it('is a multiselectable listbox when several can be selected', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    expect(grid.getAttribute('role')).toBe('listbox');
    expect(grid.getAttribute('aria-multiselectable')).toBe('true');
    expect(items.every((item) => item.getAttribute('role') === 'option')).toBe(true);
  });

  it('reports the selection in the accessibility tree', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    grid.values = ['v2', 'v5'];
    await settle(grid);
    expect(page.getByRole('option', { selected: true }).elements()).toEqual([items[1], items[4]]);
    expect(page.getByRole('option', { selected: false }).elements()).toHaveLength(6);
  });

  it('treats an unknown selection as none', async () => {
    const { grid, items } = await mountGrid({ selection: 'several' });
    expect(grid.getAttribute('role')).toBe('group');
    expect(items[0]?.getAttribute('role')).toBe('button');
  });

  it('changes roles when the selection mode changes, and clears the selection for none', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    grid.values = ['v2'];
    await settle(grid);
    grid.selection = 'multiple';
    await settle(grid);
    expect(grid.getAttribute('aria-multiselectable')).toBe('true');
    expect(items[1]?.getAttribute('aria-selected')).toBe('true');
    grid.selection = 'none';
    await settle(grid);
    expect(grid.getAttribute('role')).toBe('group');
    expect(items[1]?.getAttribute('role')).toBe('button');
    expect(items[1]?.hasAttribute('aria-selected')).toBe(false);
    expect(items[1]?.selected).toBe(false);
    expect(grid.values).toEqual([]);
  });

  it('takes the role back from an item that leaves, and hands it to one that arrives', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    const gone = items[0] as Item;
    document.body.append(gone);
    await settle(grid);
    await gone.updateComplete;
    expect(gone.getAttribute('role')).toBe('button');
    expect(gone.hasAttribute('aria-selected')).toBe(false);
    const arrival = makeItem(9, {});
    grid.append(arrival);
    await settle(grid);
    expect(arrival.getAttribute('role')).toBe('option');
    expect(arrival.getAttribute('aria-selected')).toBe('false');
    gone.remove();
  });

  it('works with item stacks, and with a mixture', async () => {
    const { grid, items } = await mountGrid({ kind: 'stack', selection: 'single', count: 3 });
    grid.append(makeItem(4, {}));
    await settle(grid);
    expect(page.getByRole('option', { name: 'Item 2, 20', exact: true }).element()).toBe(items[1]);
    expect([...grid.children].every((child) => child.getAttribute('role') === 'option')).toBe(true);
  });

  it('adopts items that are defined after the grid is', async () => {
    const parent = wrapper();
    const grid = document.createElement('punk-slot-grid');
    grid.setAttribute('aria-label', 'Late');
    grid.setAttribute('selection', 'single');
    const late = document.createElement('punk-late-item') as Item;
    late.setAttribute('value', 'late');
    grid.append(late);
    parent.append(grid);
    await settle(grid);
    expect(late.getAttribute('role')).toBeNull();

    class LateItem extends PunkSelectableBase {}
    registerElement('punk-late-item', LateItem);
    await settle(grid);
    await late.updateComplete;
    expect(late.getAttribute('role')).toBe('option');
    expect(late.getAttribute('aria-selected')).toBe('false');
    expect(late.getAttribute('tabindex')).toBe('0');
  });
});

describe('tab stop', () => {
  it('is one item, the first enabled', async () => {
    const { grid, items } = await mountGrid({ disabled: [1] });
    expect(tabStops(grid)).toEqual([items[1]]);
    expect(items.filter((item) => item.getAttribute('tabindex') === '-1')).toHaveLength(6);
    expect(items[0]?.hasAttribute('tabindex')).toBe(false);
  });

  it('is the first selected item when there is a selection', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    grid.values = ['v4', 'v6'];
    await settle(grid);
    expect(tabStops(grid)).toEqual([items[3]]);
  });

  it('is where focus last was, even when the selection is elsewhere', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    grid.values = ['v2'];
    await settle(grid);
    focusItem(items[4] as HTMLElement);
    expect(tabStops(grid)).toEqual([items[4]]);
    grid.values = ['v7'];
    await settle(grid);
    expect(tabStops(grid)).toEqual([items[4]]);
  });

  it('is reached by Tab, left by the next Tab, and returned to by Shift+Tab', async () => {
    const parent = wrapper();
    const before = Object.assign(document.createElement('div'), { tabIndex: 0 });
    const after = Object.assign(document.createElement('div'), { tabIndex: 0 });
    const grid = document.createElement('punk-slot-grid');
    grid.setAttribute('aria-label', 'Module slots');
    const items = [1, 2, 3, 4].map((index) => grid.appendChild(makeItem(index, {})) as Item);
    parent.append(before, grid, after);
    await settle(grid);

    focusItem(before);
    await userEvent.tab();
    expect(document.activeElement).toBe(items[0]);
    await press('{ArrowRight}');
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[2]);
    await userEvent.tab();
    expect(document.activeElement).toBe(after);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(items[2]);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(before);
  });

  it('moves to a clicked item', async () => {
    const { grid, items } = await mountGrid();
    await userEvent.click(items[3] as HTMLElement);
    expect(tabStops(grid)).toEqual([items[3]]);
  });

  it('survives items being removed, disabled, and added', async () => {
    const { grid, items } = await mountGrid({ count: 4 });
    expect(tabStops(grid)).toEqual([items[0]]);

    items[0]?.remove();
    await settle(grid);
    expect(tabStops(grid)).toEqual([items[1]]);

    (items[1] as Item).disabled = true;
    await settle(grid);
    expect(tabStops(grid)).toEqual([items[2]]);
    expect(items[1]?.hasAttribute('tabindex')).toBe(false);

    (items[1] as Item).disabled = false;
    await settle(grid);
    expect(tabStops(grid)).toHaveLength(1);

    const added = makeItem(9, {});
    grid.append(added);
    await settle(grid);
    expect(tabStops(grid)).toHaveLength(1);
    expect(added.getAttribute('tabindex')).toBe('-1');
  });

  it('is nowhere when every item is disabled, and comes back with the first enabled one', async () => {
    const { grid, items } = await mountGrid({ count: 3, disabled: [1, 2, 3] });
    expect(tabStops(grid)).toEqual([]);
    (items[1] as Item).disabled = false;
    await settle(grid);
    expect(tabStops(grid)).toEqual([items[1]]);
  });

  it('starts an empty grid with no tab stop and gives the first arrival one', async () => {
    const { grid } = await mountGrid({ count: 0 });
    expect(tabStops(grid)).toEqual([]);
    const added = makeItem(1, {});
    grid.append(added);
    await settle(grid);
    expect(tabStops(grid)).toEqual([added]);
  });
});

describe('keyboard in a left-to-right grid', () => {
  // Four columns: 1 2 3 4 / 5 6 7 8
  async function focused(options: Options = {}) {
    const mounted = await mountGrid({ columns: 4, ...options });
    focusItem(mounted.items[0] as HTMLElement);
    return mounted;
  }

  it('moves along the row with Left and Right, and on to the next row, without wrapping round', async () => {
    const { items } = await focused();
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[1]);
    await press('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(items[3]);
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[4]);
    await press('{ArrowLeft}');
    expect(document.activeElement).toBe(items[3]);
    focusItem(items[7] as HTMLElement);
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[7]);
    focusItem(items[0] as HTMLElement);
    await press('{ArrowLeft}');
    expect(document.activeElement).toBe(items[0]);
  });

  it('moves between rows with Up and Down, keeping the column', async () => {
    const { items } = await focused();
    await press('{ArrowRight}{ArrowDown}');
    expect(document.activeElement).toBe(items[5]);
    await press('{ArrowUp}');
    expect(document.activeElement).toBe(items[1]);
    await press('{ArrowUp}');
    expect(document.activeElement).toBe(items[1]);
    focusItem(items[6] as HTMLElement);
    await press('{ArrowDown}');
    expect(document.activeElement).toBe(items[6]);
  });

  it('goes to the ends of the row with Home and End, and of the grid with Ctrl', async () => {
    const { items } = await focused();
    focusItem(items[5] as HTMLElement);
    await press('{End}');
    expect(document.activeElement).toBe(items[7]);
    await press('{Home}');
    expect(document.activeElement).toBe(items[4]);
    await press('{Control>}{Home}{/Control}');
    expect(document.activeElement).toBe(items[0]);
    await press('{Control>}{End}{/Control}');
    expect(document.activeElement).toBe(items[7]);
  });

  it('skips disabled items', async () => {
    const { items } = await focused({ disabled: [2, 6] });
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[2]);
    await press('{ArrowDown}');
    expect(document.activeElement).toBe(items[6]);
  });

  it('prevents the page from scrolling for the keys it handles, and leaves others alone', async () => {
    const { items } = await focused();
    const down = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    items[0]?.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    const other = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    items[0]?.dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
    for (const init of [{ altKey: true }, { metaKey: true }, { ctrlKey: true }]) {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
        ...init,
      });
      items[0]?.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('never changes the selection by moving focus', async () => {
    const { grid, items } = await focused({ selection: 'multiple' });
    grid.values = ['v3'];
    await settle(grid);
    const changes = listenForChanges(grid);
    await press('{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}{End}{Home}');
    expect(changes).not.toHaveBeenCalled();
    expect(grid.values).toEqual(['v3']);
    expect(items.filter((item) => item.selected)).toEqual([items[2]]);
  });

  it('ignores keys while the grid is disabled', async () => {
    const { grid, items } = await focused();
    grid.disabled = true;
    await settle(grid);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    items[0]?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('keyboard in a right-to-left grid', () => {
  // Reading order runs right to left: 4 3 2 1 / 8 7 6 5 on screen.
  async function focused() {
    const mounted = await mountGrid({ columns: 4, dir: 'rtl', width: 300 });
    focusItem(mounted.items[0] as HTMLElement);
    return mounted;
  }

  it('swaps Left and Right', async () => {
    const { items } = await focused();
    await press('{ArrowLeft}');
    expect(document.activeElement).toBe(items[1]);
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[0]);
    await press('{ArrowRight}');
    expect(document.activeElement).toBe(items[0]);
  });

  it('keeps Up and Down on the same side of the screen', async () => {
    const { items } = await focused();
    await press('{ArrowLeft}{ArrowDown}');
    expect(document.activeElement).toBe(items[5]);
    await press('{ArrowUp}');
    expect(document.activeElement).toBe(items[1]);
  });

  it('puts Home on the right edge of the row and End on the left', async () => {
    const { items } = await focused();
    focusItem(items[6] as HTMLElement);
    await press('{Home}');
    expect(document.activeElement).toBe(items[4]);
    await press('{End}');
    expect(document.activeElement).toBe(items[7]);
  });
});

describe('keyboard and a grid whose columns change with its width', () => {
  it('moves by the rows it has now', async () => {
    const { grid, items, parent } = await mountGrid({ width: 400 });
    focusItem(items[0] as HTMLElement);
    await press('{ArrowDown}');
    expect(document.activeElement).toBe(items[0]);
    parent.style.inlineSize = '130px';
    grid.requestUpdate();
    await grid.updateComplete;
    await press('{ArrowDown}');
    expect(document.activeElement).toBe(items[3]);
    await press('{End}');
    expect(document.activeElement).toBe(items[5]);
  });
});

describe('selection by keyboard', () => {
  it('selects with Space in single mode, and keeps the selection when it is pressed again', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    const changes = listenForChanges(grid);
    focusItem(items[2] as HTMLElement);
    await press(' ');
    expect(grid.values).toEqual(['v3']);
    expect(items[2]?.getAttribute('aria-selected')).toBe('true');
    await press(' ');
    expect(grid.values).toEqual(['v3']);
    await press('{ArrowRight} ');
    expect(grid.values).toEqual(['v4']);
    expect(items[2]?.getAttribute('aria-selected')).toBe('false');
    expect(changes).toHaveBeenCalledTimes(2);
  });

  it('toggles with Space in multiple mode', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    focusItem(items[0] as HTMLElement);
    await press(' {ArrowRight}{ArrowRight} ');
    expect(grid.values).toEqual(['v1', 'v3']);
    await press(' ');
    expect(grid.values).toEqual(['v1']);
  });

  it('does not activate on Space where Space selects, and does on Enter without selecting', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    const activations = listenForActivation(grid);
    const changes = listenForChanges(grid);
    focusItem(items[1] as HTMLElement);
    await press(' ');
    expect(activations).not.toHaveBeenCalled();
    await press('{ArrowRight}{Enter}');
    expect(activations).toHaveBeenCalledTimes(1);
    expect(activations.mock.calls[0]?.[0].detail).toEqual({ value: 'v3', item: items[2] });
    expect(grid.values).toEqual(['v2']);
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it('activates on both Space and Enter when nothing can be selected', async () => {
    const { grid, items } = await mountGrid();
    const activations = listenForActivation(grid);
    focusItem(items[0] as HTMLElement);
    await press(' {Enter}');
    expect(activations).toHaveBeenCalledTimes(2);
    expect(grid.values).toEqual([]);
  });

  it('ignores a held Space', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    focusItem(items[0] as HTMLElement);
    items[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    );
    items[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true }),
    );
    expect(grid.values).toEqual(['v1']);
  });

  it('extends the selection from where it started with Shift and the arrows', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple', columns: 4 });
    focusItem(items[1] as HTMLElement);
    await press('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
    expect(grid.values).toEqual(['v2', 'v3', 'v4']);
    await press('{Shift>}{ArrowLeft}{/Shift}');
    expect(grid.values).toEqual(['v2', 'v3']);
    await press('{Shift>}{ArrowDown}{/Shift}');
    expect(grid.values).toEqual(['v2', 'v3', 'v4', 'v5', 'v6', 'v7']);
    expect(focusedValue()).toBe('v7');
  });

  it('extends from the focused item when nothing is anchored, and Shift is plain in single mode', async () => {
    const single = await mountGrid({ selection: 'single' });
    focusItem(single.items[1] as HTMLElement);
    await press('{Shift>}{ArrowRight}{/Shift}');
    expect(single.grid.values).toEqual([]);

    const multiple = await mountGrid({ selection: 'multiple' });
    focusItem(multiple.items[2] as HTMLElement);
    await press('{Shift>}{ArrowRight}{/Shift}');
    expect(multiple.grid.values).toEqual(['v3', 'v4']);
  });

  it('selects every enabled item with Ctrl+A, in multiple mode only', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple', disabled: [2] });
    const changes = listenForChanges(grid);
    focusItem(items[0] as HTMLElement);
    await press('{Control>}a{/Control}');
    expect(grid.values).toEqual(['v1', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);
    expect(changes).toHaveBeenCalledTimes(1);
    await press('{Control>}a{/Control}');
    expect(changes).toHaveBeenCalledTimes(1);

    const single = await mountGrid({ selection: 'single' });
    focusItem(single.items[0] as HTMLElement);
    await press('{Control>}a{/Control}');
    expect(single.grid.values).toEqual([]);
  });

  it('also selects everything with Command+A, which is the same key on a Mac', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple', count: 3 });
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    items[0]?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(grid.values).toEqual(['v1', 'v2', 'v3']);
  });
});

describe('selection by pointer', () => {
  it('selects the clicked item in single mode, and keeps it when clicked again', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    const changes = listenForChanges(grid);
    await userEvent.click(items[1] as HTMLElement);
    expect(grid.values).toEqual(['v2']);
    await userEvent.click(items[1] as HTMLElement);
    await userEvent.click(items[3] as HTMLElement);
    expect(grid.values).toEqual(['v4']);
    expect(items[1]?.selected).toBe(false);
    expect(changes).toHaveBeenCalledTimes(2);
  });

  it('toggles the clicked item in multiple mode, and extends with Shift', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    await userEvent.click(items[1] as HTMLElement);
    await userEvent.click(items[1] as HTMLElement);
    await userEvent.click(items[4] as HTMLElement);
    expect(grid.values).toEqual(['v5']);
    await userEvent.keyboard('{Shift>}');
    await userEvent.click(items[7] as HTMLElement);
    await userEvent.keyboard('{/Shift}');
    expect(grid.values).toEqual(['v5', 'v6', 'v7', 'v8']);
  });

  it('activates on every click, in every mode, and the selection is already up to date', async () => {
    for (const selection of ['none', 'single', 'multiple']) {
      const { grid, items } = await mountGrid({ selection, count: 3 });
      const seen: string[][] = [];
      grid.addEventListener('punk-activate', () => seen.push(grid.values));
      await userEvent.click(items[1] as HTMLElement);
      expect(seen, selection).toHaveLength(1);
      expect(seen[0], selection).toEqual(selection === 'none' ? [] : ['v2']);
    }
  });

  it('does not select by a click when nothing can be selected', async () => {
    const { grid, items } = await mountGrid();
    const changes = listenForChanges(grid);
    await userEvent.click(items[1] as HTMLElement);
    expect(changes).not.toHaveBeenCalled();
    expect(items[1]?.selected).toBe(false);
  });

  it('ignores a disabled item', async () => {
    const { grid, items } = await mountGrid({ selection: 'single', disabled: [2] });
    const activations = listenForActivation(grid);
    const changes = listenForChanges(grid);
    await userEvent.click(items[1] as HTMLElement, { force: true });
    expect(grid.values).toEqual([]);
    expect(activations).not.toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();
  });
});

describe('punk-selection-change', () => {
  it('reports the values and the items, once per change', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    const changes = listenForChanges(grid);
    await userEvent.click(items[2] as HTMLElement);
    await userEvent.click(items[0] as HTMLElement);
    expect(changes).toHaveBeenCalledTimes(2);
    const detail = changes.mock.calls[1]?.[0].detail;
    expect(detail?.values).toEqual(['v1', 'v3']);
    expect(detail?.items).toEqual([items[0], items[2]]);
    const event = changes.mock.calls[0]?.[0];
    expect(event?.bubbles).toBe(true);
    expect(event?.composed).toBe(true);
  });

  it('is not sent for a change the application made', async () => {
    const { grid } = await mountGrid({ selection: 'multiple' });
    const changes = listenForChanges(grid);
    grid.values = ['v2'];
    grid.selection = 'single';
    await settle(grid);
    grid.selection = 'none';
    await settle(grid);
    expect(changes).not.toHaveBeenCalled();
  });

  it('lists items without a value, which values leaves out', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple', valueless: [2] });
    const changes = listenForChanges(grid);
    await userEvent.click(items[1] as HTMLElement);
    await userEvent.click(items[2] as HTMLElement);
    expect(grid.values).toEqual(['v3']);
    expect(changes.mock.calls[1]?.[0].detail.items).toEqual([items[1], items[2]]);
    expect(items[1]?.selected).toBe(true);
  });
});

describe('values', () => {
  it('selects by value and reads back in item order', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    grid.values = ['v5', 'v2'];
    await settle(grid);
    expect(grid.values).toEqual(['v2', 'v5']);
    expect(items.filter((item) => item.selected)).toEqual([items[1], items[4]]);
  });

  it('never changes the array it is given, and returns a copy', async () => {
    const { grid } = await mountGrid({ selection: 'multiple' });
    const given = ['v5', 'v2', 'nothing'];
    grid.values = given;
    await settle(grid);
    expect(given).toEqual(['v5', 'v2', 'nothing']);
    grid.values.push('x');
    given.push('v1');
    await settle(grid);
    expect(grid.values).toEqual(['v2', 'v5']);
  });

  it('ignores values no item has, and disabled items', async () => {
    const { grid } = await mountGrid({ selection: 'multiple', disabled: [3] });
    grid.values = ['v3', 'nope', 'v4'];
    await settle(grid);
    expect(grid.values).toEqual(['v4']);
  });

  it('keeps the first of several in single mode', async () => {
    const { grid } = await mountGrid({ selection: 'single' });
    grid.values = ['v6', 'v2'];
    await settle(grid);
    expect(grid.values).toEqual(['v6']);
  });

  it('can be assigned before the items arrive', async () => {
    const parent = wrapper();
    const grid = document.createElement('punk-slot-grid');
    grid.setAttribute('aria-label', 'Slots');
    grid.setAttribute('selection', 'multiple');
    grid.values = ['v2'];
    expect(grid.values).toEqual(['v2']);
    parent.append(grid);
    await settle(grid);
    const items = [1, 2, 3].map((index) => grid.appendChild(makeItem(index, {})) as Item);
    await settle(grid);
    expect(grid.values).toEqual(['v2']);
    expect(items[1]?.selected).toBe(true);
  });

  it('gives way to the user once they choose', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple' });
    grid.values = ['v2'];
    await settle(grid);
    await userEvent.click(items[4] as HTMLElement);
    expect(grid.values).toEqual(['v2', 'v5']);
    (items[0] as Item).disabled = true;
    await settle(grid);
    expect(grid.values).toEqual(['v2', 'v5']);
  });

  it('puts the selection back if the application sets an item directly', async () => {
    const { grid, items } = await mountGrid({ selection: 'single' });
    (items[2] as Item).selected = true;
    await settle(grid);
    expect(items[2]?.selected).toBe(false);
    expect(grid.values).toEqual([]);
  });

  it('keeps the selection of an item when others are added, and drops it when the item leaves', async () => {
    const { grid, items } = await mountGrid({ selection: 'multiple', count: 3 });
    grid.values = ['v1', 'v3'];
    await settle(grid);
    grid.append(makeItem(9, {}));
    await settle(grid);
    expect(grid.values).toEqual(['v1', 'v3']);
    items[2]?.remove();
    await settle(grid);
    expect(grid.values).toEqual(['v1']);
  });

  it('follows an item whose value changes', async () => {
    const { grid, items } = await mountGrid({ selection: 'single', count: 3 });
    await userEvent.click(items[1] as HTMLElement);
    (items[1] as Item).value = 'renamed';
    await settle(grid);
    expect(grid.values).toEqual([]);
    grid.values = ['renamed'];
    await settle(grid);
    expect(items[1]?.selected).toBe(true);
  });
});

describe('layout', () => {
  const columnsOf = (items: HTMLElement[]) => {
    const top = (items[0] as HTMLElement).getBoundingClientRect().top;
    return items.filter((item) => Math.abs(item.getBoundingClientRect().top - top) < 1).length;
  };

  it('uses as many columns as fit, and no more than `columns`', async () => {
    const wide = await mountGrid({ width: 400, count: 12 });
    expect(columnsOf(wide.items)).toBe(9);
    const capped = await mountGrid({ width: 400, count: 12, columns: 6 });
    expect(columnsOf(capped.items)).toBe(6);
  });

  it('drops columns before it shrinks a slot, down to one', async () => {
    for (const [width, columns] of [
      [150, 3],
      [90, 2],
      [30, 1],
    ] as const) {
      const { items } = await mountGrid({ width, count: 8, columns: 6 });
      expect(columnsOf(items), `${width}px`).toBe(columns);
      for (const item of items) {
        expect(item.getBoundingClientRect().width, `${width}px`).toBeGreaterThanOrEqual(39.5);
      }
    }
  });

  it('uses the slot size and gap properties', async () => {
    const { grid, items } = await mountGrid({ width: 400, count: 6, columns: 3 });
    grid.style.setProperty('--punk-slot-size', '50px');
    grid.style.setProperty('--punk-slot-gap', '10px');
    const [first, second, third] = items.map((item) => item.getBoundingClientRect());
    expect((second as DOMRect).left - (first as DOMRect).left).toBeCloseTo(60, 0);
    expect((third as DOMRect).left - (second as DOMRect).left).toBeCloseTo(60, 0);
    expect(grid.shadowRoot?.querySelector('.grid')?.getBoundingClientRect().width).toBeCloseTo(
      170,
      0,
    );
  });

  it('ignores a columns value that is not a number of at least 1', async () => {
    for (const columns of ['0', '-2', 'many', '']) {
      const { items } = await mountGrid({ width: 400, count: 12, attributes: { columns } });
      expect(columnsOf(items), columns).toBe(9);
    }
  });
});

describe('disabling the grid', () => {
  it('disables every item, removes the tab stop, and gives back what it took', async () => {
    const { grid, items } = await mountGrid({ selection: 'single', disabled: [2] });
    grid.disabled = true;
    await settle(grid);
    expect(grid.getAttribute('aria-disabled')).toBe('true');
    expect(
      items.every((item) => item.disabled && item.getAttribute('aria-disabled') === 'true'),
    ).toBe(true);
    expect(items.some((item) => item.hasAttribute('tabindex'))).toBe(false);

    grid.disabled = false;
    await settle(grid);
    expect(grid.hasAttribute('aria-disabled')).toBe(false);
    expect(items.map((item) => item.disabled)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(tabStops(grid)).toEqual([items[0]]);
  });

  it('disables items that arrive while it is disabled, and frees them when it is enabled', async () => {
    const { grid } = await mountGrid({ count: 2, attributes: { disabled: '' } });
    const added = makeItem(9, {});
    grid.append(added);
    await settle(grid);
    expect(added.disabled).toBe(true);
    grid.disabled = false;
    await settle(grid);
    expect(added.disabled).toBe(false);
  });

  it('frees an item that leaves while the grid is disabled', async () => {
    const { grid, items } = await mountGrid({ count: 2, attributes: { disabled: '' } });
    items[0]?.remove();
    await settle(grid);
    expect(items[0]?.disabled).toBe(false);
  });

  it('does not select or activate by click', async () => {
    const { grid, items } = await mountGrid({ selection: 'single', attributes: { disabled: '' } });
    const changes = listenForChanges(grid);
    const activations = listenForActivation(grid);
    await userEvent.click(items[0] as HTMLElement, { force: true });
    expect(changes).not.toHaveBeenCalled();
    expect(activations).not.toHaveBeenCalled();
  });
});

describe('warnings', () => {
  function spyOnWarnings(): void {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
  const messages = () => warn.mock.calls.map((call) => String(call[0]));

  it('warns once when the grid has no accessible name, and not when it has one', async () => {
    spyOnWarnings();
    const { grid } = await mountGrid({ label: null });
    expect(messages().filter((message) => message.includes('accessible name'))).toHaveLength(1);
    grid.requestUpdate();
    await settle(grid);
    expect(messages().filter((message) => message.includes('accessible name'))).toHaveLength(1);
    warn.mockClear();
    await mountGrid();
    const labelled = await mountGrid({
      label: null,
      attributes: { 'aria-labelledby': 'somewhere' },
    });
    expect(labelled.grid.isConnected).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once for a child that is not an item, and ignores it', async () => {
    spyOnWarnings();
    const { grid, items } = await mountGrid({ selection: 'single', count: 2 });
    warn.mockClear();
    const heading = document.createElement('h3');
    heading.textContent = 'Modules';
    grid.prepend(heading);
    await settle(grid);
    grid.requestUpdate();
    await settle(grid);
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('<h3>');
    expect(messages()[0]).toContain('<punk-slot-grid>');
    expect(heading.hasAttribute('role')).toBe(false);
    expect(items[0]?.getAttribute('role')).toBe('option');
  });

  it('warns once for each value two items share, and keeps the second selectable', async () => {
    spyOnWarnings();
    const { grid, items } = await mountGrid({ selection: 'multiple', count: 3 });
    warn.mockClear();
    (items[1] as Item).value = 'v1';
    await settle(grid);
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('"v1"');
    await userEvent.click(items[1] as HTMLElement);
    await userEvent.click(items[0] as HTMLElement);
    expect(items[0]?.selected && items[1]?.selected).toBe(true);
    expect(grid.values).toEqual(['v1']);
  });

  it('warns once about an item without a value in a grid that selects, and not in one that does not', async () => {
    spyOnWarnings();
    await mountGrid({ selection: 'single', valueless: [1, 2] });
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('value');
    warn.mockClear();
    await mountGrid({ valueless: [1, 2] });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns again if a problem goes away and comes back', async () => {
    spyOnWarnings();
    const { grid } = await mountGrid({ count: 1 });
    const stray = document.createElement('p');
    grid.append(stray);
    await settle(grid);
    stray.remove();
    await settle(grid);
    grid.append(stray);
    await settle(grid);
    expect(messages()).toHaveLength(2);
  });
});
