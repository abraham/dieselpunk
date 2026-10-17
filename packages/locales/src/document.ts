import { locales } from './locales.ts';

interface StatusDetail {
  status: string;
  readyLocale?: string;
}

/**
 * Sets `lang` on `root`, and `dir` where the locale is a known one, each time a locale becomes
 * ready. Returns the function that removes the listener.
 */
export function bindDocumentLocale(root: HTMLElement = document.documentElement): () => void {
  const onStatus = (event: Event): void => {
    const { status, readyLocale } = (event as CustomEvent<StatusDetail>).detail;
    if (status !== 'ready' || !readyLocale) return;
    root.lang = readyLocale;
    const known = locales.find((locale) => locale.code === readyLocale);
    if (known) root.dir = known.dir;
  };
  window.addEventListener('lit-localize-status', onStatus);
  return () => window.removeEventListener('lit-localize-status', onStatus);
}
