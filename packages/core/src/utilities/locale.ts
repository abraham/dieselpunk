/**
 * The language in effect for `element`: the nearest `lang` attribute on it or an ancestor,
 * following shadow hosts (which `closest()` cannot cross). `lang=""` means unknown, so it stops
 * the search and yields `undefined`, which selects the browser's own locale.
 */
export function resolveLang(element: Element): string | undefined {
  let node: Element | null = element;
  while (node) {
    const lang = node.getAttribute('lang');
    if (lang !== null) return lang || undefined;
    node = node.parentElement ?? (node.getRootNode() as Partial<ShadowRoot>).host ?? null;
  }
  return undefined;
}

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
