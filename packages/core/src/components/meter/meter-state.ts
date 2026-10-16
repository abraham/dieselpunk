export type MeterState = 'none' | 'optimal' | 'suboptimal' | 'critical';

export type MeterProblem =
  'range' | 'value' | 'value-range' | 'low' | 'high' | 'optimum' | 'bounds' | 'segments';

export interface MeterInput {
  value: number;
  min: number;
  max: number;
  low?: number | undefined;
  high?: number | undefined;
  optimum?: number | undefined;
  segments: number;
}

export interface ResolvedMeter {
  min: number;
  max: number;
  value: number;
  /** Where `value` sits between `min` and `max`, from 0 to 1. */
  ratio: number;
  segments: number;
  /** How many segments are lit. */
  lit: number;
  state: MeterState;
  problems: MeterProblem[];
}

export const DEFAULT_SEGMENTS = 10;
const MIN_SEGMENTS = 2;
const MAX_SEGMENTS = 100;

type Region = 'low' | 'mid' | 'high';

/**
 * Turns the properties of a meter into what is drawn and announced: clamped values, the state
 * from the HTML `<meter>` algorithm, and the number of lit segments. Bad input is repaired, and
 * each repair is listed in `problems`. It has no DOM, so it can be tested alone.
 */
export function resolveMeter(input: MeterInput): ResolvedMeter {
  const problems = new Set<MeterProblem>();

  let { min, max } = input;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    problems.add('range');
    min = 0;
    max = 100;
  }
  const clamp = (number: number) => Math.min(Math.max(number, min), max);

  let value: number;
  if (Number.isFinite(input.value)) {
    value = clamp(input.value);
    if (value !== input.value) problems.add('value-range');
  } else {
    problems.add('value');
    value = min;
  }

  const boundary = (name: 'low' | 'high' | 'optimum', raw: number | undefined) => {
    if (raw === undefined) return undefined;
    if (!Number.isFinite(raw)) {
      problems.add(name);
      return undefined;
    }
    const clamped = clamp(raw);
    if (clamped !== raw) problems.add(name);
    return clamped;
  };
  const givenLow = boundary('low', input.low);
  const givenHigh = boundary('high', input.high);
  const givenOptimum = boundary('optimum', input.optimum);

  const low = givenLow ?? min;
  let high = givenHigh ?? max;
  if (high < low) {
    problems.add('bounds');
    high = low;
  }
  const optimum = givenOptimum ?? (min + max) / 2;

  const regionOf = (number: number): Region =>
    number < low ? 'low' : number > high ? 'high' : 'mid';
  const here = regionOf(value);
  const best = regionOf(optimum);
  const given = givenLow !== undefined || givenHigh !== undefined || givenOptimum !== undefined;
  let state: MeterState = 'none';
  if (given) {
    // The region holding the optimum is optimal, its neighbors are not as good, and the far one is worst.
    if (here === best) state = 'optimal';
    else if (here === 'mid' || best === 'mid') state = 'suboptimal';
    else state = 'critical';
  }

  const asked = Number.isFinite(input.segments) ? Math.round(input.segments) : DEFAULT_SEGMENTS;
  const segments = Math.min(Math.max(asked, MIN_SEGMENTS), MAX_SEGMENTS);
  if (segments !== input.segments) problems.add('segments');

  const ratio = (value - min) / (max - min);
  // Some light once there is any value, and every segment only at the maximum.
  const lit =
    ratio <= 0
      ? 0
      : ratio >= 1
        ? segments
        : Math.min(Math.max(Math.round(ratio * segments), 1), segments - 1);

  return { min, max, value, ratio, segments, lit, state, problems: [...problems] };
}
