import { formatNumber } from '../utilities/number-format.ts';

export type ProductionTrend = 'up' | 'down' | 'flat';

export interface StatInput {
  value: number | undefined;
  decimals?: number | undefined;
  compact?: boolean;
  trend?: string | undefined;
  delta?: number | undefined;
  deltaPercent?: boolean;
}

export interface ResolvedStat {
  /** What is shown: abbreviated when `compact` is set. */
  valueText: string;
  /** The unabridged number, or '' when there is no value. */
  fullValueText: string;
  trend: ProductionTrend | undefined;
  /** The signed change, or '' when there is none. */
  deltaText: string;
  /** What was ignored or clamped, for the development warnings. */
  repairs: string[];
}

const TRENDS: readonly string[] = ['up', 'down', 'flat'];
const MAX_DECIMALS = 6;
/** What `Intl.NumberFormat` shows when it is given no digits. */
const DEFAULT_DECIMALS = 3;
const DEFAULT_PERCENT_DECIMALS = 1;

const isUsable = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function resolveDecimals(decimals: number | undefined, repairs: string[]): number | undefined {
  if (decimals === undefined) return undefined;
  if (!Number.isFinite(decimals)) {
    repairs.push('`decimals` is not a finite number; using the default.');
    return undefined;
  }
  const whole = Math.round(decimals);
  if (whole !== decimals)
    repairs.push(`\`decimals\` is ${decimals}; using the whole number ${whole}.`);
  const clamped = Math.min(Math.max(whole, 0), MAX_DECIMALS);
  if (clamped !== whole) repairs.push(`\`decimals\` is ${whole}; using ${clamped}.`);
  return clamped;
}

/** Rounds to `digits` places, so a change that shows as zero can be told from one that does not. */
const roundsToZero = (value: number, digits: number): boolean =>
  Math.round(value * 10 ** digits) === 0;

/** What a production stat draws and says for a value, a change, and a language. */
export function resolveStat(input: StatInput, lang: string | undefined): ResolvedStat {
  const repairs: string[] = [];
  const decimals = resolveDecimals(input.decimals, repairs);

  let valueText = '';
  let fullValueText = '';
  if (input.value !== undefined) {
    if (isUsable(input.value)) {
      const digits =
        decimals === undefined
          ? {}
          : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
      fullValueText = formatNumber(input.value, lang, digits);
      valueText = input.compact
        ? formatNumber(input.value, lang, {
            notation: 'compact',
            ...(decimals === undefined ? {} : { maximumFractionDigits: decimals }),
          })
        : fullValueText;
    } else {
      repairs.push('`value` is not a finite number; showing no value.');
    }
  }

  let deltaText = '';
  let derived: ProductionTrend | undefined;
  if (input.delta !== undefined) {
    if (isUsable(input.delta)) {
      const percent = input.deltaPercent === true;
      const shown = percent
        ? (decimals ?? DEFAULT_PERCENT_DECIMALS)
        : (decimals ?? DEFAULT_DECIMALS);
      deltaText = formatNumber(input.delta, lang, {
        signDisplay: 'exceptZero',
        ...(percent
          ? { style: 'percent', maximumFractionDigits: shown }
          : decimals === undefined
            ? {}
            : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
      });
      const scaled = percent ? input.delta * 100 : input.delta;
      derived = roundsToZero(scaled, shown) ? 'flat' : scaled > 0 ? 'up' : 'down';
    } else {
      repairs.push('`delta` is not a finite number; showing no change.');
    }
  }

  let trend: ProductionTrend | undefined = derived;
  if (input.trend !== undefined && input.trend !== '') {
    if (TRENDS.includes(input.trend)) trend = input.trend as ProductionTrend;
    else repairs.push(`\`trend\` is "${input.trend}"; use up, down, or flat.`);
  }

  return { valueText, fullValueText, trend, deltaText, repairs };
}
