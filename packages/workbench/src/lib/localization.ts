import { configureLocalization } from '@lit/localize';
import { loadLocale, locales, sourceLocale, targetLocales } from '@dieselpunk/locales';
import { bindDocumentLocale } from '@dieselpunk/locales/document';

// Lit Localize is configured once for a page, and the workbench page is one: the stories that
// switch the language share this module. `bindDocumentLocale()` puts `lang` and `dir` on <html>.
export const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale,
});

bindDocumentLocale();

export { locales };
