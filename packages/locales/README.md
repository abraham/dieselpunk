# @dieselpunk/locales

Translations of the built-in words in [`@dieselpunk/core`](https://www.npmjs.com/package/@dieselpunk/core), such as the loading announcement and the state words in an accessible name, for [Lit Localize](https://lit.dev/docs/localization/overview/). English needs no setup; this package adds German (`de`), French (`fr`), Spanish (`es`), Japanese (`ja`), and Arabic (`ar`, right to left).

The translations are drafts until a native reader has reviewed them; each carries its status in `locales`.

## Install

```sh
npm install @dieselpunk/core @dieselpunk/locales
```

## Use

Configure Lit Localize once for the page, with the package's loader:

```ts
import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales, loadLocale } from '@dieselpunk/locales';
import { bindDocumentLocale } from '@dieselpunk/locales/document';

export const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale,
});

bindDocumentLocale();
await setLocale('de');
```

- `loadLocale` imports each language with its own dynamic `import()`, so a bundler gives each its own chunk and a page fetches only the ones it uses.
- `bindDocumentLocale()` sets `lang` and `dir` on `<html>` when a locale is ready, and returns the function that stops it.
- `mergeLocaleModules()` combines the library's messages with an application's own; a later module wins an id that both have.
- The application and the library must resolve one copy of `@lit/localize`, since the configuration is module state.

Components already on the page update when the locale is ready. The [Localization guide](https://dieselpunk.dev/?path=/docs/guides-localization--docs) has every message, its English, and how to write a translation.

## License

[MIT](LICENSE)
