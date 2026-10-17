import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from './helpers.ts';
import './commands.ts';
import '../../src/components/slot-grid/register.ts';
import '../../src/components/item-stack/register.ts';
import '../../src/components/slot/register.ts';
import type { PunkItemStack } from '../../src/components/item-stack/index.ts';
import type { PunkSlotGrid } from '../../src/components/slot-grid/index.ts';

// specs/performance.md §4 asks for a responsive 100-slot grid. Frame times on a CI runner are too noisy to
// assert, so this checks what keeps a grid fast: how much work each interaction does.

const ITEMS = 100;
const art =
  '<svg slot="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeStack(index: number): PunkItemStack {
  const stack = document.createElement('punk-item-stack');
  stack.setAttribute('name', `Item ${index}`);
  stack.setAttribute('value', `v${index}`);
  stack.setAttribute('count', String(index));
  stack.innerHTML = art;
  return stack;
}

async function settle(grid: PunkSlotGrid): Promise<void> {
  await grid.updateComplete;
  for (let round = 0; round < 2; round++) {
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all([...grid.children].map((child) => (child as PunkItemStack).updateComplete));
  }
}

async function mountGrid(count = ITEMS, selection = 'multiple') {
  const parent = track(document.createElement('div'));
  parent.style.inlineSize = '600px';
  const grid = document.createElement('punk-slot-grid');
  grid.setAttribute('aria-label', 'Inventory');
  grid.setAttribute('selection', selection);
  grid.setAttribute('columns', '10');
  const items = Array.from({ length: count }, (_, index) => grid.appendChild(makeStack(index + 1)));
  parent.append(grid);
  await settle(grid);
  return { grid, items: items as PunkItemStack[] };
}

function focusItem(item: HTMLElement): void {
  if (!document.hasFocus()) window.focus();
  item.focus();
}

describe('a grid of 100 item stacks', () => {
  it('renders, and says how long it took', async () => {
    const start = performance.now();
    const { grid } = await mountGrid();
    const elapsed = performance.now() - start;
    console.info(
      `punk-slot-grid: ${ITEMS} item stacks adopted and rendered in ${elapsed.toFixed(0)} ms`,
    );
    expect(grid.children).toHaveLength(ITEMS);
  });

  it('puts the same few listeners on the grid however many items it has, and none on the items', async () => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const listenersOn = (target: EventTarget) =>
      add.mock.contexts.filter((context) => context === target).length;

    const alone = makeStack(0);
    const baseline = listenersOn(alone);
    const small = await mountGrid(10);
    const large = await mountGrid(ITEMS);

    expect(listenersOn(small.grid)).toBe(listenersOn(large.grid));
    expect(listenersOn(large.grid)).toBeLessThanOrEqual(5);
    for (const item of large.items) expect(listenersOn(item)).toBe(baseline);
  });

  it('creates no observers', async () => {
    const created: string[] = [];
    for (const name of ['ResizeObserver', 'IntersectionObserver', 'MutationObserver'] as const) {
      const Original = globalThis[name] as new (...args: never[]) => object;
      vi.stubGlobal(
        name,
        class extends Original {
          constructor(...args: never[]) {
            super(...args);
            created.push(name);
          }
        },
      );
    }
    const { items } = await mountGrid();
    focusItem(items[0] as HTMLElement);
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Home}{ }');
    await userEvent.click(items[20] as HTMLElement);
    expect(created).toEqual([]);
  });

  it('reads no layout for a horizontal key, and each item once for a vertical one', async () => {
    const { items } = await mountGrid();
    focusItem(items[0] as HTMLElement);
    const read = vi.spyOn(Element.prototype, 'getBoundingClientRect');

    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');
    expect(read).not.toHaveBeenCalled();

    await userEvent.keyboard('{ArrowDown}');
    expect(read).toHaveBeenCalledTimes(ITEMS);
    expect(document.activeElement).toBe(items[11]);

    read.mockClear();
    await userEvent.keyboard('{Space}{Shift>}{ArrowRight}{/Shift}');
    expect(read).not.toHaveBeenCalled();
  });

  it('changes the tab stop of two items for each key press, and no others', async () => {
    const { grid, items } = await mountGrid();
    focusItem(items[0] as HTMLElement);
    let changes = 0;
    const observer = new MutationObserver((records) => {
      changes += records.length;
    });
    observer.observe(grid, { subtree: true, attributes: true, attributeFilter: ['tabindex'] });
    try {
      for (let press = 0; press < 25; press++) {
        const before = changes;
        await userEvent.keyboard('{ArrowRight}');
        await new Promise((resolve) => setTimeout(resolve));
        expect(changes - before, `press ${press + 1}`).toBe(2);
      }
    } finally {
      observer.disconnect();
    }
    expect(items.filter((item) => item.getAttribute('tabindex') === '0')).toEqual([items[25]]);
  });

  it('updates only the item whose selection changed', async () => {
    const { grid, items } = await mountGrid();
    const updated = new Set<unknown>();
    const original = (items[0] as unknown as { update(changed: unknown): void }).update;
    const spy = vi
      .spyOn(Object.getPrototypeOf(items[0]) as { update(changed: unknown): void }, 'update')
      .mockImplementation(function (this: unknown, changed: unknown) {
        updated.add(this);
        return original.call(this, changed);
      });

    await userEvent.click(items[49] as HTMLElement);
    await settle(grid);
    expect([...updated]).toEqual([items[49]]);

    updated.clear();
    grid.values = ['v1', 'v2'];
    await settle(grid);
    expect([...updated].sort()).toEqual([items[0], items[1], items[49]].sort());
    spy.mockRestore();
  });

  it('updates only the two items involved when a single selection moves', async () => {
    const { grid, items } = await mountGrid(ITEMS, 'single');
    await userEvent.click(items[10] as HTMLElement);
    await settle(grid);
    const updated = new Set<unknown>();
    const original = (items[0] as unknown as { update(changed: unknown): void }).update;
    vi.spyOn(
      Object.getPrototypeOf(items[0]) as { update(changed: unknown): void },
      'update',
    ).mockImplementation(function (this: unknown, changed: unknown) {
      updated.add(this);
      return original.call(this, changed);
    });
    await userEvent.click(items[70] as HTMLElement);
    await settle(grid);
    expect(updated.size).toBe(2);
    expect(updated.has(items[10])).toBe(true);
    expect(updated.has(items[70])).toBe(true);
  });
});
