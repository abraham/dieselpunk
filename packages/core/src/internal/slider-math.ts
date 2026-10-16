export interface SliderRange {
  min: number;
  max: number;
  step: number;
}

export interface NormalizedRange extends SliderRange {
  /** Whether the input was not usable and 0 to 100 (or a step of 1) was put in its place. */
  repaired: boolean;
}

/** How many decimal places `value` is written with, so `0.1 + 0.2` can be cut back to `0.3`. */
export function decimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(value);
  const exponent = /e-(\d+)$/.exec(text);
  const fraction = /\.(\d+)/.exec(text)?.[1]?.length ?? 0;
  return exponent ? Number(exponent[1]) + fraction : fraction;
}

/** An inverted or non-finite range becomes 0 to 100, and a step that is not above 0 becomes 1. */
export function normalizeRange(range: SliderRange): NormalizedRange {
  const { min, max, step } = range;
  const usable = Number.isFinite(min) && Number.isFinite(max) && max >= min;
  const stepUsable = Number.isFinite(step) && step > 0;
  return {
    min: usable ? min : 0,
    max: usable ? max : 100,
    step: stepUsable ? step : 1,
    repaired: !usable || !stepUsable,
  };
}

const round = (value: number, places: number): number =>
  Number(value.toFixed(Math.min(places, 100)));

/**
 * The value allowed nearest `value`: inside the range, and a whole number of steps from `min`
 * (ties go up), the way a native range does it. A `max` that is not a whole number of steps from
 * `min` is never reached, and the last allowed value below it is.
 */
export function snapValue(value: number, range: SliderRange): number {
  const { min, max, step } = range;
  const places = Math.max(decimals(step), decimals(min));
  if (!Number.isFinite(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  const largest = Math.floor(round((max - min) / step, 10));
  return round(min + Math.min(steps, largest) * step, places);
}

/** Where `value` is in the range, from 0 to 1. A range with no width is at 0. */
export function ratioOf(value: number, range: SliderRange): number {
  const width = range.max - range.min;
  if (!(width > 0)) return 0;
  return Math.min(1, Math.max(0, (value - range.min) / width));
}

/**
 * The value under the pointer. `left` and `width` are the track's, read once when the press began,
 * and `rtl` puts the start of the range on the right.
 */
export function valueFromPointer(
  clientX: number,
  track: { left: number; width: number },
  range: SliderRange,
  rtl: boolean,
): number {
  if (!(track.width > 0)) return snapValue(range.min, range);
  const along = Math.min(1, Math.max(0, (clientX - track.left) / track.width));
  const ratio = rtl ? 1 - along : along;
  return snapValue(range.min + ratio * (range.max - range.min), range);
}

/**
 * The value a key leads to, or `null` for a key the slider does not handle. At an end the key
 * still returns the value it is at, so the page does not scroll. In `rtl` the end of the range is
 * on the left, so Left and Right swap; Up and Down do not.
 */
export function keyToValue(
  key: string,
  current: number,
  range: SliderRange,
  rtl: boolean,
): number | null {
  const { min, max, step } = range;
  const places = Math.max(decimals(step), decimals(min));
  const page = Math.max(step, round(Math.round(((max - min) * 0.1) / step) * step, places));
  const increase = rtl ? 'ArrowLeft' : 'ArrowRight';
  const decrease = rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case increase:
    case 'ArrowUp':
      return snapValue(current + step, range);
    case decrease:
    case 'ArrowDown':
      return snapValue(current - step, range);
    case 'PageUp':
      return snapValue(current + page, range);
    case 'PageDown':
      return snapValue(current - page, range);
    case 'Home':
      return snapValue(min, range);
    case 'End':
      return snapValue(max, range);
    default:
      return null;
  }
}

/**
 * The positions of the tick marks, from 0 to 1: one at every step when there are 20 steps or
 * fewer, and otherwise one at every `ceil(steps / 20)` steps.
 */
export function tickRatios(range: SliderRange): number[] {
  const width = range.max - range.min;
  if (!(width > 0)) return [];
  const steps = Math.floor(round(width / range.step, 10));
  const stride = steps <= 20 ? 1 : Math.ceil(steps / 20);
  const ratios: number[] = [];
  for (let index = 0; index <= steps; index += stride) ratios.push((index * range.step) / width);
  return ratios;
}

/** `value` for people, in the language of the page; an unknown language falls back to the default. */
export function formatValue(value: number, lang: string): string {
  try {
    return new Intl.NumberFormat(lang || undefined).format(value);
  } catch {
    return new Intl.NumberFormat().format(value);
  }
}
