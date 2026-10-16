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

export { formatNumber, formatPercent } from './number-format.ts';
