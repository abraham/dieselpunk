# Localization

**Scope:** the words components render, how they change language at run time, the translations package and its gates, and how numbers, units, and writing direction follow the page.
**Code:** `packages/core/src/internal/localize.ts`, `locale-watch.ts`, `src/utilities/locale.ts`, `number-format.ts`, `scripts/build-pseudo.ts`; `packages/testing/src/pseudo.ts`, `xliff.ts`; `packages/locales/` (all of it).

## 1. Model

- **Lit Localize in runtime mode.** Components render their words with `msg()`. Core's English is the source locale and lives beside each component. Translations are XLIFF files in `@dieselpunk/locales`, built into runtime locale modules. An application switches language with `setLocale()`, and mounted components re-render.
- **Why runtime mode:** transform mode builds one bundle per locale and needs a reload, and a library's messages in `node_modules` cannot take part in an application's transform build.
- **No setup required.** Without `configureLocalization()`, `msg()` returns English, so the library works with no configuration.
- **What is not localized:** application text (labels, names, units, slotted content), which the application translates; and the browser's native validation messages, which follow the browser's language.

## 2. Messages

- Core imports `msg`, `str`, and the status event name from the modules that define them, through `internal/localize.ts`, not from the `@lit/localize` entry. **Why:** the entry also loads the runtime and decorators, whose top-level effects would add about 1.7 kB to every component.
- Every `msg()` call has an explicit `id` and a `desc`, both string literals. The id is stable: rewording the English keeps the id, and a change of meaning gets a new id, because extraction keeps a unit's old translation under its id.
- Values are written with `str` and become XLIFF placeholders (`<x equiv-text="${count}"/>`). No message uses `html`; the words are text.
- No plural or select syntax. Messages are worded so a number does not attach to a noun that inflects ("can craft ${count}", not "${count} item(s)").
- `msg()` is called in `render()` only: never at module load, in a static field, or in a constructor.
- The message ids and English text are listed, with descriptions and German, by the Localization guide, which reads the XLIFF at build time ([workbench.md §4](workbench.md)).

## 3. Locale changes

`LocaleWatcher` is a reactive controller added by every component whose render calls `msg()`, and by no other.

- The first watcher adds one `lit-localize-status` listener to `window`; it is kept for the life of the page, so there is one however many components come and go.
- On a `ready` status the listener increments an epoch and calls `requestUpdate()` on every connected host in its set: each re-renders once, in the same task. `loading` and `error` change nothing.
- A host joins the set when it connects and leaves when it disconnects. A host that reconnects after a change it missed (it compares the epoch) renders once; a host that connects later renders in the active locale anyway, since `msg()` reads it when it runs.
- No observer, and nothing held for a disconnected host.

**Why** not `@localized()` or `updateWhenLocaleChanges()`: each adds a `window` listener per instance, which the listener gates forbid ([performance.md §3](performance.md)).

## 4. Configuration

- The application configures Lit Localize once per page, with the locales package's `sourceLocale`, `targetLocales`, and `loadLocale` (or a merged loader).
- The application's own components use `@localized()` as Lit documents.
- Core and the application resolve **one copy** of `@lit/localize`, since the configuration is module state. Two copies leave the library in English with no error; the guide tells applications to check `npm ls @lit/localize`, and the consumer check fails on two.
- One message locale per page. Mixed-language subtrees get one message set; numbers and layout still follow each subtree's `lang` and `dir` (§7).

## 5. The locales package

`@dieselpunk/locales` has `sideEffects: false`, no runtime dependency, and peer dependencies on `@dieselpunk/core` and `@lit/localize`. It registers no element.

| Entry                        | Exports                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.`                          | `sourceLocale` (`'en'`), `targetLocales`, `locales` (each `code`, `name`, `dir`, `status`), `loadLocale(code)`, `mergeLocaleModules(...modules)` |
| `de`, `fr`, `es`, `ja`, `ar` | That language's runtime module (`templates`)                                                                                                     |
| `document`                   | `bindDocumentLocale(root = document.documentElement)`                                                                                            |

- `loadLocale` imports each language with a literal dynamic `import()`, so each is its own chunk and an application fetches only what it uses. A code outside `targetLocales` rejects, including inherited names such as `toString`. English has no module.
- `mergeLocaleModules` combines modules (or promises of them); a later module wins a shared id, and no input is mutated. It is how an application adds its own messages to the library's.
- `bindDocumentLocale` adds one `lit-localize-status` listener and, on `ready`, sets `lang` and `dir` from `locales`; it returns a function that removes the listener. English is in `locales` so a page can return to left to right.
- `targetLocales` and the codes come from `lit-localize.json`, the one list.
- **Status.** Each locale is `draft` or `reviewed`. A draft is complete and passes every gate but has not been read by a native speaker. Marking it `reviewed` names the reviewer at the top of its XLIFF. A locale that cannot be reviewed before a release is shipped as `draft` or removed (its entry and its XLIFF), by the owner's decision.

## 6. Translation workflow and gates

- `packages/locales/lit-localize.json` points extraction at core's sources and writes one XLIFF per target locale into `xliff/`, with each description as a `<note>`. The XLIFF files are the committed source of the translations; translators receive them, and a returned file overwrites the original.
- `npm run build` in the package runs `lit-localize build` into `src/generated/` (not committed), then `tsc`, then `check:locales`.
- **`check:strings`** runs extraction and fails if any XLIFF changes, so a message added, removed, or reworded without the files following fails CI. It also fails on a unit with a hash-style id or no `<note>`, and, reading core's source with the TypeScript compiler API, on a `msg()` call whose `id` or `desc` is not a string literal (extraction would keep an old note silently).
- **`check:locales`** fails, for any target locale, on: a missing, empty, or blank target; unit ids that differ from the source's; a `target-language` that is not the file's locale; placeholders that differ from the source's as a set; leading or trailing whitespace; a control character or a bidirectional override or isolate (U+202A to U+202E, U+2066 to U+2069); a code that is not canonical BCP 47; a locale without an XLIFF; a status other than `draft` or `reviewed`; and a `dir` that disagrees with `Intl.Locale(code).getTextInfo()`.
- **Rules for translators,** repeated in the Localization guide: read the note; translate the meaning, not the words; keep every placeholder exactly and never split one; write "invalid" as a word correct before a colon (CSS capitalizes it where the language has capitals); keep the move-mode instructions as one sentence; prefer forms that need no plural.

## 7. Numbers, units, and direction

- **Language for formatting** is the nearest `lang` ancestor, found by `resolveLang`, crossing shadow roots (a host's `lang` applies inside it). `lang=""` means unknown, and an invalid tag falls back to the browser default. It is read at render time, so a change applies on the next update.
- **Numbers** are formatted with `Intl.NumberFormat`: counts with grouping, percentages with `style: 'percent'`, durations as units, compact values with `notation: 'compact'`. A compact or abbreviated form is never the accessible text; the full number is.
- **Units** in a stat are the application's text and are never formatted or translated: game units (`items/min`, `MW`) are not a locale matter.
- **Direction** follows `dir`. Layout uses logical properties throughout; glyphs that point (arrows, the meter fill, the recipe arrow) flip with `:dir(rtl)`. Numbers that may be cut are isolated and laid out left to right, so the first digits survive. Text in another language than the page (a native validation message) is `dir="auto"`.

## Verification

- `check:strings` and `check:locales` in CI, each mutation-checked against a fixture for every rule (`locale-rules.test.ts`, `xliff.test.ts`, `source-check.test.ts`).
- **Pseudo-locale** (`en-x-pseudo`, test-only, built by `build-pseudo.ts` from the source units, not committed): every source wrapped in `⟦ ⟧` and lengthened about 40%, placeholders intact.
  - `test/browser/strings.test.ts`: every message id has a fixture (the test fails if the XLIFF has an id the table lacks); each fixture shows its message in the pseudo-locale and returns to English after `setLocale('en')` without re-creating the element.
  - The same test scans the whole gallery and each open overlay in the pseudo-locale: every shadow text node and library-owned ARIA label with a letter carries the markers. Exemptions (application attributes, `Intl` output, native validation messages, select options, a tooltip's description of a control, a table's caption copied to its scroll area) are listed with reasons, and an unused exemption fails.
- `locale-watch.test.ts`: every message-rendering component re-renders on a change and back; one listener however many hosts; returning hosts catch up.
- `packages/locales`: `loader.test.ts` (each language resolves with the XLIFF's ids, unknown codes reject, merge order, no mutation) and `test/browser/apply.test.ts` (each language in all three engines: `bindDocumentLocale`, names that change and return, axe with `html-has-lang` and `valid-lang`, and reflow at 187 to 512px).
- `perf-production.test.ts`: one `setLocale` re-renders each message-rendering component exactly once, before the next task, and nothing else.
- `check:consumer`: the production fixture configures Lit Localize from its own copy, switches to German and Arabic, and the bundle holds one `@lit/localize`.
- `check:package` for the locales package: no language in the loader's chunk, each language its own chunk, `document` holds neither.

## Gaps

- **All five translations are drafts.** None has been reviewed by a native reader. The direction words of the connection row are the weakest and should be checked first.
- **One message locale per page.** A per-subtree locale is not supported by Lit Localize's runtime; adding one later would not be a breaking change.
