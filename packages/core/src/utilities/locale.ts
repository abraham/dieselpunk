import { serverValues } from '../internal/server-values.ts';

/**
 * The language in effect for `element`: the nearest `lang` attribute on it or an ancestor,
 * following shadow hosts (which `closest()` cannot cross). `lang=""` means unknown, so it stops
 * the search and yields `undefined`, which selects the browser's own locale. On the server only the
 * element's own `lang` is known, and anything else is `en` (specs/ssr.md §3).
 */
export function resolveLang(element: Element): string | undefined {
  if (serverValues()) return element.getAttribute('lang') || 'en';
  let node: Element | null = element;
  while (node) {
    const lang = node.getAttribute('lang');
    if (lang !== null) return lang || undefined;
    node = node.parentElement ?? (node.getRootNode() as Partial<ShadowRoot>).host ?? null;
  }
  return undefined;
}

export { formatNumber, formatPercent } from './number-format.ts';
