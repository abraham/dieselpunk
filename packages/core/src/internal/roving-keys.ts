export type RovingOrientation = 'horizontal' | 'vertical';

/**
 * The index a roving key moves to, never wrapping: arrows step to the next enabled item in
 * reading order (swapped in `rtl`), `Home` and `End` go to the first and last enabled one.
 * It returns `from` when there is nowhere to go, or when the key is not one it handles.
 */
export function nextRovingIndex(
  key: string,
  from: number,
  disabled: readonly boolean[],
  options: { orientation: RovingOrientation; rtl: boolean },
): number {
  const { orientation, rtl } = options;
  const forward = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';

  const scan = (start: number, step: 1 | -1): number => {
    for (let index = start; index >= 0 && index < disabled.length; index += step) {
      if (!disabled[index]) return index;
    }
    return from;
  };

  if (key === 'Home') return scan(0, 1);
  if (key === 'End') return scan(disabled.length - 1, -1);
  if (key === forward) return scan(from + 1, 1);
  if (key === backward) return scan(from - 1, -1);
  return from;
}
