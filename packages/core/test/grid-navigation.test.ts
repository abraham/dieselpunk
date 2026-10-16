import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextIndex, stepIndex } from '../src/internal/grid-navigation.ts';
import type { Direction, NavItem } from '../src/internal/grid-navigation.ts';

interface Layout {
  columns: number;
  count: number;
  direction?: Direction;
  disabled?: readonly number[];
  size?: number;
  gap?: number;
  /** Added to every item, as a scroll position or a transformed ancestor would. */
  offset?: { x: number; y: number };
  /** Added to the top of every item at the given indexes, as sub-pixel layout does. */
  jitter?: Readonly<Record<number, number>>;
}

/** Items in document order, laid out row by row; in `rtl` each row runs right to left. */
function layout({
  columns,
  count,
  direction = 'ltr',
  disabled = [],
  size = 40,
  gap = 4,
  offset = { x: 0, y: 0 },
  jitter = {},
}: Layout): NavItem[] {
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const slot = direction === 'ltr' ? column : columns - 1 - column;
    const left = offset.x + slot * (size + gap);
    const top = offset.y + row * (size + gap) + (jitter[index] ?? 0);
    return {
      left,
      right: left + size,
      top,
      bottom: top + size,
      disabled: disabled.includes(index),
    };
  });
}

const ltr = { direction: 'ltr' } as const;
const rtl = { direction: 'rtl' } as const;

// A 4-column grid of 10 items:  0 1 2 3 / 4 5 6 7 / 8 9
const grid = layout({ columns: 4, count: 10 });

describe('horizontal arrows', () => {
  it('move to the neighbor in reading order', () => {
    assert.equal(nextIndex('ArrowRight', 5, grid, ltr), 6);
    assert.equal(nextIndex('ArrowLeft', 5, grid, ltr), 4);
  });

  it('continue on the next or previous row, but do not wrap round the grid', () => {
    assert.equal(nextIndex('ArrowRight', 3, grid, ltr), 4);
    assert.equal(nextIndex('ArrowLeft', 4, grid, ltr), 3);
    assert.equal(nextIndex('ArrowRight', 9, grid, ltr), 9);
    assert.equal(nextIndex('ArrowLeft', 0, grid, ltr), 0);
  });

  it('swap in rtl, where the first item of a row is on the right', () => {
    const items = layout({ columns: 4, count: 10, direction: 'rtl' });
    assert.equal(nextIndex('ArrowLeft', 5, items, rtl), 6);
    assert.equal(nextIndex('ArrowRight', 5, items, rtl), 4);
    assert.equal(nextIndex('ArrowRight', 4, items, rtl), 3);
    assert.equal(nextIndex('ArrowLeft', 7, items, rtl), 8);
    assert.equal(nextIndex('ArrowRight', 0, items, rtl), 0);
  });

  it('skip disabled items, including across a row end', () => {
    const items = layout({ columns: 4, count: 10, disabled: [5, 6] });
    assert.equal(nextIndex('ArrowRight', 4, items, ltr), 7);
    assert.equal(nextIndex('ArrowLeft', 7, items, ltr), 4);
    const edge = layout({ columns: 4, count: 10, disabled: [6, 7] });
    assert.equal(nextIndex('ArrowRight', 5, edge, ltr), 8);
    const last = layout({ columns: 4, count: 10, disabled: [8, 9] });
    assert.equal(nextIndex('ArrowRight', 7, last, ltr), 7);
  });

  it('need no rectangles: the step function takes only which items are disabled', () => {
    assert.equal(stepIndex(1, 1, [false, false, false]), 2);
    assert.equal(stepIndex(1, -1, [false, false, false]), 0);
    assert.equal(stepIndex(1, 1, [false, false, true, false]), 3);
    assert.equal(stepIndex(1, -1, [true, false, false]), 1);
    assert.equal(stepIndex(2, 1, [false, false, false]), 2);
    assert.equal(stepIndex(0, -1, []), 0);
    assert.equal(stepIndex(0, 1, []), 0);
  });
});

describe('vertical arrows', () => {
  it('move to the item in the adjacent row at the same horizontal position', () => {
    assert.equal(nextIndex('ArrowDown', 1, grid, ltr), 5);
    assert.equal(nextIndex('ArrowUp', 6, grid, ltr), 2);
  });

  it('stay put at the first and last row', () => {
    assert.equal(nextIndex('ArrowUp', 2, grid, ltr), 2);
    assert.equal(nextIndex('ArrowDown', 9, grid, ltr), 9);
  });

  it('land on the nearest item when the adjacent row is shorter', () => {
    assert.equal(nextIndex('ArrowDown', 7, grid, ltr), 9);
    assert.equal(nextIndex('ArrowDown', 3, grid, ltr), 7);
    assert.equal(nextIndex('ArrowDown', 6, grid, ltr), 9);
  });

  it('pick the earlier item when two are equally near', () => {
    // Item 1 sits between items 4 and 5 of a shifted second row.
    const items: NavItem[] = [
      { left: 0, right: 40, top: 0, bottom: 40, disabled: false },
      { left: 50, right: 90, top: 0, bottom: 40, disabled: false },
      { left: 0, right: 40, top: 44, bottom: 84, disabled: false },
      { left: 100, right: 140, top: 44, bottom: 84, disabled: false },
    ];
    assert.equal(nextIndex('ArrowDown', 1, items, ltr), 2);
  });

  it('work the same in rtl, using visual positions', () => {
    const items = layout({ columns: 4, count: 10, direction: 'rtl' });
    assert.equal(nextIndex('ArrowDown', 1, items, rtl), 5);
    assert.equal(nextIndex('ArrowDown', 7, items, rtl), 9);
  });

  it('skip disabled items and rows with no enabled item', () => {
    const items = layout({ columns: 4, count: 12, disabled: [5, 4, 6, 7] });
    assert.equal(nextIndex('ArrowDown', 1, items, ltr), 9);
    assert.equal(nextIndex('ArrowUp', 9, items, ltr), 1);
    const nearest = layout({ columns: 4, count: 10, disabled: [5] });
    assert.equal(nextIndex('ArrowDown', 1, nearest, ltr), 4);
  });

  it('stay put when every item below is disabled', () => {
    const items = layout({ columns: 4, count: 8, disabled: [4, 5, 6, 7] });
    assert.equal(nextIndex('ArrowDown', 1, items, ltr), 1);
  });
});

describe('Home and End', () => {
  it('go to the first and last item of the row', () => {
    assert.equal(nextIndex('Home', 6, grid, ltr), 4);
    assert.equal(nextIndex('End', 5, grid, ltr), 7);
    assert.equal(nextIndex('End', 8, grid, ltr), 9);
  });

  it('follow document order in rtl', () => {
    const items = layout({ columns: 4, count: 10, direction: 'rtl' });
    assert.equal(nextIndex('Home', 6, items, rtl), 4);
    assert.equal(nextIndex('End', 5, items, rtl), 7);
  });

  it('go to the first and last item of the grid with Ctrl', () => {
    assert.equal(nextIndex('Home', 6, grid, { ...ltr, ctrl: true }), 0);
    assert.equal(nextIndex('End', 5, grid, { ...ltr, ctrl: true }), 9);
  });

  it('skip disabled items at the ends', () => {
    const items = layout({ columns: 4, count: 10, disabled: [4, 7, 0, 9] });
    assert.equal(nextIndex('Home', 5, items, ltr), 5);
    assert.equal(nextIndex('End', 5, items, ltr), 6);
    assert.equal(nextIndex('Home', 5, items, { ...ltr, ctrl: true }), 1);
    assert.equal(nextIndex('End', 5, items, { ...ltr, ctrl: true }), 8);
  });
});

describe('layout independence', () => {
  it('needs no column count, so a re-wrapped grid navigates by its new rows', () => {
    const wide = layout({ columns: 5, count: 10 });
    const narrow = layout({ columns: 3, count: 10 });
    assert.equal(nextIndex('ArrowDown', 1, wide, ltr), 6);
    assert.equal(nextIndex('ArrowDown', 1, narrow, ltr), 4);
    assert.equal(nextIndex('End', 3, narrow, ltr), 5);
  });

  it('treats a single column and a single row', () => {
    const column = layout({ columns: 1, count: 3 });
    assert.equal(nextIndex('ArrowDown', 0, column, ltr), 1);
    assert.equal(nextIndex('ArrowRight', 0, column, ltr), 1);
    const row = layout({ columns: 5, count: 5 });
    assert.equal(nextIndex('ArrowDown', 2, row, ltr), 2);
    assert.equal(nextIndex('End', 0, row, ltr), 4);
  });

  it('is unaffected by a common offset such as scrolling or a parent transform', () => {
    const moved = layout({ columns: 4, count: 10, offset: { x: -1234.5, y: 987.25 } });
    assert.equal(nextIndex('ArrowDown', 1, moved, ltr), 5);
    assert.equal(nextIndex('End', 5, moved, ltr), 7);
  });

  it('keeps items in one row despite sub-pixel differences in their tops', () => {
    const items = layout({ columns: 4, count: 10, jitter: { 1: 0.4, 2: -0.3, 6: 0.5 } });
    assert.equal(nextIndex('ArrowRight', 0, items, ltr), 1);
    assert.equal(nextIndex('End', 4, items, ltr), 7);
    assert.equal(nextIndex('ArrowDown', 2, items, ltr), 6);
  });

  it('works at any scale', () => {
    const zoomed = layout({ columns: 4, count: 10, size: 80, gap: 8 });
    assert.equal(nextIndex('ArrowDown', 1, zoomed, ltr), 5);
  });
});

describe('degenerate input', () => {
  it('returns the start for an empty list or an index outside it', () => {
    assert.equal(nextIndex('ArrowRight', 0, [], ltr), 0);
    assert.equal(nextIndex('ArrowRight', -1, grid, ltr), -1);
    assert.equal(nextIndex('ArrowRight', 99, grid, ltr), 99);
  });

  it('ignores other keys', () => {
    assert.equal(nextIndex('a', 3, grid, ltr), 3);
    assert.equal(nextIndex('PageDown', 3, grid, ltr), 3);
  });

  it('returns the start when every item is disabled', () => {
    const items = layout({ columns: 2, count: 4, disabled: [0, 1, 2, 3] });
    assert.equal(nextIndex('Home', 1, items, { ...ltr, ctrl: true }), 1);
    assert.equal(nextIndex('ArrowDown', 1, items, ltr), 1);
  });
});
