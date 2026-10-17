// Apart from locale.ts, which needs the DOM, so the pure modules that format can be run by node.

/** Formats a number for `lang`, falling back to the browser's locale if the tag is invalid. */
export function formatNumber(
  value: number,
  lang: string | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  try {
    return new Intl.NumberFormat(lang, options).format(value);
  } catch {
    return new Intl.NumberFormat(undefined, options).format(value);
  }
}

/** Formats a ratio as a whole-number percentage. */
export function formatPercent(ratio: number, lang: string | undefined): string {
  return formatNumber(ratio, lang, { style: 'percent', maximumFractionDigits: 0 });
}
