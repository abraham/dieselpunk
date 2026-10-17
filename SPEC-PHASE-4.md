# Phase 4: Production Interfaces — Implementation Specification

**Status:** Draft 1. Work packages 1 (shared internals), 2 (production stat), 3 (connection row), 4 (localization packs), and 5 (test infrastructure) are implemented.
**Parent:** [SPEC.md](SPEC.md), SPEC §17 (Delivery Phases), Phase 4
**Builds on:** [SPEC-PHASE-1.md](SPEC-PHASE-1.md), [SPEC-PHASE-2.md](SPEC-PHASE-2.md), [SPEC-PHASE-3.md](SPEC-PHASE-3.md)
**Packages:** `@dieselpunk/core`, and one new one, `@dieselpunk/locales`
**Prefix:** `punk-`

References written `SPEC §N` point to `SPEC.md`. References written `Phase 1 §N`, `Phase 2 §N`, and `Phase 3 §N` point to `SPEC-PHASE-1.md`, `SPEC-PHASE-2.md`, and `SPEC-PHASE-3.md`. Bare `§N` references point to this document.

## 1. Scope

### 1.1 Deliverables

1. Two components in two registration entries (§5.1, §8): `punk-production-stat` and `punk-connection-row`.
2. Localization on Lit Localize (§7.1, §7.2): components render their words with `msg()`, re-render when the locale changes, and have their messages extracted to XLIFF.
3. `@dieselpunk/locales`: the XLIFF translations for five languages, the runtime locale modules built from them, and helpers to load one and to set the page's `lang` and `dir` (§9).
4. Performance work on production views: budgets and deterministic gates for dashboards of many stats and rows, a library-wide idle gate, and tuning where a gate or a limit shows a cost (§11).
5. Advanced examples in the workbench (a production dashboard, a logistics network, interface settings), and guides for localization and performance (§12).
6. Test coverage for the new components across themes, densities, engines, writing directions, zoom levels, and forced colors; localization tests; a consumer fixture; size and API gates (§13).
7. Release readiness for 1.0: the SPEC §18 checklist walked item by item with evidence, a manual assistive-technology checklist, the API recorded in a snapshot, and `SPEC.md` brought up to date (§14, §16). Phase 4 prepares 1.0 and does not publish it.

### 1.2 Out of Scope

- A chart or sparkline component. `punk-production-stat` has a `sparkline` slot, and applications draw their own (§2 decision 4).
- A connection list, a node graph, wiring by dragging, and any logistics or circuit rules. SPEC §3 excludes game logic, and applications own the list and its state.
- Virtualized lists. Phase 4 measures the cost of long lists and documents the options (§11.3). Applications own virtualization.
- Per-subtree locales: Lit Localize has one active locale for the page (§2 decision 11). ICU message format and plural rules in messages (§2 decision 9).
- Languages beyond the five in §9.1, a translation service or management tool, and Lit Localize's transform mode (§2 decision 1).
- Interaction sound: an adapter that plays audio the application supplies for component events. It is kept as a possible future improvement (§10) and is not built in this phase.
- A searchable combobox, and the other deferrals of Phase 3 §1.2.
- Framework wrapper packages, server-side rendering, and hydration, as in Phase 3.
- Publishing: version numbers, changelog, release automation, and the npm release itself. Phase 4 makes the package ready, and the owner releases (§2 decision 19).

### 1.3 Outcome

A developer can build a factory dashboard and a logistics panel from `punk-production-stat`, `punk-connection-row`, and the existing components; switch it between English, German, French, Spanish, Japanese, and Arabic at run time with `setLocale`. A page of a few hundred stats and rows updates without per-instance listeners or observers, and an idle page does no work. With Phases 1 to 3, this meets the SPEC §18 checklist for 1.0, and the checklist is walked and recorded (§16).

## 2. Resolved Ambiguities

These decisions close gaps in `SPEC.md` and the earlier phase specs that affect Phase 4. Where one changes parent-spec wording or adds API, `SPEC.md` is updated when the package that needs it starts. Decisions 1, 8, and 14 change packaging or documented behavior and need the owner's confirmation before their packages start.

| # | Topic | Decision |
|---|-------|----------|
| 1 | Where localization lives (SPEC §13: "locale packs can replace" the strings; [Lit localization](https://lit.dev/docs/localization/overview/)) | Lit Localize, `@lit/localize`, in runtime mode. Components render their words with `msg()`, and core stays English-only: the English text is the source locale and stays beside each component. `@dieselpunk/locales`, a new workspace package, holds the translations as XLIFF and the runtime locale modules built from them. Transform mode is not used: it builds a separate bundle of an application for each locale and needs a page reload, and a library's messages inside `node_modules` cannot take part in it. Core gains `@lit/localize` as a dependency beside `lit`, and imports `msg` and `str` from the files that define them, since the package entry also pulls in the runtime and decorators (about 1.7 kB in every entry, §7.1), which changes SPEC §2 goal 5 ("other than Lit"), so `SPEC.md` is updated and the owner confirms. `@dieselpunk/locales` has `sideEffects: false` and peer dependencies on `@dieselpunk/core` and `@lit/localize`, and registers no element. |
| 2 | Trend and tone on `punk-production-stat` (SPEC §7.4: "label, value, trend, unit, and optional sparkline slot") | The trend is a direction (`up`, `down`, `flat`) drawn as a shape and said as a word, with an optional change. It carries no good-or-bad color: rising consumption is bad and rising output is good, the component cannot know which, and a color alone would break SPEC §10. An application that wants a verdict puts a `punk-status-light` beside the stat. |
| 3 | Numbers and units in a stat | `value` is a number, formatted with `Intl.NumberFormat` and the nearest `lang` (SPEC §13; Phase 2 §7.4). `compact` abbreviates only what is shown, and the accessible text always carries the full number (Phase 2 §8.2). `unit` is the application's text, and is never formatted or translated: units of a game (`items/min`, `MW`) are not a locale matter. |
| 4 | Sparkline | A `sparkline` slot and nothing else. A chart is application content, and SPEC §3 keeps game-world graphics out of core. The component reserves space for it, never reads it, and its docs say to give it `aria-hidden="true"` or a text alternative. |
| 5 | Roles and names of the stat and the row | Neither has a role on the host. Each renders its words as text in the shadow tree in reading order (Phase 2 §2 decision 6), so the label, the value, and the state read in sequence. `announce` on the stat makes it a polite live region, as on the status light, and is off by default: a dashboard of updating stats must not announce them all. |
| 6 | Removing a connection | The row emits `punk-remove` and does nothing else. The application owns the list and removes the row. The event cannot be canceled, since there is nothing to cancel. The remove button is a native button inside the row, and a button's name must be unique in a list, so its name is `removeConnection` filled with the text of the `source` and `destination` slots, read when the row renders and on `slotchange`. `remove-label` replaces it, and it is the supported way when that text changes without a slot change. |
| 7 | Direction in right-to-left | `direction` is `forward` (source to destination), `backward`, or `both`. DOM order is always source, then destination, so reading order is stable, and the arrow flips with the writing direction, as the recipe's does. The direction is also a localized word in the accessible text (`connectionTo`, `connectionFrom`, `connectionBoth`). |
| 8 | Messages change at run time (Phase 1 §7.6: "components … are not updated when strings change") | Lit Localize re-renders a component when its locale changes, through `@localized()` or `updateWhenLocaleChanges()`, and each of those adds a `window` listener for every instance, which Phase 2's 100-slot gate and Phase 3's listener gates do not allow. A component whose render calls `msg()` instead adds a `LocaleWatcher` controller (§7.1). The watchers share one `lit-localize-status` listener on `window`, added when the first arrives and kept, so a locale change re-renders every connected component that renders a message, once, and the listener count does not depend on how many exist. `t`, `format`, `setStrings`, `resetStrings`, and `StringKey` of `utilities/localize.ts` are removed, since `msg()` and `setLocale()` replace them. They are documented API (Phase 1 §7.6, Phase 2 §7.4, Phase 3 §7.6) of a package at 0.0.0, and the owner confirms. |
| 9 | Messages | Every `msg()` call has an explicit `id` and a `desc`. The ids are the keys the package already used (`close`, `invalidField`, `stackCount`, and the rest), so rewording the English text never changes an id, and a translator reads the `desc` in the XLIFF. A message with values is written with `str` and its expressions, which the XLIFF carries as placeholders, and no message uses `html`: the words are text. There is no plural or select syntax. New messages are worded so the count is not attached to a noun that inflects (`can craft ${count}`, and not `${count} item(s)`). A change of meaning gets a new id, because `lit-localize extract` keeps a unit's old translation under its id (§7.2). |
| 10 | The first locales | German (`de`, which the matrix already uses for long text), French (`fr`), Spanish (`es`), Japanese (`ja`), and Arabic (`ar`, right to left), as BCP 47 language tags, with English (`en`) as the source locale. The translations are original drafts, written in the XLIFF files. A native reader reviews each before 1.0, and the owner arranges that (§16, item 5). |
| 11 | Scope of a locale | Lit Localize has one active locale for the page, and `setLocale()` switches it. The native validation messages follow the browser, not the locale. The page's `lang` and `dir` are the application's to set, and numbers and layout follow them (`resolveLang`); `bindDocumentLocale()` from `@dieselpunk/locales` sets them when a locale becomes ready. Mixed-language subtrees on one page get one message set, and the Localization guide says so. |
| 12 | Interaction sound (SPEC §6.5, SPEC §17) | Not in this phase. SPEC §6.5 makes sound an optional adapter, and nothing else in Phase 4 depends on it. It is kept as a possible future improvement (§10), so no audio package, code, or example is added. |
| 13 | Audio in this repository | None, as before (SPEC §4.3, §18 item 8): core has no audio API or file, and Phase 4 adds none anywhere. |
| 14 | Recording the public API (SPEC §16) | Removing or renaming a documented tag, attribute, event, slot, part, or CSS property is a breaking change. A new gate, `check:api`, derives the public surface from the Custom Elements Manifest and compares it with a committed snapshot, so a change to the API is a visible, deliberate edit of that file. It does not stop changes before 1.0. It stops accidental ones. |
| 15 | How performance work is done | Measure first, assert what is deterministic, and change code only where a gate or a limit shows a cost (Phase 2 §10.5). Frame times on a runner are too noisy to assert. The gates count nodes, listeners, observers, timers, renders, and layout reads (§11.2). Tuning must not change a pixel: the visual check stays green without new baselines. |
| 16 | Visual matrix size (Phase 3 §2 decision 20) | One new group, `production`, with the two new components. The groups run separately, and if the new one passes 20 MB after its first run the content variants are cut for it, as Phase 3 §10.4 says. |
| 17 | Examples and fixtures | The advanced examples are stories, covered by the workbench's smoke test at 375px and 187px as the responsive examples are (Phase 3 §11.10). The package's consumer check gains a fixture that builds a production view from the registration entries (§13.7). The gallery stays in the package's tests. |
| 18 | Screen reader testing | A checklist and a results table in the workbench, run by a person. It is not a gate, since nothing in CI can run a screen reader. Failures it finds become work, and an unrun checklist is named in the release record (§16, item 4). |
| 19 | What "ready for 1.0" means | The SPEC §18 items are each checked against evidence and recorded (§16), the open items of Phases 2 and 3 are closed or handed to the owner by name, and `SPEC.md` is current. Version numbers stay `0.0.0` until the owner releases. |

## 3. Constraints Carried Over

The toolchain, package contract, and conventions of Phase 1 §3 to §5 and §7, Phase 2, and Phase 3 apply unchanged. These findings shape this phase:

- **Test for the three engines on Linux**, in the pinned image, from a Linux `npm ci` (Phase 1 §10.1). Emulation commands wait for the frame to report the change, `focusWithKeyboard` focuses the window first, and a test that toggles `prefers-reduced-motion` has its own file.
- **Every gate is mutation-checked.** A new test runs against a deliberately broken implementation first (Phase 1 §10.7). This includes the new scripts: `check:strings`, `check:locales`, and `check:api` are each made to fail once.
- **Reflow, forced colors, and RTL are tested from the start** through the shared gallery (Phase 1 §10.7).
- **Names come from text in the shadow tree** (Phase 2 §2 decision 6). A name that must reach a control inside a shadow root is copied, never referenced.
- **Status fills are drawn on `panel-inset`** (Phase 2 §2 decision 2), and error and status text is `text`, never `danger` (Phase 3 §2 decision 7).
- **Sizes are measured before limits are set** (Phase 2 §10.6). Entries are at most 5 kB gzip, an exception needs a documented reason, and the shared runtime stays at or below 12 kB.
- **Dev warnings are once per occurrence** and gated by the development export condition (Phase 1 §5.4).
- **Declare each tag with `@tagname`**, and each event, slot, part, and CSS property in JSDoc (Phase 1 §9).
- **Baselines.** Phase 2 and Phase 3 wrote their baselines locally in the pinned image because the CI-made ones already passed there unchanged. Phase 4 follows that practice only if the same check still passes, and says so. The "Update visual baselines" workflow is run once on amd64 at the end of the phase (§14, package 8).
- **No component renders another `punk-` component** in its shadow tree (Phase 3 §2 decision 3): the row draws its own native remove button from `close-button.ts` and its own status shape from `status-shape.ts`, so its entry stays independent.
- **Rules that other work proved.** A killed mutation run can leave source mutated, so each one is followed by a check that the source is restored; and every script runs as `node <file>.ts` on Node 26.

## 4. Repository Layout

Additions to Phase 1 §4, Phase 2 §4, and Phase 3 §4:

```text
packages/core/
  scripts/
    check-api.ts                the public surface against api.snapshot.json (§13.8)
    build-pseudo.ts             writes the test-only pseudo-locale XLIFF and builds it (§13.5)
  api.snapshot.json             committed; written by `check:api -- --update`
  src/
    internal/
      stat-format.ts            pure: a stat's value, change, and trend for a language (§7.3)
      localize.ts               msg, str, and the status event, from the files that define them (§7.1)
      locale-watch.ts           LocaleWatcher, and the one lit-localize-status listener (§7.1)
    utilities/
      localize.ts               removed: t, format, setStrings, resetStrings, StringKey (§2 decision 8)
      number-format.ts          formatNumber and formatPercent, apart from locale.ts, which needs the DOM
    styles/
      readout.ts                the inset plate the stat and the row draw their text on (§7.4)
    components/
      production-stat/  connection-row/
        <name>.ts, <name>.styles.ts, index.ts, register.ts, <name>.test.ts, <name>.registration.test.ts
  test/
    stat-format.test.ts         node:test, no browser
    browser/
      strings.test.ts           every message reaches the screen, and changes live (§13.5)
      perf-production.test.ts   dashboard gates (§11.2)
      perf-idle.test.ts         the idle library (§11.2)
      fixtures/gallery.ts       gains the production group
      fixtures/generated/       the test-only pseudo-locale, not committed (§13.5)
    package/src/production.ts   a production view from the registration entries (§13.7)
packages/locales/
  package.json, tsconfig.json
  lit-localize.json             source locale en, five target locales, runtime output, XLIFF (§9.2)
  xliff/                        de.xlf  fr.xlf  es.xlf  ja.xlf  ar.xlf: the committed translations
  src/
    index.ts                    sourceLocale, targetLocales, locales, loadLocale, mergeLocaleModules
    document.ts                 bindDocumentLocale
    de.ts  fr.ts  es.ts  ja.ts  ar.ts     one locale module each, re-exporting the generated one
    generated/                  written by `lit-localize build`, not committed
  scripts/
    check-locales.ts            completeness, placeholders, and text rules (§9.3)
    xliff.ts                    pure: reads the subset of XLIFF 1.2 that lit-localize writes
  test/
    xliff.test.ts               node:test, no browser
    apply.test.ts               browser, all three engines
apps/storybook/src/
  stories/
    production-stat.stories.ts  connection-row.stories.ts
    example-production-dashboard.stories.ts
    example-logistics-network.stories.ts
    example-interface-settings.stories.ts
    localization.mdx  performance.mdx
  lib/
    production-demo.ts          a simulated factory, ticked by the story
    sparkline.ts                an inline-SVG sparkline for the examples
```

## 5. Package Contract

### 5.1 Exports and Registration

Each entry follows Phase 1 §5.1 and §5.2: a class entry with no side effects, and a `register.js` that defines the element.

| Entry | Tags |
|-------|------|
| `production-stat` | `punk-production-stat` |
| `connection-row` | `punk-connection-row` |

`check-package.ts` gains a sentinel string for each tag and requires that no entry registers a tag outside its own row. The package root exports `PunkProductionStat` and `PunkConnectionRow`, their option types, and the event type. `setStrings` leaves the root (decision 8):

```ts
export type ProductionTrend = 'up' | 'down' | 'flat';
export type ProductionStatLayout = 'stacked' | 'inline';
export type ConnectionDirection = 'forward' | 'backward' | 'both';
export type ConnectionStatus = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type PunkRemoveDetail = { value: string; item: HTMLElement };

declare global {
  interface HTMLElementEventMap {
    'punk-remove': CustomEvent<PunkRemoveDetail>;
  }
}
```

The fixture consumer gains a typed listener for `punk-remove`, so a missing declaration fails type checking under both supported TypeScript versions.

`@dieselpunk/locales` has its own `exports` map (§9.1). Its entries have no side effects, and `check-package.ts` runs for it, with `publint` and `attw`, as it does for core.

### 5.2 Naming

Class names are `PunkProductionStat` and `PunkConnectionRow`.

### 5.3 Development Warnings

Each warns once per occurrence when:

- a stat has no `label`; `value`, `delta`, or `decimals` are not finite numbers, or `decimals` is not a whole number from 0 to 6 (ignored or clamped); `trend` is not one of the three words (ignored); or `sparkline` holds an `svg`, `canvas`, or `img` with neither `aria-hidden="true"` nor a name;
- a connection row has no content in `source` and none in `destination`, and no `remove-label`; its `status` is not `neutral` and the `status` slot has no text; or `direction` or `status` is not one of its words (drawn as the default);

## 6. Contrast and Tokens

No new color tokens, no new gate rules, and no new theme. The two components draw their text and glyphs on `panel-inset`, where the existing rules already hold: `text` (the value, the delta, the node text, the arrow) and `text-muted` (the stat's label) against `panel-inset` at 4.5:1 (7:1 in `high-contrast`); the status shapes on their lens at 3:1 (Phase 2 §2 decision 2). Because the plate sets the surface, the contrast does not depend on where the application puts the component.

A browser test closes the gap that the token gate cannot see: it resolves the background behind every text node and glyph of both components, in all four themes and both densities, and requires `panel-inset` or the status lens, so a rule that moves text onto another surface fails. It fails when the plate rule is removed.

## 7. Shared Internals

### 7.1 Locale Changes

`internal/localize.ts` re-exports `msg` from `@lit/localize/init/install.js`, `str` from `@lit/localize/internal/str-tag.js`, and `LOCALE_STATUS_EVENT` from `@lit/localize/internal/locale-status-event.js`, and components import them from there. The package entry, `@lit/localize`, re-exports the runtime and the decorators as well, and its modules have top-level effects, so importing `msg` from it added 1.7 kB to the shared runtime and to every entry. These are the files that define the names, and `lit-localize extract` finds the calls through the type checker, so it is not confused by the path. An application that configures Lit Localize imports from the entry, and reaches the same `install.js`.

`internal/locale-watch.ts` exports `LocaleWatcher`, a reactive controller that a component adds when its render calls `msg()`: the base classes of buttons, receptacles, and fields, and the meter, recipe, toast, toast stack, and window. A component that renders no message adds none, and is not drawn again on a locale change.

- `watchLocale(host)` adds a host to one module-level set, and the first call adds one listener for `lit-localize-status` to `window`. The listener stays: there is one however many hosts come and go, and it holds only the set. On a `ready` status it counts an epoch and calls `requestUpdate()` on every host in the set; `loading` and `error` change nothing, since the active locale has not changed.
- The controller registers its host when connected and lets go when disconnected. A host that returns after a locale became ready, which it can tell from the epoch, draws again once; a component that connects later renders with the active locale's messages, since `msg()` reads them when it runs.
- No observer is created. The set holds a host only while it is connected, so nothing leaks.
- A test makes sure a component that renders a message has the controller: each of them is mounted in English, the locale is set, and its words must change and change back (§13.5 does this for every message).
- `msg` is called in `render()` and nowhere else, so a message is read when it is drawn. A component never calls it at module load or in a static field.
- Without `configureLocalization()`, `msg` returns the English source, so the library works with no setup.
- Lit Localize is configured once per page, by the application, and throws if it is configured again. An application's own components use `@localized()` as the Lit documentation says. Core and the application must resolve one copy of `@lit/localize`, since the configuration is module state; the consumer check covers that (§13.7).
- Measured, against the shared runtime: it went from 8.37 kB to 8.20 kB, since `localize.ts` is gone. The controller and the `msg` runtime cost about 0.47 kB in each entry that renders a message, and nothing in the others (§14.1).

### 7.2 Messages and Extraction

A message is written beside its component, in English, with an explicit id and a description:

```ts
msg('Close', { id: 'close', desc: 'The name of the button that closes a window or a toast.' });
msg(str`${count} of ${capacity}`, {
  id: 'stackCapacity',
  desc: 'The count of an item stack, out of its capacity.',
});
```

`lit-localize.json` in `packages/locales` (§9.2) points `lit-localize extract` at core's sources. It writes one XLIFF file for each target locale into `packages/locales/xliff/`, with the source text, the description as a `<note>`, and each expression as a placeholder (`<x equiv-text="${count}"/>`). Existing translations stay under their ids. `check:strings` runs the extraction and fails when it changes any file, so a message added, removed, or reworded without the XLIFF following it fails CI. It also fails when a unit has a hash-style id or no `<note>`, and, reading the source with the TypeScript compiler API, when a `msg()` call has an `id` or a `desc` that is not a string literal. The source check is needed because the extraction keeps the note a unit already has when a call loses its `desc`, so the XLIFF alone does not show it. Run on its own, the extraction is how a new message reaches the translators.

`lit-localize extract` keeps a unit's translation under its id even when the source text of that id changes, so a reworded message can carry a stale translation. A change of meaning therefore gets a new id (decision 9), and a changed `<source>` shows in the diff for the reviewer.

The keys of the earlier phases that a component renders (18 of the 19 in `StringKey`; `moreActions` is used nowhere and is dropped) keep their names as ids and their English text, so nothing changes for a translator. `t`, `format`, `setStrings`, `resetStrings`, and `StringKey` are removed from `utilities/localize.ts`, with the node test of `localize.ts`, and every component that called them calls `msg` instead.

### 7.3 `stat-format.ts`

The pure part of the stat, with no DOM access, tested with `node --test` (`Intl` is available in Node). `resolveStat({ value, decimals, compact, unit, trend, delta, deltaPercent }, lang)` returns what the component draws and says:

```ts
export interface ResolvedStat {
  valueText: string;        // what is shown: compact when `compact` is set
  fullValueText: string;    // always the unabridged number; '' when there is no value
  trend: ProductionTrend | undefined;
  deltaText: string;        // '' when there is no change; signed; a percent or a plain number
  repairs: string[];        // what was clamped or ignored, for the warnings of §5.3
}
```

- `decimals` is a whole number from 0 to 6; a non-integer is rounded, and one outside the range is clamped. With none set the formatter's own default applies.
- `delta` is shown with `signDisplay: 'exceptZero'`. In percent mode it is a ratio (`0.12` is `+12%`) with at most `decimals` (default 1) fraction digits; otherwise it is a plain number with the same digits as `value`.
- `trend` is the author's when it is one of the three words. Otherwise it follows `delta`: positive is `up`, negative is `down`, and zero is `flat`. A `delta` that rounds to zero at the digits shown is `flat`, so the arrow and the number never disagree.
- A value or delta that is not finite is ignored and listed in `repairs`.

### 7.4 Readout Plate

`styles/readout.ts` is the inset plate that the stat and the row draw on: `panel-inset`, the inset bevel, a 2px forced-colors border in `CanvasText`, and the `text` and `text-muted` colors that §6 relies on. It is shared by the two components and imports nothing else. `visuallyHidden` stays in `receptacle.ts`; if importing it would bring the receptacle styles into an entry that does not need them, it moves to its own file, as `status-shape.ts` did in Phase 3 §11.1.

### 7.5 New Messages

These messages join the existing ones, each with an explicit id and a `desc` beside the component:

| Id | Default | Used by |
|----|---------|---------|
| `statNoValue` | `no value` | stat (hidden text beside the placeholder dash) |
| `trendUp` | `up` | stat |
| `trendDown` | `down` | stat |
| `trendFlat` | `unchanged` | stat |
| `connectionTo` | `to` | row |
| `connectionFrom` | `from` | row |
| `connectionBoth` | `to and from` | row |
| `removeConnection` | `Remove connection: ${source}, ${destination}` | row |

## 8. Components

All components follow Phase 1 §8, Phase 2 §8, and Phase 3 §8: Shadow DOM, logical properties, tokens only, complete JSDoc with `@tagname`, and reduced-motion handling. Neither has an animation, a transition, or an observer, and neither adds a listener to `document` or `window`.

### 8.1 `punk-production-stat`

A compact metric: a label, a value with its unit, an optional trend and change, and an optional sparkline.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `label` | `label` | `string` | `''` | yes |
| `value` | `value` | `number \| undefined` | `undefined` | yes |
| `unit` | `unit` | `string` | `''` | yes |
| `decimals` | `decimals` | `number \| undefined` | `undefined` | yes |
| `compact` | `compact` | `boolean` | `false` | yes |
| `trend` | `trend` | `ProductionTrend \| undefined` | `undefined` | yes |
| `delta` | `delta` | `number \| undefined` | `undefined` | yes |
| `deltaPercent` | `delta-percent` | `boolean` | `false` | yes |
| `layout` | `layout` | `'stacked' \| 'inline'` | `'stacked'` | yes |
| `announce` | `announce` | `boolean` | `false` | yes |

- **Slots:** `icon` (the application's resource or machine icon, beside the label) and `sparkline`.
- **Parts:** `stat`, `icon`, `label`, `value`, `unit`, `trend`, `delta`, `sparkline`.
- **CSS properties:** `--punk-stat-value-min` (the least inline size reserved for the value; default `4ch`) and `--punk-stat-sparkline-size` (the inline size of the sparkline slot; default `calc(var(--punk-control-height-md) * 2)`).
- **The plate.** The whole stat is a readout plate (§7.4), so its label and value meet the text rules wherever it sits (§6).
- **The value** is set in tabular figures (`font-variant-numeric: tabular-nums`), aligned to the inline end, and reserves `--punk-stat-value-min`, so a column of stats lines up and a value that changes from 1,111 to 8,888 does not move anything. It is never clipped and never ellipsized (decision 3): the label wraps first, and a very long value breaks at the container's edge as a last resort.
- **Compact.** With `compact` the shown value is abbreviated by `Intl.NumberFormat` (`1.2K`) and marked `aria-hidden`, and the full number is visually hidden text beside it, so the accessible text is always unabridged (Phase 2 §8.2).
- **No value.** With no usable `value` the value shows an en dash, and the word `statNoValue` is visually hidden beside it.
- **Trend.** A shape in the plate: a triangle up for `up`, down for `down`, and a bar for `flat`, in `text`. The word (`trendUp`, `trendDown`, `trendFlat`) is visually hidden text, then the change text (§7.3) is shown. A trend with no change shows the shape alone. With neither `trend` nor `delta` nothing is drawn.
- **Layout.** `stacked` puts the label above the value. `inline` puts them on one row, with the value group at the inline end; both wrap, so the value group goes under the label where the row is too narrow, with no container query. The sparkline sits after the value in `inline` and below it in `stacked`.
- **Reading order,** which is also the accessible text: label, value, unit, trend word, change, then the slotted content. There is no role. With `announce` the host is `role="status"`, a polite live region; the role the author had set is remembered and given back when `announce` is turned off, as on the status light.
- **Forced colors.** The plate keeps its border, and the glyphs fill with `CanvasText`, so up, down, and flat stay apart by shape.
- **Reduced motion.** There is nothing to reduce: a changed value is drawn at once, with no count-up and no flash.

States:

| State | Treatment |
|-------|-----------|
| Value | Label, value, unit |
| No value | En dash, with the hidden word |
| Compact | Abbreviated value shown, full number in the text |
| Trend up, down, flat | A shape and a word; with a change, its signed number |
| Sparkline | The slotted content, in the reserved space |
| Announcing | `role="status"` |

### 8.2 `punk-connection-row`

A logistics or circuit connection: a source, a direction, a destination, a status, and a removal.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `direction` | `direction` | `ConnectionDirection` | `'forward'` | yes |
| `status` | `status` | `ConnectionStatus` | `'neutral'` | yes |
| `removable` | `removable` | `boolean` | `false` | yes |
| `removeLabel` | `remove-label` | `string` | `''` | yes |
| `disabled` | `disabled` | `boolean` | `false` | yes |
| `value` | `value` | `string` | `''` | yes |

- **Slots:** `source` and `destination` (the application's node: an icon and a label), the default slot (details: a condition, a signal, a rate), and `status` (the status text).
- **Parts:** `row`, `source`, `direction`, `destination`, `details`, `status`, `indicator`, `status-label`, `remove-button`.
- **Events:** `punk-remove` with `{ value, item }`, bubbling and composed, from a click on the remove button. The row stays in the DOM until the application removes it (decision 6).
- **The plate.** The row is a readout plate (§7.4) with the nodes, the arrow, the details, the status, and the button in one line.
- **Direction.** An arrow between the nodes, drawn with CSS: `forward` points from the source to the destination, `backward` the other way, and `both` has two heads. The arrow flips with the writing direction. Its word (`connectionTo`, `connectionFrom`, `connectionBoth`) is visually hidden text between the two nodes in DOM order (decision 7).
- **Status.** A shape in the inset lens, from `status-shape.ts`, as the status light draws it, with the `status` slot's text beside it; a `neutral` row with no `status` text draws nothing. The text carries the meaning, and the shape differs by variant, so color is never the only cue (SPEC §10).
- **Remove button.** With `removable`, a native `<button>` drawn from `close-button.ts` at the inline end, with a 40px hit area under a coarse pointer. Its name is `removeConnection` with `{source}` and `{destination}` filled from the slots' text, or `remove-label` when that is set (decision 6). It is the row's only tab stop. A row that is not `removable` has none.
- **Disabled.** The button is disabled and leaves the tab order; every word stays readable (SPEC §4.2).
- **Narrow.** Below 360px of row width (a container query on the plate, which has a definite inline size from its block parent) the nodes stack with the arrow turned to point down for `forward` and up for `backward`, the details and status take their own lines, and the button stays at the inline end of the first line. Nothing scrolls sideways at 187px.
- **Forced colors.** The plate keeps its border; the status shapes use system colors as the status light's do; the arrow and the button's X use `ButtonText`.
- **Reduced motion.** There is nothing to reduce.

Keys: `Tab` reaches the remove button, and `Enter` or `Space` activates it, as a native button does. The row has no other key. After a removal the application moves focus (to the next row's button, or to the list's heading when it was the last), since the focused element is gone; the guide shows the pattern (§12).

States:

| State | Treatment |
|-------|-----------|
| Idle | Source, arrow, destination |
| Each status | A shape and the status text |
| Each direction | Forward, backward, and both |
| Removable | The remove button |
| Disabled | The button disabled, all words readable |
| Narrow | Stacked nodes |

## 9. Localization Packs

### 9.1 Package

`@dieselpunk/locales` holds the translations of core's messages and the helpers to load them. It follows Lit Localize's runtime mode: an application configures Lit Localize once, and passes the package's loader to it.

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

`loadLocale` returns one module, so an application with messages of its own merges them with the library's:

```ts
import { loadLocale as loadLibrary, mergeLocaleModules } from '@dieselpunk/locales';

const loadLocale = (code: string) =>
  mergeLocaleModules(loadLibrary(code), import(`./generated/locales/${code}.js`));
```

| Entry | Exports |
|-------|---------|
| `.` | `sourceLocale` (`'en'`), `targetLocales`, `locales` (for each locale: `code`, `name`, `dir`, `status`), `loadLocale(code)`, `mergeLocaleModules(...modules)` |
| `de`, `fr`, `es`, `ja`, `ar` | the locale module for that language: `templates`, the shape that Lit Localize's `loadLocale` expects |
| `document` | `bindDocumentLocale(root?)` |

- `loadLocale` imports each language with a literal dynamic `import()`, so a bundler gives each its own chunk and an application fetches only the languages it uses. A code outside `targetLocales` rejects. English has no module: it is the source.
- `mergeLocaleModules` takes locale modules or promises of them and returns one module whose `templates` are theirs combined, a later module winning a shared id.
- `bindDocumentLocale(root = document.documentElement)` adds one `lit-localize-status` listener to `window`. On `ready` it sets `root.lang` to the locale and `root.dir` from `locales`, and it returns the function that removes the listener.

### 9.2 How the Package Is Built

`lit-localize.json` in the package:

```json
{
  "$schema": "https://raw.githubusercontent.com/lit/lit/main/packages/localize-tools/config.schema.json",
  "sourceLocale": "en",
  "targetLocales": ["de", "fr", "es", "ja", "ar"],
  "tsConfig": "../core/tsconfig.build.json",
  "output": {
    "mode": "runtime",
    "outputDir": "./src/generated",
    "localeCodesModule": "./src/generated/locale-codes.ts"
  },
  "interchange": { "format": "xliff", "xliffDir": "./xliff/" }
}
```

`npm run build` in the package runs `lit-localize build`, which writes `src/generated/<code>.ts` (the runtime-mode templates) and `locale-codes.ts`, then `tsc`, then `check-locales`. The XLIFF files are the committed source of the translations: translators receive them, and a returned file overwrites the original. `@lit/localize-tools` is a development dependency, so nothing of it reaches an application.

The tool uses the TypeScript compiler API, and the repository holds one TypeScript, 6.0.x (Phase 3 §13, item 6). Package 1 begins by confirming that `extract` and `build` run against it and against core's `.ts` import specifiers, and records the result. If they do not, the tool runs from an isolated install outside the workspaces, which `npm ls typescript` does not see, and the rest of this section is unchanged.

### 9.3 Authoring Rules and the Gate

`scripts/check-locales.ts`, with a pure reader in `scripts/xliff.ts`, runs in the package's `build` and in CI. It reads the committed XLIFF and fails when, for any target locale:

- a unit has no `<target>` or an empty one, or the locale's unit ids differ from the source's;
- a target's placeholders (the `equiv-text` of its `<x>` elements) differ from its source's as a set (order may differ);
- a target has leading or trailing whitespace, or holds a control character or a bidirectional override or isolate (U+202A to U+202E, U+2066 to U+2069), which would leak into the page around it;
- a locale in `locales` is not a canonical language tag (`Intl.getCanonicalLocales`), has no XLIFF file, or has a `dir` other than what `new Intl.Locale(code).getTextInfo().direction` says (`textInfo` where an engine has only that).

The rules for the people who write translations, which the Localization guide repeats: read the `<note>`, which is the description; translate the meaning of the phrase and not its words; keep each `<x>` placeholder exactly as it is and never split one; write `invalidField` as a word that is correct before a colon, since the component capitalizes it with CSS where the language has capitals; keep `moving` as one sentence, since it is read aloud as one; and prefer a form that needs no plural (decision 9).

### 9.4 Status of the Translations

The five XLIFF files are original drafts, and each locale has `status: 'draft'` in `locales`. A draft is complete and passes every gate, and it is not reviewed. Changing the status to `'reviewed'`, and naming the reviewer in a comment at the top of the file, is part of the release record (§16, item 5). A locale that is not reviewed by the release is shipped as a draft with its status, or left out by removing its entry and its XLIFF, and the owner decides.

## 10. Possible Future Improvement: Interaction Sound

Not part of Phase 4. Nothing in this section is built, tested, or part of the definition of done. SPEC §6.5 says sound is an optional adapter, off by default, with no audio in core, and that stays true. Phase 4 adds nothing that blocks it and nothing that needs it.

Notes for a later phase:

- An optional package, separate from core, that listens for events the components already emit (`punk-activate`, `change`, `punk-selection-change`, `punk-open`, `punk-close`, `punk-tab-change`, `punk-toggle`, `punk-dismiss`, and `punk-remove`) and plays audio the application supplies for each. It would need no change to core.
- It would be off until the application enables it from a user gesture, hold no listener while off, play only for changes the user caused, and limit repeats, so a held key or a slider drag does not become a buzz.
- No audio would ship with it. The application provides the files or buffers and the rights to them (SPEC §4.3), and sound would never be the only carrier of information (WCAG 1.4.2).
- To settle first: how to tell a change the user made from a script's, since component events do not say; whether a toast needs an event for appearing; and the package's size budget.

## 11. Performance

### 11.1 Budgets

SPEC §14.3 and Phase 3 §3 stand: the shared runtime is at most 12 kB, an entry is at most 5 kB unless an exception is documented, and the slot-grid gate of Phase 2 §10.5 stays green. New, each measured on its own, gzip-compressed, before a limit is set:

| Entry | Budget |
|-------|--------|
| `production-stat` | 5 kB |
| `connection-row` | 5 kB, or a documented exception: it carries the close button and the status shapes, which measure 3.37 kB together as their shared entry |
| each locale module of `@dieselpunk/locales` | 1 kB |
| `@dieselpunk/locales` (the loader, `mergeLocaleModules`, and the metadata) | 1 kB |
| `@dieselpunk/locales/document` | 0.5 kB |

### 11.2 Gates

Frame times on a runner are too noisy to assert (Phase 2 §10.5), so these check what makes a page cheap, deterministically, in `perf-production.test.ts` and `perf-idle.test.ts`, on all three engines:

- **A dashboard** of 200 stats and 200 connection rows adds no listener to `document` or `window` beyond the one of §7.1, and creates no `ResizeObserver`, `IntersectionObserver`, or `MutationObserver`. A stat adds no listener to itself. A row adds one, on its remove button, and none when it is not `removable`.
- **Each instance's tree has a fixed size:** a stat holds at most 14 elements in its shadow root and a row at most 18, the numbers set from the measured ones in package 6 and then held. No element count depends on a value, a label, or a status.
- **One sheet for all instances.** Every instance of a class adopts the same `CSSStyleSheet` objects, compared by identity, so styles cost once per class.
- **Renders.** Setting `value` on one stat renders that stat once and no other. Setting 200 values in one task renders each stat once and calls no `getBoundingClientRect`, `getComputedStyle`, or `offsetWidth`. Setting a property to the value it has renders nothing. A row reads its slots' text on `slotchange` and not on render.
- **Locale changes.** One `setLocale` call re-renders every connected component that renders a message exactly once, in one task, after the locale is ready, and a disconnected component not at all; a component that renders no message is not drawn again (§7.1).
- **The one listener.** `perf-shell.test.ts` and `perf.test.ts` count listeners on `window` and `document`; package 1 makes them ignore `lit-localize-status`, by name and nothing else. A new test requires that there is one such listener however many components arrive, and that it is never removed.
- **The idle library.** With every component mounted at once (the gallery) and no input for a second: no `requestAnimationFrame` callback is pending after the first frame settles, no timer the library started is pending, `document.getAnimations()` is empty, and the only observers are the `ResizeObserver` of each non-wrapping toolbar (Phase 3 §10.7). A closed overlay holds no listener, and the only listener on `window` or `document` is the one of §7.1.
- **Informational, not asserted,** and printed in the CI log: the time to render the dashboard, the time to define every element, and the time of one `setLocale` over the dashboard.

Each gate is made to fail once, by adding a listener, an observer, a layout read, or a render, and then restored.

### 11.3 Tuning

Work starts from the numbers of §11.2 and the sizes of §11.1, and changes code only where one shows a cost. Candidates, in the order to try them:

1. **Entries over a limit,** by splitting the shared base before a limit is raised (Phase 3 §10.8). The entries closest to theirs today are the item stack (6 kB), the window (7.1), the icon button (7.5), the toast pair (6), and the number field (6.5); each is re-measured, and an exception is kept only with its reason.
2. **Long lists.** The two components take `content-visibility: var(--punk-content-visibility, visible)` with `contain-intrinsic-size: auto <their height>`, so an application sets the property to `auto` on a list of hundreds and the browser skips off-screen work. It is off by default, because it changes how `Ctrl+F`, focus, and scroll anchoring behave in some browsers, and the Performance guide says what was tested (all three engines, a screen reader's list view) and what was not. This is a measured option, not a default.
3. **Renders.** A property with a `hasChanged` that treats a number as unchanged when the formatted result would be the same, if the dashboard gate shows needless renders.
4. **Startup.** Whatever the informational timing of defining all elements shows, if it is out of line.

No change is accepted unless the visual check is green with no new baseline (decision 15). Each change is recorded with its before and after numbers in §14.

## 12. Documentation Workbench

Additions to Phase 3 §9:

1. **Docs pages and story sets** for the stat and the row: a playground, every state, the theme by density matrix, a keyboard table (the row's single tab stop), and the manifest's API table. The row's page shows the removal pattern, with focus moved after the row goes.
2. **Production dashboard** (`Examples / Production dashboard`): a window of stats with sparklines (drawn by `lib/sparkline.ts`), meters for power and fluid, status lights for machine groups, and progress bars, updated by `lib/production-demo.ts` once a second. A **Pause updates** switch stops the timer and is on screen, since automatically updating content must be pausable (WCAG 2.2.2). Updates never move focus and never announce, and the timer stops when the story is not shown.
3. **Logistics network** (`Examples / Logistics network`): a window with a toolbar (a select to filter by status, a button that opens a popover menu to add a connection), a list of a dozen connection rows, a confirming dialog before a removal, and a toast with an Undo action after it. Focus goes to the next row's remove button after a removal, or to the list's heading after the last.
4. **Interface settings** (`Examples / Interface settings`): a locale select that calls `setLocale` for each locale, with `bindDocumentLocale()` setting `lang` and `dir`, and the theme and density. It is the one place that shows localization working across the whole library.
5. **Guides:** **Localization** (configuring Lit Localize, `setLocale`, merging an application's own messages, `bindDocumentLocale`, writing a translation in XLIFF, the rules of §9.3, the live update, what does not change: the browser's validation messages and one locale per page, and a table of every message id with its English text and description, read from the XLIFF); **Performance** (the budgets, what each component costs, how to update many stats, `content-visibility` for long lists and its caveats, and virtualization as the application's job).
6. **Application shell** gains a Production readout (a row of stats) and a Logistics tab (a few rows), so SPEC §8's representative window shows the new components.
7. **Accessibility guide** gains the stat and the row (the stat has no keyboard, the row's one tab stop), their forced-colors cues, and the manual checklist of §14, package 8, with its results table.
8. **The workbench's smoke test** covers every new entry with no console error or warning, and loads each example at 375px and 187px and fails on sideways scrolling by more than a pixel.

## 13. Testing and CI

### 13.1 Logic Tests

`stat-format.test.ts` in core and `xliff.test.ts` in the locales package run under `node --test` with no browser. They cover:

- the stat: every row of §7.3, for `en`, `de`, `ar`, and `ja`, against `Intl.NumberFormat` output and never against a literal that a newer ICU could change; compact against full; `decimals` repairs; a `delta` that rounds to zero; negative and very large values; a non-finite value;
- the XLIFF reader and each rule of §9.3, on a fixture that breaks it, and the shipped XLIFF passes.

Each is mutation-checked.

### 13.2 Component Tests

Each component has `*.test.ts` and `*.registration.test.ts` as before, covering the criteria in §15, on all three engines. These apply to the whole phase:

- **Accessibility tree.** Roles, names, and states are asserted with Playwright's ARIA snapshot: a stat with every part, a compact stat, a stat with no value, a stat announcing, a row in each direction and status, a removable row, and a disabled one.
- **Both directions of every property**: set before and after connection, and an attribute added and removed.
- **Ownership.** Whatever a component writes to its host (a role from `announce`) is restored when it is turned off or the component disconnects.
- **Each state against its non-color cue,** by forcing all colors to one value and requiring the states to stay different: the three trends, the five statuses, and the three directions.

### 13.3 Accessibility

The gallery gains the `production` group, so the axe suite covers both components in all themes and both densities with no serious or critical violation. The reflow test covers them at 187 to 512px. The contrast test of §6 runs over the group.

### 13.4 Visual Regression

The matrix of Phase 1 §10.3, Phase 2 §10.4, and Phase 3 §10.4 applies, with these changes:

- The gallery exports `productionNames`, and `galleryGroups` gains `production`. `componentNames` stays the union.
- **`production`** renders a stat with a short and a long label, no value, a value of 1,234,567.89 plain and compact, each trend with and without a change, both layouts, and one with a sparkline; and a row for each direction and each status, with long node names, with and without details and status text, removable and not, disabled, and at a width that stacks.
- Hover, focus-visible, and active on the remove button are driven with real input (`interaction-connection-row-*`).
- The forced-colors project covers the group at one theme. Firefox and WebKit run the reduced set, as before.
- The folder passes 20 MB or it is cut (decision 16).

### 13.5 Localization Tests

- **Every message reaches the screen, and follows the locale live** (`strings.test.ts`). A table maps each message id to a small fixture and a reader (the accessible name, or the text of a part). The test first requires that the table's ids equal the ids of the source units in the XLIFF, so a new message without a fixture fails. The page is configured once with Lit Localize and a **pseudo-locale**, `en-x-pseudo`, which is test-only: `scripts/build-pseudo.ts` writes an XLIFF whose targets are the sources wrapped in `⟦ ⟧` and lengthened by about 40%, with placeholders intact, and runs `lit-localize build` on it into `test/browser/fixtures/generated/`, which is not committed. For each id the test renders the fixture, calls `setLocale('en-x-pseudo')`, and requires the read text to carry the markers; then it calls `setLocale('en')` and requires the English text again, without re-creating the element. A message that is hardcoded, or not re-rendered, fails.
- **No hardcoded words.** With the pseudo-locale active, the gallery is scanned: every text node in every shadow root and every `aria-label` of a library-owned element that contains a letter must carry the markers. Text from `Intl` (the `K` of a compact count, a unit the formatter adds) is exempt through an explicit list in the test, each entry with its reason. Application text in the light DOM is not scanned. The test fails when a literal is put back in a component.
- **Each real locale** (`apply.test.ts` in the locales package): `loadLocale(code)` resolves for each target locale and rejects for an unknown one; `setLocale(code)` with `bindDocumentLocale()` sets `lang` and `dir` and changes the accessible names of the key fixtures; the gallery passes axe in each locale (`valid-lang` and `html-has-lang` included) and the reflow test at 187 to 512px, so long German and Japanese text cannot make a component scroll sideways.
- **The live update:** the dashboard of §11.2 with a locale switch renders each component once (§11.2).

### 13.6 Performance Gates

`perf-production.test.ts` and `perf-idle.test.ts` of §11.2, plus the existing `perf.test.ts` and `perf-shell.test.ts`, which stay as they are.

### 13.7 Size, Packaging, and the Consumer

The gates of Phase 3 §10.8 apply. `check-package.ts` requires that no entry brings a tag of another family, as before. For the new package it runs `publint --strict` and `attw`, requires `sideEffects: false`, and requires that no entry registers an element. The new size entries are the two components (§11.1), and a locale module, the loader entry, and the `document` entry of `@dieselpunk/locales`.

The consumer check (`check-consumer.ts`) gains `test/package/src/production.ts`: a production view built from the registration entries for stat, connection row, meter, status light, and window, with a typed `punk-remove` listener, one `@ts-expect-error` on a `direction` that is not in the union and one on a `trend` that is not, and with `@dieselpunk/locales` imported, Lit Localize configured from the consumer's own `@lit/localize`, and `setLocale('de')` called. It runs under TypeScript 5.0 and the newest, and a browser probe checks that `setLocale('ar')` with `bindDocumentLocale()` sets `dir="rtl"` and changes a row's remove button's name, that a stat shows a formatted value, and that the consumer and core resolve one copy of `@lit/localize`.

### 13.8 The API Snapshot

`check:api` (`scripts/check-api.ts`) builds, from `custom-elements.json`, a sorted description of each tag's attributes, public properties, events, slots, parts, and CSS properties, and of the package's `exports` keys, and compares it with `api.snapshot.json`. It prints each difference as removed (a breaking change under SPEC §16), added, or changed, and exits non-zero on any. `npm run check:api -- --update` rewrites the file, which is committed. Run on every pull request, a change to the public API is always a visible change to a reviewed file. It is mutation-checked by renaming a part, and by removing an event.

### 13.9 CI

The stages of Phase 3 §10.9 are unchanged, and gain `check:strings` (a fresh extraction must leave the XLIFF unchanged), `check:locales` (run in the locales build), and `check:api`. The root scripts `build`, `typecheck`, `test`, `check:package`, and `check:size` run over every workspace with `--if-present`. The "Update visual baselines" workflow is run once on amd64 at the end of the phase and its output compared with the committed files (§14, package 8). Two dependencies are added: `@lit/localize` to core, and `@lit/localize-tools` as a development dependency of the locales package, and Dependabot updates them like the others.

## 14. Work Packages

| # | Package | Depends on | Output |
|---|---------|------------|--------|
| 1 | Shared internals | Phase 3 | The Lit Localize spike (§9.2), `msg()` in place of `t` and `format` with `locale-watch`, the existing messages as ids and descriptions, `check:strings`, `stat-format`, `readout.ts`, `check:api` and its first snapshot; logic tests. Done (§14.1). |
| 2 | Production stat | 1 | `punk-production-stat`, tests. Done (§14.2). |
| 3 | Connection row | 1 | `punk-connection-row`, tests. Done (§14.3). |
| 4 | Localization packs | 1, 2, 3 | `@dieselpunk/locales`: the XLIFF for five locales, the generated modules, `loadLocale`, `mergeLocaleModules`, `bindDocumentLocale`, `check-locales`, tests. Done (§14.4). |
| 5 | Test infrastructure | 2, 3 as they land | The `production` gallery group, axe and reflow coverage, ARIA snapshots, the contrast test, the visual matrix and interaction captures, `strings.test.ts` with the pseudo-locale, the consumer fixture, baselines. Done (§14.5). |
| 6 | Performance | 2, 3, 5 | `perf-production` and `perf-idle`, measurement, tuning (§11.3), size limits and their reasons |
| 7 | Workbench | 2 to 4 as they land | Stories, the three examples, the two guides, the Application shell additions |
| 8 | Hardening and release readiness | 6, 7 | Review of every new render in forced colors, RTL, 200% zoom, and 375px; docs polish; the SPEC §18 walk; the manual checklist; the amd64 baseline run; `SPEC.md` updated; API audit |

Packages 2 and 3 can proceed in parallel after package 1, and package 4 follows them because it needs their messages. The gallery in package 5 is extended as each component lands, so each package's own tests already run against it.

Package 8 does these in particular:

- Reviews the renders of the new group in all four projects (forced colors, right-to-left, 200% zoom at 187px, 375px), as Phase 3 §11.12 did, and records the defects found with their tests.
- Walks the SPEC §18 checklist (§16), and the SPEC §15 list against the workbench, and records each gap as closed or handed to the owner.
- Prepares the manual assistive-technology checklist in the workbench: NVDA with Firefox and Chrome on Windows, VoiceOver with Safari on macOS and on iOS, and TalkBack with Chrome on Android, over these scenarios: a slot grid and its selection; tabs; a window and a dialog (focus in and out); a toast stack's two live regions; a form with a validation message; a popover menu; a stat that announces; and removing a connection row with the focus move. The results table is filled in by the person who runs it, and failures become issues (decision 18).
- Runs the "Update visual baselines" workflow on amd64 and compares its files with the committed ones, and records whether they match.
- Updates `SPEC.md` (below).
- Reviews `api.snapshot.json` as the 1.0 surface: every name documented in the manifest, nothing public that should not be, and every deprecation (none expected) marked with `@deprecated` and a development warning (SPEC §16).

`SPEC.md` is updated, when each package starts and again in package 8: §7.4 (the stat's properties, slots, and parts; the row's slots, `punk-remove`, and the remove button), §2 goal 5 and §5.1 (Lit Localize as a dependency beside Lit), §13 (localization with Lit Localize and the locales package), §17 (the Phase 4 text: the sound adapter comes out of it and stays the later, optional adapter that SPEC §6.5 describes, and the locales package is named), and §19 if the acceptance scenario gains a localization sentence.

### 14.1 Work Package 1 Notes

- **The spike (§9.2).** `lit-localize extract` and `build` run against TypeScript 6.0.3 and against core's `.ts` import specifiers: 18 messages are found, and `build` writes a module for each of the five locales. The tool asks for `typescript ~5.9`, and the root `overrides` entry `"typescript": "$typescript"` did not apply to it, so npm installed a second copy under it. An explicit entry for the tool (`"@lit/localize-tools": { "typescript": "$typescript" }`) does, and `check:toolchain` passes with one version, 6.0.3. No isolated install is needed.
- **`@lit/localize` 0.12.2 in core, `@lit/localize-tools` 0.8.2 in `packages/locales`.** The package entry cost 1.7 kB in the shared runtime and in every entry (its runtime has top-level effects, and it has no `sideEffects` flag), so core imports `msg`, `str`, and the status event from the files that define them, through `internal/localize.ts` (§7.1). `lit-localize extract` finds the calls all the same.
- **Messages.** The 18 keys that components render are now `msg()` calls with an explicit id and a description; `moreActions` was in the type and used nowhere, so it is dropped. `t`, `format`, `setStrings`, `resetStrings`, `StringKey`, `utilities/localize.ts`, and its node test are gone, and so is the `setStrings` export of the package root. Slot and item stack share one `invalidText()` in the receptacle base. The `increase` and `decrease` descriptions say that the text is a tooltip and is not announced, since the stepper is hidden from assistive technology.
- **The new messages of §7.5 are not in yet.** Extraction follows the calls, and a message with no caller would be a dead unit, so each arrives with the component that renders it (packages 2 and 3).
- **`check:strings`.** `packages/locales` holds `lit-localize.json`, the XLIFF for the five locales (18 source units each, with no targets yet), and `scripts/check-strings.ts`, `xliff.ts`, and `source-check.ts`; `npm run check:strings` runs at the root, and `npm run extract` in the package updates the XLIFF. Mutation-checked: a call with no `id`, with no `desc`, and with a reworded source each fail it. The missing `desc` was first missed: the extraction keeps the note that a unit already has, so the source check was added (§7.2).
- **`locale-watch`.** The first version put the watcher in `PunkElement`, which re-rendered every component and cost 0.3 kB in entries with no message. It is now a controller in the nine classes that render one. The listener is kept once added, not removed with the last host: a component that returns after all others had gone could not otherwise tell it had missed a locale. Tests: 11 in `locale-watch.test.ts` and `locale-watch.listener.test.ts`, with a table that mounts each message-rendering component, switches the locale, and switches back. Mutation-checked: a host never removed, `ready` ignored, the button without its watcher, and no redraw on return each fail. `perf-shell.test.ts` ignores `lit-localize-status` by name.
- **Sizes (gzip).** Shared runtime 8.37 to 8.20 kB. The controller and `msg` cost 0.47 kB in each entry that renders a message, which a new entry, "Localization runtime and locale watcher", records (limit 0.55 kB). Entries over their old limit: slot 4.77 (limit 4.8), item stack 6.47 (6.5), recipe 5.32 (5.4), meter 4.96 (5), window 7.50 (7.6), toast pair 6.32 (6.4), text field 5.67 (5.7), number field 6.56 (6.6), select 6.15 (6.2), icon button 7.79 (7.85). The recipe is over the 5 kB of SPEC §14.3 by that 0.47 kB, for the reason that the Lit Localize runtime is counted in each entry that renders a message, and an application that imports several pays it once.
- **`stat-format.ts`** is as §7.3, with these differences: it takes no `unit`, since the unit is never formatted (decision 3), and a compact value with `decimals` limits the fraction digits to it without a minimum. 16 node tests, in `en`, `de`, `ar`, and `ja`, against `Intl.NumberFormat` output; mutation-checked on the zero-change rule and on compact changing the full text. `formatNumber` and `formatPercent` moved to `utilities/number-format.ts`, which `locale.ts` re-exports, so node can run the formatter without the DOM.
- **`readout.ts`** has `.readout` and `.readout-muted`, and a 2px forced-colors border from `forcedColorsSurface`. Three browser tests (every theme and density, any surface behind it, forced colors) fail without the inset surface. Its file is left out of the shared runtime's size entry.
- **`check:api`.** `scripts/api-snapshot.ts` describes the 30 elements (attributes, properties, methods, events, slots, parts, CSS properties, with each type and default) and the `exports` keys, and `api.snapshot.json` holds them. A removed, added, or changed name fails, and `npm run check:api -- --update` rewrites the file. Six node tests; mutation-checked by renaming a part.
- **Elsewhere.** The test locale for the components' own tests is `test/browser/locale.ts`, configured once per page, and the component tests that used `setStrings` use it. The consumer fixture configures Lit Localize from its own `@lit/localize`, and the integration guide's translation section describes `msg`, `configureLocalization`, and the 18 ids. `SPEC.md` is updated for goal 5, §5.1, and §13, and CI runs `check:strings` and `check:api` after `check:contrast`.
- **Gates.** `check:toolchain`, `lint`, `format:check`, `typecheck`, `build`, `check:contrast`, `check:strings`, `check:api`, `check:package` (the recipe sentinel is now `can craft `), `check:size`, `test:node` (203 in core, 14 in the locales package), `check:consumer`, `check:frameworks`, the workbench build and smoke test (136 entries), `visual.ts check` (1036 passed, with no baseline changed), and the full browser suite in Chromium (84 files, 1718 tests) and, on Linux in the pinned image in Chromium, Firefox, and WebKit, 252 files and 5127 tests passed, 36 skipped.

### 14.2 Work Package 2 Notes

- **The stat** is `components/production-stat/` (class, styles, `register.ts`, `index.ts`), exported from the package root with `ProductionStatLayout` and `ProductionTrend`. It is one readout plate (`.readout`), with the label and icon in a head row, the figures (value, unit, trend, change) in a wrapping row, and the sparkline slot under them. Its messages are `statNoValue`, `trendUp`, `trendDown`, and `trendFlat`, so the XLIFF has 22 units, and `check:strings` passes. `visuallyHidden` moved from `styles/receptacle.ts` to `styles/visually-hidden.ts`, since the stat uses it too.
- **The icon follows the label in the DOM** and is put before it on screen with `order: -1`, so the label is read first. The change is shown with its sign and no unit, since the unit belongs to the value; a ratio with `delta-percent` is shown as a percentage.
- **Figures that keep their width.** The first version used `font-variant-numeric: tabular-nums` alone, and 1,111 measured 52.2px and 8,888 55.4px in Chakra Petch, which has no tabular figures. The value, unit, and change are set in `font-mono` (as the item stack's count and the slider's value are) with `tabular-nums` kept, and the width test loads the font as a page would. The reserved width is `4ch` of that font.
- **Development warnings**, once for each occurrence: no `label`, a `decimals` outside 0 to 6 (through `resolveStat`), and an unnamed, not-hidden `svg`, `canvas`, or `img` in `sparkline`.
- **Gallery.** `fixtures/gallery.ts` gains `productionNames` and the `production` group with eight stats (plain, compact with a percentage change, down, flat, announcing with a sparkline, no value, inline with an icon, and a 12-character value inline), so the axe suite (all themes and densities), the reflow test (187 to 512px), and the manifest checks already cover it. The visual matrix's group list, its baselines, the consumer fixture, and the ARIA snapshots stay with package 5, and the stories with package 7.
- **Tests.** 41 in `production-stat.test.ts` and `.registration.test.ts`, and a row for the stat in the locale-watch table. Mutation-checked, each change failing a test: no tabular figures, no reserved width, no mono font, no icon order, a flipped up shape, no wrapping in `inline`, no role restore (this one survived first: the test now sets a role after `announce` is turned off and updates again), `role="alert"`, no plate, a compact value not hidden, no label warning, no sparkline warning, no change shown, a visible glyph, and `inline` ignored. One change survives and is equivalent: the forced-colors glyph fill `CanvasText` against `currentColor`, since the text color is `CanvasText` there.
- **Sizes (gzip).** `punk-production-stat` 4.96 kB of 5, with the localization runtime counted (0.47 kB); the first build was 5.05 kB, so the descriptions and a few declarations were shortened and no exception is taken. The shared runtime stays at 8.20 kB, with `visually-hidden.js` left out of its entry as `readout.js` is.
- **Repairs found on the way.** `check:package`'s status light sentinel was `"announce"`, which the stat now contains, and is `The text carries the meaning`. ESLint's `no-unused-private-class-members` flagged the nine `#localeWatcher` fields of package 1 (a controller adds itself in its constructor, so the field is never read), and is off for that reason. `check:api` has 31 elements.
- **Gates.** `check:toolchain`, `lint`, `format:check`, `typecheck`, `build`, `check:strings`, `check:api`, `check:package`, `check:size`, `test:node` (203 and 14), `check:consumer`, `check:frameworks`, the workbench build and smoke test (136 entries), `visual.ts check` (1036 passed, no baseline changed), the full browser suite in Chromium (86 files, 1767 tests), and, on Linux in the pinned image in Chromium, Firefox, and WebKit, 258 files and 5274 tests passed, 36 skipped.

### 14.3 Work Package 3 Notes

- **The row** is `components/connection-row/` (class, styles, `register.ts`, `index.ts`), exported from the package root with `ConnectionDirection`, `ConnectionStatus`, and `PunkRemoveDetail`; `punk-remove` is declared on `HTMLElementEventMap`. It is one readout plate holding the nodes (source, the arrow with its hidden word, destination), the details, the status, and the remove button, in that DOM order. Its four messages are `connectionTo`, `connectionFrom`, `connectionBoth`, and `removeConnection`, so the XLIFF has 26 units, and `check:strings` passes. The remove name reads the slots into `source` and `destination` before the call, so the XLIFF placeholders are named `${source}` and `${destination}`.
- **The container is the host,** not the plate. The query has to see the width of the whole row (360px), and the plate's content box is narrower by its padding, which a container query cannot subtract from a token. The host is a block, so it has the definite inline size that the query needs.
- **The arrow is one 16px square,** drawn with `clip-path` and turned with `rotate` from `--_turn`: 0 or 180 degrees by direction and writing direction, and 90 or -90 when the nodes are stacked, in either writing direction. `both` has its own shape and is not turned except to point down. The rules inside the query repeat the right-to-left selectors, since those are the more specific.
- **Status.** The shape comes from `status-shape.ts` as the status light's does. A `neutral` row draws no status block unless it has text; a non-neutral row with no text draws the shape alone, with no gap after it, and warns.
- **The shared close button** gained an optional `disabled`, which the row passes, and the row draws the disabled button (`color-disabled-fill`, `color-disabled-text`, `GrayText` under forced colors). The window and the toast do not pass it, and their sizes did not move.
- **The name** is read with `textContent` of the slotted elements, with whitespace collapsed, and it is read again on every `slotchange`, including a change of the details or the status, since the row cannot tell which slot a node left. A text edit inside a slotted node is not a slot change, so `remove-label` is the way (decision 6).
- **Listeners.** The row adds one listener, `click` on its button. Its slots have `slotchange` listeners in the shadow tree, as every component's do; criterion 15.3.10 is read as no listener on the host, `document`, or `window`, and the test says so.
- **Development warnings**, once for each occurrence: no `source` and no `destination` with no `remove-label` (whether or not the row is removable), and a status other than `neutral` with no `status` text. An unknown `direction` or `status` is drawn as `forward` or `neutral` without a warning, as the status light does.
- **Gallery.** `productionNames` gains `connection-row`, with seven rows (neutral, backward with details, both with `info`, `success` with details, `warning` disabled, `danger` with a `remove-label`, and `neutral` with status text), so axe in every theme and density, the reflow test at 187 to 512px, and the manifest checks already cover it. The visual matrix's group list, baselines, the consumer fixture, and the ARIA snapshots stay with package 5, and the stories with package 7.
- **Tests.** 63 in `connection-row.test.ts` and `.registration.test.ts`, and a row for it in the locale-watch table. Mutation-checked, each change failing a test: the right-to-left flip, the backward turn, the stacked turn, the threshold, the button's place when stacked, no wrapping of the nodes or the details, no disabled color, no full-width lines, no column of nodes, the event's value, the disabled flag, no update on `slotchange`, `remove-label` ignored, a button that is always drawn, a status that is always drawn, each of the two warnings, a visible arrow, whitespace not collapsed, the details always shown, an event that does not bubble, a visible status label with no text, and a forced-colors arrow in another system color. The disabled flag of the shared button fails four tests when removed.
- **Sizes (gzip).** `punk-connection-row` 5.19 kB, with a limit of 5.25 kB: this is the exception that §11 allows, for the reason given there: the close button and the status shapes are 3.38 kB of it, as their shared entry says, and the localization runtime is 0.41 kB more. The shared runtime stays at 8.20 kB, and no other entry moved.
- **Gates.** `check:toolchain`, `lint`, `format:check`, `typecheck`, `build`, `check:contrast`, `check:strings`, `check:api` (32 elements), `check:package`, `check:size`, `test:node` (203 and 14), `check:consumer`, `check:frameworks`, the workbench build and smoke test (136 entries), `visual.ts check` (1036 passed, no baseline changed), the full browser suite in Chromium (88 files, 1835 tests), and, on Linux in the pinned image in Chromium, Firefox, and WebKit, 264 files and 5481 tests passed, 36 skipped.

### 14.4 Work Package 4 Notes

- **The translations** are in the five XLIFF files: 26 units each, written as original drafts for German, French, Spanish, Japanese, and Arabic, and kept in place by `lit-localize extract`, so `check:strings` still passes. Decision 9 was followed: `craftable` is a label and a number (`quantité fabricable : 3`, `${times}-mal herstellbar`), not a plural form, and the French messages keep a no-break space before a colon, which `check:locales` allows inside a message. The toast's `dismiss` is not the window's `close` in German, French, and Spanish (`Ausblenden`, `Ignorer`, `Descartar`). The direction words are the weakest part, since they stand between two nodes the application names (`nach`, `von`, `nach und von`), and a reader of each language is asked about them first.
- **The package** is `src/index.ts` (`sourceLocale` and `targetLocales` from the generated `locale-codes.ts`, so `lit-localize.json` is the one list, and `locales`, `loadLocale`, `mergeLocaleModules`), `src/locales.ts` (the metadata, which `document.ts` imports alone), `src/document.ts`, and `de.ts`, `fr.ts`, `es.ts`, `ja.ts`, `ar.ts`, each a re-export of its generated module. `locales` also lists `en`, with the status `reviewed`, since `bindDocumentLocale` needs its `dir` to put a page back to left to right; it has no XLIFF, and `check-locales` skips the rules that need one. An unknown locale sets `lang` and leaves `dir` as it was. `loadLocale` uses `Object.hasOwn`, so `toString` and `__proto__` reject like any unknown code.
- **Building.** `npm run build` runs `lit-localize build`, `tsc`, and `check:locales`. `src/generated/` is not committed, so `typecheck` and the two test scripts generate it first (`pretest:node`, `pretest:browser`). The generated modules import `str` from `@lit/localize`, which is the package's peer dependency and which the size entries leave out. The package's `tsconfig.json` includes core's sources, since its browser test imports core's gallery, and ESLint ignores `generated/`.
- **`check:locales`** is `scripts/locale-rules.ts` (the pure rules, apart from `check-locales.ts`, so each can be tested on a fixture) and the runner. It fails on a missing, empty, or blank target; a unit that the other files have and this one has not, and the reverse; a `target-language` that is not the file's locale; placeholders that differ as a set; leading or trailing whitespace (a no-break space included); a control character; each of U+202A to U+202E and U+2066 to U+2069; a code that is not canonical; a locale with no XLIFF or one that is not a target; a status that is not `draft` or `reviewed`; and a `dir` other than `Intl`'s (`getTextInfo`, then `textInfo`). 16 node tests, one for each rule, and one that the shipped files pass.
- **Tests.** 14 node tests for the loader and the merge (each language resolves with the XLIFF's ids and targets, a placeholder message keeps its values, English and `toString` and `__proto__` reject, the merge order, no mutation of an input, an application overriding one id) and 33 browser tests in all three engines (`test/browser/apply.test.ts`, not `test/apply.test.ts`, so the node glob does not pick it up): each language loads in a browser; `bindDocumentLocale` sets `lang` and `dir` for each language and for English again, ignores a status that is not `ready`, stops when removed, adds and removes exactly one listener, and takes an element; a toast, a stat, and a row say the module's words in each language, differ from English, and return to it; and for each language the gallery passes axe in the short and long variants, with `html-has-lang`, `html-lang-valid`, and `valid-lang` passing on the page, and stays inside 187 to 512px. The reflow test leaves the page left to right, as core's does: the toast stack and the popover are placed against the viewport, and an Arabic page would put them beyond the frame.
- **Mutation-checked,** each change failing a test: every rule of `locale-rules.ts` (13 changes), the loader's own-property check, the merge order, a merge that changes its input, a missing language, `bindDocumentLocale` with no status check (first missed, since the test sent no locale with the loading event), with no `dir`, with no `lang`, and with a remover that does nothing. In the files: a removed, empty, or placeholder-less target, trailing whitespace, a bidirectional override, and a wrong `target-language` each fail `check:locales`; `sideEffects: true`, an export dropped, and a language imported statically (so that the loader's entry chunk holds it) each fail the package check; and a 216-character word in one German message fails the axe and reflow tests.
- **Packaging.** `check:package` (`scripts/check-package.ts`, then `publint --strict` and `attw`) requires `sideEffects: false`, exactly the seven entries of §9.1 with their files, no registration and no import but `@lit/localize`, and, through esbuild with splitting, that the loader's entry holds no language, each language is its own chunk, each language's bundle holds only itself, and `document` holds no language and no loader. The root `check:package` and `check:size` now run over every workspace, and the root has `check:locales`.
- **Sizes (gzip).** `de` 0.62 kB, `fr` 0.60, `es` 0.58, `ja` 0.75, `ar` 0.75 (each at most 1 kB), the loader 0.81 (at most 1 kB, with the five languages left out of it by name), `document` 0.33 (at most 0.5). `@lit/localize` is left out of each as the peer. Core is unchanged.
- **Not in this package.** The pseudo-locale and `strings.test.ts`, the consumer fixture with `@dieselpunk/locales`, and the Localization guide belong to packages 5 and 7. `visual.ts check` was not run: nothing in core changed.
- **Gates.** `check:toolchain`, `lint`, `format:check`, `typecheck`, `build`, `check:contrast`, `check:strings`, `check:locales`, `check:api`, `check:package`, `check:size`, `test:node` (203 in core and 44 in the locales package), `check:consumer`, `check:frameworks`, the workbench build and smoke test (136 entries), and, on Linux in the pinned image in Chromium, Firefox, and WebKit, core's 264 files and 5481 tests (36 skipped) and the locales package's 99 (33 in each engine).

### 14.5 Work Package 5 Notes

- **Gallery.** The `production` group has the states of §13.4: fourteen stats (a plain and a compact 1,234,567.89, no value, each trend with and without a change, a percentage, announcing with a sparkline, inline with an icon and a sparkline, a 12-character value inline, and inline with no value) and sixteen rows (each direction, each status with and without text, details, removable, a `remove-label`, disabled, long node names), two of them in a 320px box so that the nodes stack. Axe in every theme and density, the reflow test at 187 to 512px, and the manifest checks run over it. The reflow test's limit went from 60 to 120 seconds: the larger gallery made two Firefox and WebKit runs time out on Linux, and none was a real overflow.
- **Contrast surface (§6, 15.6.2).** `test/browser/production-surface.test.ts` walks every text node and glyph of both components, through shadow roots and slots, resolves the first opaque background behind each, and requires `panel-inset` and the contrast of §6 (4.5:1, 7:1 in `high-contrast`, 3:1 for a shape), in the four themes and both densities. It requires more than 60 text nodes and 20 glyphs, so a walk that found nothing fails, and it has a control that takes the plate away with a style sheet. The remove button's X is left out, since it is on its own raised face, as the window's and the toast's are. A ring is read from its border. Mutation-checked: the plate rule removed fails 7 of 10 tests. Changing the plate's text color to `text-muted` survives, since muted text also meets the contrast; the test is about the surface.
- **Pseudo-locale (§13.5).** `scripts/pseudo.ts` (pure: each source in ⟦ ⟧ and 40% longer with `·`, placeholders as they were) and `scripts/build-pseudo.ts` (writes `en-x-pseudo.xlf` from the source units of the locales package into a temporary folder and runs `lit-localize build` into `test/browser/fixtures/generated/`, which is not committed). `pretest:browser` and `typecheck` run it, and `@lit/localize-tools` is a development dependency of core. 5 node tests.
- **`strings.test.ts`.** 33 tests. The first requires the fixtures' ids to equal the ids of the pseudo-locale module, which come from the XLIFF, so a new message with no fixture fails. Each of the 26 messages is then shown by a fixture (a window in move mode, a field after blur, a recipe, a meter in each range, and so on), set to the pseudo-locale, required to hold each fixed piece of its template, and set back to English with the same element and the same words. The scan opens the whole gallery, and each open overlay on its own, in the pseudo-locale, and lists each shadow text node and ARIA label with a letter and no markers. Six exemptions are written out with their reasons: an attribute of the host (application text), the compact count (`1.2K`), the duration of a recipe, the browser's validation message (decision 11), the options of a select, and the text of the tooltip that describes a control. A test requires every exemption to be used, so a stale one cannot hide a literal. Mutation-checked: a component with no `LocaleWatcher` (4 tests fail), a hardcoded word, and an id that the pseudo-locale lacks each fail it; the pseudo-locale without markers and with a shorter filler each fail the node tests.
- **ARIA snapshots (§13.2).** `aria.spec.ts` has 6 stats (every part, compact with the full number, no value, falling, unchanged, announcing) and 11 rows (each direction, each status, removable, with a `remove-label`, disabled), one test each, so a tree is not merged with the next one. The stat and the row have no role, so each tree is the text in reading order, and `announce` makes the stat a `status`; the button is the only role in a row's tree. They run in all four projects.
- **Visual (§13.4).** `production` is in the matrix, with the contents `short`, `long`, and `rtl`: `unlabeled` would repeat `short`, since a missing label is replaced by the same fallback, and the first run of all four was 24.8 MB, over the 20 MB of decision 16. With the cut it is 99 baselines in Chromium (17.5 MB), 15 under forced colors (2.1 MB), and 5 each in Firefox and WebKit (0.7 MB each), 20.9 MB by file size (19.9 MiB). Three interaction captures, hover, keyboard focus, and pressed on the remove button, are in every project that runs them (`interaction-connection-row-*`). They were written in the pinned image on this machine's architecture, as Phase 3's were; the amd64 comparison is package 8's. `visual.ts check` passed all 1211 tests, with no earlier baseline changed.
- **Consumer (§13.7).** `test/package/src/production.ts` builds a window with a stat, a meter, a status light, and a row from the registration entries, with a `@ts-expect-error` on a `direction` and on a `trend` that are not in their unions, one on a `reason` that `punk-remove`'s detail lacks, and a typed `punk-remove` listener on an ancestor. It configures Lit Localize from the consumer's own `@lit/localize`, binds the document, and calls `setLocale('de')`. The check now packs and installs both packages, type-checks under TypeScript 5.0.4 and 6.0.3, bundles with a metafile, and in a browser requires that the page defines exactly those five tags, that German sets `lang` and names the remove button in German, that `setLocale('ar')` sets `dir="rtl"` and a new name, that the stat shows what `Intl` gives for the page's language in each, that a click on the remove button reports `belt-1:punk-connection-row`, that nothing is logged, and that the bundle holds one copy of `@lit/localize`. The listener is on an element, since the declaration is on `HTMLElementEventMap`, as every event of the library is. Mutation-checked: no event declaration, `direction` as a `string`, and a second version of `@lit/localize` each fail it.
- **Not in this package.** The stories and the three examples (package 7), the performance gates (6), and the release record (8).
- **Gates.** `check:toolchain`, `lint`, `format:check`, `typecheck`, `build`, `check:contrast`, `check:strings`, `check:locales`, `check:api`, `check:package`, `check:size`, `test:node` (208 in core and 44 in the locales package), `check:consumer`, `check:frameworks`, the workbench build and smoke test (136 entries), `visual.ts check` (1211 passed) and its self-test (1211 passed twice, with identical output), and, on Linux in the pinned image in Chromium, Firefox, and WebKit, core's 270 files and 5610 tests (36 skipped) and the locales package's 99.

## 15. Acceptance Criteria

### 15.1 Shared Internals

1. A locale change (`setLocale`) re-renders each connected component that renders a message once, in one task, after `ready`, and a disconnected component not at all; a component that connects afterward, or returns after a change, renders in the active locale. The library holds one `lit-localize-status` listener on `window` however many components there are, and creates no observer.
2. `check:strings` fails when a message is added, removed, or reworded without the XLIFF following it, when a unit has a hash-style id or no `<note>`, and when a `msg()` call has no literal `id` or `desc`, each shown by a fixture, and passes on the committed files.
3. `resolveStat` returns the values of §7.3 for `en`, `de`, `ar`, and `ja`, equal to `Intl.NumberFormat` output, with the repairs listed.
4. The new messages of §7.5 are in the XLIFF with ids and descriptions; `t`, `format`, `setStrings`, `resetStrings`, and `StringKey` are gone from core, and no component imports them.
5. `check:api` fails on a removed part and on a removed event, passes on the committed snapshot, and `--update` rewrites it.
6. The shared runtime is at most 12 kB after this package, and the amount it grew is recorded.

### 15.2 Production Stat

1. It renders the label, the value, and the unit in that order as text in the shadow tree, with no role and no `aria-label` of its own.
2. The value is formatted for the nearest `lang`, and changes with it; `decimals` is applied and clamped with a warning.
3. `compact` shows an abbreviated value that is `aria-hidden`, and the accessible text holds the full number.
4. With no usable value it shows an en dash and the hidden word `statNoValue`.
5. A trend draws its shape and says its word; `delta` is signed, in percent with `delta-percent`; an unset `trend` follows the change, and a change that rounds to zero is `flat`.
6. The value is in tabular figures, aligned to the inline end, and reserves `--punk-stat-value-min`: a column of stats keeps the ends of its values aligned, and 1,111 and 8,888 have the same width.
7. A value of 15 characters with its unit and trend is not clipped at 187px, in either layout; `inline` wraps its value under the label where it must.
8. `announce` sets `role="status"` and restores the author's role when off; there is no role otherwise.
9. The `sparkline` slot reserves `--punk-stat-sparkline-size`, and a slotted `svg`, `canvas`, or `img` with no `aria-hidden` and no name warns.
10. Under forced colors the plate keeps its border and the three trends stay apart by shape.
11. It has no animation, transition, observer, or listener on `document` or `window`.

### 15.3 Connection Row

1. DOM order is source, direction word, destination, details, status, button, and the ARIA snapshot reads in that order in each direction.
2. The arrow follows `direction` and flips in right-to-left; the hidden word is `connectionTo`, `connectionFrom`, or `connectionBoth`.
3. A status other than `neutral` draws its shape in the inset lens and shows the `status` text; a non-`neutral` status with no text warns.
4. With `removable` the remove button is the only tab stop, is named from `removeConnection` filled with the slots' text, and the name follows a `slotchange`; `remove-label` replaces it. A row that is not `removable` has no tab stop.
5. A click, `Enter`, or `Space` on the button emits `punk-remove` with `{ value, item }`, bubbling and composed, once; the row is not removed by the component.
6. `disabled` disables the button and takes it out of the tab order; all text stays readable.
7. Below 360px of row width the nodes stack and the arrow turns; nothing scrolls sideways at 187px with long node names.
8. Under forced colors the plate keeps its border and the five statuses stay apart by shape.
9. A row with no source and no destination content, and no `remove-label`, warns.
10. It has no animation, transition, or observer, and adds a listener only to its remove button.

### 15.4 Localization Packs

1. The XLIFF for `de`, `fr`, `es`, `ja`, and `ar` has a non-empty target for every source unit, with placeholders equal to the source's, and passes each rule of §9.3; each rule fails on a fixture.
2. `loadLocale(code)` resolves to a locale module for each target locale and rejects an unknown code; `mergeLocaleModules` combines modules, a later one winning a shared id; `bindDocumentLocale` sets `lang` and `dir` on `ready`, and its remover removes the listener.
3. With the pseudo-locale active, every id in the table of `strings.test.ts` reaches the screen with its markers and returns to English after `setLocale('en')` with no element re-created; a table that lacks an id fails.
4. With the pseudo-locale active, every shadow text node and library-owned `aria-label` containing a letter carries the markers, except the exempt `Intl` text, which is listed with reasons.
5. In each real locale, the gallery passes axe and the reflow test at 187 to 512px.
6. Each locale module is at most 1 kB gzip, the loader entry 1 kB, and `document` 0.5 kB; each locale has `status: 'draft'` until reviewed (§9.4).

### 15.5 Performance

1. Every gate of §11.2 passes in Chromium, Firefox, and WebKit, and each fails when its cost is added.
2. The two new entries are within their limits, or have a documented reason for an exception; the shared runtime is at most 12 kB.
3. Every change made while tuning has its before and after recorded, and the visual check is green without a new baseline.

### 15.6 Cross-Cutting

1. The `production` group passes axe in all themes and both densities, and the reflow test at 187 to 512px.
2. Every text node and glyph of the two components resolves to `panel-inset` or its status lens as the surface behind it, in all themes and both densities, and the test fails without the plate.
3. Both components are in the manifest, with every property, attribute, event, slot, part, and CSS property declared.
4. Each component can be imported on its own from plain HTML and from the TypeScript fixture, with `punk-remove` resolving under TypeScript 5.0 and 6.0, and no `register.js` brings another family's tag.
5. `check:api` passes on the committed snapshot.

### 15.7 Workbench and Integration

1. Each new component has a docs page and story set (§12), and the three examples and the two guides are in the sidebar.
2. The smoke test renders every new entry with no console error or warning, and loads each example at 375px and 187px without sideways scrolling.
3. The dashboard example has a visible Pause updates switch that stops its timer, and its updates never move focus or announce.
4. The Interface settings example switches each locale with `setLocale`, and `lang` and `dir` follow.
5. The consumer fixture of §13.7 builds, type-checks under both TypeScript versions, and passes its browser probe.

### 15.8 Release Readiness

1. The SPEC §18 checklist is walked, with each item's evidence recorded in §14's notes (§16).
2. The manual assistive-technology checklist and its results table are in the workbench, and what was run and what was not is recorded.
3. The amd64 baseline run is compared with the committed baselines, and the result is recorded.
4. `SPEC.md` is current for §2, §5.1, §7.4, §13, and §17.
5. `api.snapshot.json` is reviewed as the 1.0 surface.

## 16. Definition of Done

Phase 4 is complete when:

1. All acceptance criteria in §15 pass.
2. All gates in Phase 1 §10, Phase 2 §10, Phase 3 §10, and §13 above pass in CI, with Chromium, Firefox, and WebKit green, on both packages.
3. The SPEC §19 scenario still passes in the consumer check, and the production fixture of §13.7 does too.
4. The SPEC §18 checklist for 1.0 is recorded item by item, each with its evidence:
   1. all components of SPEC §7.1 to §7.5 implemented and documented (the 32 components, by tag, against the manifest);
   2. a valid Custom Elements Manifest (the manifest test, and `check:api`);
   3. no serious or critical axe violation (the axe suite, over every group);
   4. keyboard behavior against the WAI-ARIA patterns (the key tests of each phase, and the manual checklist where it has been run);
   5. visual coverage of every required state and theme (the matrix, by group, with the amd64 comparison);
   6. consumption from plain HTML and TypeScript with no global setup (`check:consumer`);
   7. tree-shaken imports (`check:package`);
   8. no Factorio file, asset, or branding (a statement, and the asset policy page);
   9. the inventory workbench usable at desktop and mobile widths (the smoke test's width checks);
   10. package size and slot-grid performance within budget (`check:size`, `perf.test.ts`, and the table of every limit with its reason);
   11. light and low-density support for every stable component, including combined (the matrix).
   Anything that is not met is listed by name with the owner's decision.
5. The owner has confirmed decisions 1, 8, and 14 of §2, and arranged review of the five locales or accepted them as drafts (§9.4).
6. The manual assistive-technology checklist has been run and its results recorded, or the owner has named what is not run and accepted that for 1.0 (decision 18).
7. No asset or code in any package or in the workbench is derived from Factorio files.
8. Every script runs as `node <file>.ts` on Node 26, and `npm ls typescript` reports exactly one version, 6.0.x, with `lit-localize` running as §9.2 records.
9. `SPEC.md` is updated as §14 lists, and this document's status line and work-package table are marked, with a notes section for each package, as Phase 3's are.

## 17. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| The translations are drafts, and a wrong or unnatural string in a game UI is a visible defect | Each locale has `status: 'draft'`, the gate checks structure and not meaning, and review by a native reader is part of the release record (§9.4, §16). A locale that is not reviewed can be left out by removing its entry and its XLIFF, without touching core |
| Components that render a message re-render on a locale change, which is wasteful for a page of thousands | Once per change, one render each, behind one `window` listener, and §11.2 asserts it. Components that render no message add nothing |
| Lit Localize has one active locale per page, so a page with two languages shows one message set (decision 11) | Said in the Localization guide. Numbers and layout still follow each subtree's `lang` and `dir`. A per-subtree locale is a possible later addition and is not a breaking change |
| `@lit/localize-tools` may not run against TypeScript 6, the only version the repository allows | Package 1 begins by checking (§9.2). The fallback is an isolated tool install outside the workspaces, and nothing of the tool reaches an application |
| Localization is configured in module state, so two copies of `@lit/localize`, core's and the application's, leave the library in English with no error | One dependency range that npm dedupes, the guide says to check `npm ls @lit/localize`, and the consumer check fails when two copies resolve (§13.7) |
| `lit-localize extract` keeps an old translation under an id when the English meaning changes | A change of meaning gets a new id (decision 9), the changed `<source>` shows in the diff, and the guide says so |
| Core now has a runtime dependency beyond Lit (SPEC §2 goal 5) | `@lit/localize` is Lit's own library, `msg` and its controller cost about 0.47 kB in each entry that renders a message, and the entries' limits say so (§14.1), and the owner confirms decision 1 before work starts |
| `content-visibility: auto` changes find-in-page, focus, and scroll anchoring in some browsers | It is opt-in through a custom property, off by default, and the Performance guide lists what was tested and what was not (§11.3) |
| A list of many rows has many tab stops, one remove button each | Documented in the row's page and the Performance guide: a long list is paged, filtered, or virtualized by the application, and removal moves focus on purpose. Phase 4 adds no list component, since the list is application state |
| A stat that announces on every update is noisy for a screen reader user | `announce` is off by default, the guide says to use it for infrequent changes, and the dashboard example announces nothing |
| The API snapshot turns every API edit into a diff to review, which may feel heavy before 1.0 | The gate stops only unrecorded changes: `--update` is one command, and the review is the point (decision 14). The owner can drop it before 1.0 without touching anything else |
| The manual checklist depends on people and devices CI does not have | It is a checklist and not a gate (decision 18), with a results table, and the release record names what was and was not run |
| A new package adds publishing surface to maintain | It has no runtime dependency, two peer dependencies, `sideEffects: false`, and the same `publint` and `attw` gates as core |
| The remove button's name is built from slotted text that can change without a `slotchange` | `remove-label` is the supported way to give a stable name, and the page says when to use it (decision 6) |
