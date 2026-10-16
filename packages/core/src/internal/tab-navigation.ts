import { nextRovingIndex } from './roving-keys.ts';
import type { RovingOrientation } from './roving-keys.ts';

export type TabActivation = 'auto' | 'manual';

export interface TabKeyResult {
  /** The tab that takes focus. */
  focus: number;
  /** The tab to select, or `null` when the key only moves focus. */
  select: number | null;
}

/**
 * What a key does on a tab list, or `null` when the key is not one the list handles. An arrow,
 * `Home`, or `End` moves focus without wrapping, and in `auto` activation selects what it reaches;
 * at an end it still counts as handled so the page does not scroll. `Enter` and `Space` select the
 * focused tab in `manual` activation.
 */
export function navigateTabs(
  key: string,
  from: number,
  selected: number,
  disabled: readonly boolean[],
  options: { orientation: RovingOrientation; rtl: boolean; activation: TabActivation },
): TabKeyResult | null {
  const { orientation, rtl, activation } = options;
  const forward = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';

  if (key === 'Enter' || key === ' ') {
    if (activation !== 'manual' || from === selected || disabled[from]) return null;
    return { focus: from, select: from };
  }
  if (key !== 'Home' && key !== 'End' && key !== forward && key !== backward) return null;

  const to = nextRovingIndex(key, from, disabled, { orientation, rtl });
  return { focus: to, select: activation === 'auto' && to !== from ? to : null };
}

/**
 * The tab to have selected: `preferred` if it is enabled, else the nearest enabled one, looking
 * forward before back at equal distance. A `preferred` of -1 or past the end counts as the first
 * tab. Returns -1 when every tab is disabled.
 */
export function resolveSelection(disabled: readonly boolean[], preferred: number): number {
  const start = preferred >= 0 && preferred < disabled.length ? preferred : 0;
  for (let distance = 0; distance < disabled.length; distance++) {
    for (const index of [start + distance, start - distance]) {
      if (index >= 0 && index < disabled.length && !disabled[index]) return index;
    }
  }
  return -1;
}
