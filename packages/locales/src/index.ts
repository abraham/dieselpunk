import type { LocaleModule } from '@lit/localize/internal/types.js';

export { sourceLocale, targetLocales } from './generated/locale-codes.ts';
export { locales } from './locales.ts';
export type { LocaleInfo, LocaleStatus } from './locales.ts';
export type { LocaleModule };

// Each import is a literal, so a bundler gives each language its own chunk.
const modules: Record<string, () => Promise<LocaleModule>> = {
  de: () => import('./de.ts'),
  fr: () => import('./fr.ts'),
  es: () => import('./es.ts'),
  ja: () => import('./ja.ts'),
  ar: () => import('./ar.ts'),
};

/** The translations for a target locale. Rejects for any other code, English included. */
export function loadLocale(code: string): Promise<LocaleModule> {
  const load = Object.hasOwn(modules, code) ? modules[code] : undefined;
  return load
    ? load()
    : Promise.reject(
        new Error(`No translations for "${code}". Known: ${Object.keys(modules).join(', ')}.`),
      );
}

/** One module from several, a later one winning an id that they share. */
export async function mergeLocaleModules(
  ...modules: Array<LocaleModule | Promise<LocaleModule>>
): Promise<LocaleModule> {
  const loaded = await Promise.all(modules);
  return { templates: Object.assign({}, ...loaded.map((module) => module.templates)) };
}
