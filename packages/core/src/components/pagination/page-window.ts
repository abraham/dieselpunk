export type PageEntry = number | 'gap';

/**
 * The pages a pagination shows: the first and last, the current one with `siblings` on each side,
 * and a gap for each run that is left out. A gap never stands for a single page, which is shown
 * instead, since the gap would take as much room. Expects `1 <= page <= pages` and `siblings >= 0`.
 */
export function pageWindow(page: number, pages: number, siblings: number): PageEntry[] {
  const shown = new Set<number>([1, pages]);
  for (let at = page - siblings; at <= page + siblings; at++) {
    if (at >= 1 && at <= pages) shown.add(at);
  }
  const sorted = [...shown].sort((a, b) => a - b);
  const entries: PageEntry[] = [];
  let previous = 0;
  for (const at of sorted) {
    if (at - previous === 2) entries.push(at - 1);
    else if (at - previous > 2) entries.push('gap');
    entries.push(at);
    previous = at;
  }
  return entries;
}
