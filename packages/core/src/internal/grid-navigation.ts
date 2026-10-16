export type Direction = 'ltr' | 'rtl';

/** An item's box in any one coordinate space; only comparisons between items matter. */
export interface NavItem {
  left: number;
  right: number;
  top: number;
  bottom: number;
  disabled: boolean;
}

export interface NavOptions {
  direction: Direction;
  /** `Ctrl+Home` and `Ctrl+End` move to the first and last item of the whole grid. */
  ctrl?: boolean;
}

/**
 * Rows are runs of items, in document order, that start within half an item height of the
 * run's first item. The column count never has to be known, so a grid that re-wraps on resize
 * needs no bookkeeping, and a common offset or scale cancels out.
 */
function rowsOf(items: readonly NavItem[]): number[] {
  const rows: number[] = [];
  let row = -1;
  let rowTop = 0;
  items.forEach((item, index) => {
    if (index === 0 || item.top - rowTop >= (item.bottom - item.top) / 2) {
      row++;
      rowTop = item.top;
    }
    rows.push(row);
  });
  return rows;
}

/**
 * The next enabled index from `from` in document order (`step` 1) or against it (`step` -1), or
 * `from` when there is none. It needs no layout, only which items are disabled.
 */
export function stepIndex(from: number, step: 1 | -1, disabled: readonly boolean[]): number {
  for (let i = from + step; i >= 0 && i < disabled.length; i += step) {
    if (disabled[i] === false) return i;
  }
  return from;
}

/**
 * The index to focus after `key`, or `from` when there is nowhere to go. Nothing wraps from the
 * last item to the first, and disabled items are skipped. Horizontal arrows follow reading order,
 * so at the end of a row they continue on the next one, and they swap in `rtl`. `Home` and `End`
 * follow document order, so in `rtl` `Home` is the row's visually rightmost item.
 */
export function nextIndex(
  key: string,
  from: number,
  items: readonly NavItem[],
  { direction, ctrl = false }: NavOptions,
): number {
  const current = items[from];
  if (!current) return from;
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const forward = (key === 'ArrowRight') === (direction === 'ltr');
    return stepIndex(
      from,
      forward ? 1 : -1,
      items.map((item) => item.disabled),
    );
  }
  const rows = rowsOf(items);
  const enabled = (index: number): boolean => items[index]?.disabled === false;
  const indexes = items.map((_, index) => index);

  switch (key) {
    case 'ArrowUp':
    case 'ArrowDown': {
      const step = key === 'ArrowDown' ? 1 : -1;
      const center = (current.left + current.right) / 2;
      for (let row = (rows[from] ?? 0) + step; row >= 0 && row <= (rows.at(-1) ?? 0); row += step) {
        const candidates = indexes.filter((i) => rows[i] === row && enabled(i));
        if (candidates.length === 0) continue;
        const distance = (i: number): number => {
          const item = items[i] as NavItem;
          return Math.abs((item.left + item.right) / 2 - center);
        };
        // Strictly closer wins, so a tie goes to the earlier item.
        return candidates.reduce((best, i) => (distance(i) < distance(best) ? i : best));
      }
      return from;
    }
    case 'Home':
    case 'End': {
      const scope = indexes.filter((i) => enabled(i) && (ctrl || rows[i] === rows[from]));
      const target = key === 'Home' ? scope[0] : scope.at(-1);
      return target ?? from;
    }
    default:
      return from;
  }
}
