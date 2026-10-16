# Phase 1: Foundation — Implementation Specification

**Status:** Draft 1. Work packages 1 (scaffolding), 2 (tokens, themes, density), 4 (`punk-panel`, `punk-divider`), 5 (`punk-tooltip`), 6 (`PunkButtonBase`, `punk-button`, `punk-icon-button`), 7 (`punk-progress-bar`), and 8 (the Storybook workbench, with manifest generation) are implemented, as are `token()`, the base styles, surfaces, texture, focus ring, forced-colors helper, density helper, slot presence, registration helper, localization, locale resolution, the dev flag and `devWarn`, positioning, and `PunkElement` from work package 3. Sections 12.1 (Foundations), 12.2 (Panel), 12.3 (Divider), 12.4 (Button), 12.5 (Icon Button), 12.6 (Progress Bar), and 12.7 (Tooltip) pass on Chromium, Firefox, and WebKit. Section 12.8 (Workbench) is implemented and verified by a build and a smoke test of every entry. Work package 9 (test infrastructure) is implemented: the manifest assertions, the axe suite, the package, size, and consumer gates, the story smoke test, and the visual harness. The visual baselines are committed, rendered by CI on all three engines. Remaining: hardening (work package 10). `punk-button` and `punk-icon-button` shipped with the boundary-contrast gap in §6.8 still open, by decision.
**Parent:** [SPEC.md](SPEC.md), SPEC §17 (Delivery Phases)
**Package:** `@dieselpunk/core`
**Prefix:** `punk-`

References written `SPEC §N` point to `SPEC.md`. Bare `§N` references point to this document.

## 1. Scope

### 1.1 Deliverables

1. Monorepo scaffolding, build, lint, test, and CI.
2. Design tokens, four color themes, and two density modes (§6).
3. Shared surface, focus, and forced-colors styles.
4. Six components: `punk-panel`, `punk-divider`, `punk-button`, `punk-icon-button`, `punk-progress-bar`, `punk-tooltip`.
5. A Storybook-based documentation workbench (SPEC §15).
6. Generated Custom Elements Manifest, accessibility gates, visual regression, and bundle-size gates.

### 1.2 Out of Scope

- Inventory components (`punk-slot`, `punk-item-stack`, `punk-slot-grid`, `punk-recipe`, `punk-meter`, `punk-status-light`); Phase 2.
- `punk-window`, `punk-dialog`, `punk-popover`, form controls, tabs, toolbar, toast; Phase 3.
- A published icon package. Core ships no icons; the workbench contains a small original icon set for demos only.
- Framework integration guides for React, Vue, and Svelte; Phase 3 (SPEC §17), although SPEC §15 lists them for the finished docs site.
- Sound adapter, locale packs, `punk-stack`, `punk-cluster`.

### 1.3 Outcome

A consumer can install the package, import any of the six components individually, apply a theme and density with two HTML attributes, and get accessible, tested, tree-shakeable components that match the visual language in SPEC §4 and SPEC §6.

## 2. Resolved Ambiguities

These decisions close gaps or conflicts in `SPEC.md` that affect Phase 1. Where a decision changes parent-spec wording, `SPEC.md` should be updated when Phase 1 starts.

| # | Topic | Decision |
|---|-------|----------|
| 1 | Workbench technology | Storybook (`@storybook/web-components-vite`), in `apps/storybook`, matching the layout in SPEC §5.2. |
| 2 | Workbench first screen | SPEC §15 requires inventory components on the first screen. They do not exist until Phase 2, so Phase 1 opens on a "Foundations" overview composed of panel, button, progress bar, and tooltip. Phase 2 replaces it. |
| 3 | "Native progress semantics" (SPEC §7.4) | Means the ARIA `progressbar` role. The component renders custom markup, not `<progress>`, because native progress styling is inconsistent across engines. |
| 4 | Focus ring (SPEC §4.2 "not removed in mouse mode") | The ring renders on `:focus-visible`. Components never set `outline: none` without an equivalent replacement. |
| 5 | Focus ring colors | SPEC §6.2 hard-codes hex values in `--punk-focus-ring`, which cannot adapt to themes. `--punk-focus-ring` is removed; the ring is composed at use site from `--punk-color-focus-inner` and `--punk-color-focus` (§6.4). |
| 6 | `reduced-texture` | A value of `data-punk-theme` (as SPEC §6.2 lists it). `--punk-texture-opacity` and `--punk-surface-gradient-strength` are also overridable on any theme. |
| 7 | Touch target (SPEC §9.2, 40x40) | Compact `md` controls are 36px tall. Under `@media (pointer: coarse)` they extend their hit area to at least 40px with a transparent pseudo-element; visuals do not change. |
| 8 | Button `type` default | `'button'`, not the native `'submit'`, to prevent accidental form submission. |
| 9 | Core fonts | Core bundles no font files. The workbench loads Chakra Petch and IBM Plex Mono (SIL OFL) from `@fontsource` as dev dependencies. |
| 10 | Dev-only warnings | Gated by Lit's `development` export-condition technique (§5.4), not `process.env`. |
| 11 | TypeScript version | TypeScript 6.0 (`~6.0`). `typescript-eslint` supports `<6.1.0`, and npm's `latest` is now TypeScript 7, which is therefore not used until `typescript-eslint` supports it. |
| 12 | Script execution | Node 26 runs `.ts` scripts directly through native type stripping; there is no `tsx`, `ts-node`, or script build step. This imposes the source rules in §3.1. |
| 13 | Language target | `ESNext` for both `target` and `module`. Output is not downleveled (§3.1). |

## 3. Toolchain

Use the current stable major version of each tool when implementation starts, and record exact versions in lockfiles.

| Concern | Choice |
|---------|--------|
| Package manager | npm workspaces |
| Runtime (development and CI) | Node.js 26 (`engines.node: ">=26"` on the private workspace root, `.nvmrc` containing `26`). Not an engine constraint on the published package, which is browser code. |
| Language | TypeScript 6.0 (`~6.0`), `strict`, `target: ESNext`, `module: ESNext`, `experimentalDecorators: true`, `useDefineForClassFields: false` (Lit's documented configuration) |
| Rendering | Lit 3 (regular dependency of core) |
| Module build | `tsc` emitting unbundled ESNext modules and `.d.ts` into `dist/`, mirroring `src/`, with `rewriteRelativeImportExtensions` (§3.1) |
| CSS artifacts | TypeScript script (`scripts/build-css.ts`) run directly by Node, generating CSS from the token source |
| Unit/DOM tests | Vitest 5 browser mode with the Playwright provider: Chromium, Firefox, WebKit |
| Accessibility tests | `axe-core` |
| Visual regression | Playwright `toHaveScreenshot` against a fixture page |
| Manifest | `@custom-elements-manifest/analyzer` |
| Workbench | Storybook for web components and Vite; `@wc-toolkit/storybook-helpers` for manifest-driven API tables |
| Lint/format | ESLint (`typescript-eslint`, `eslint-plugin-lit`, `eslint-plugin-wc`), Prettier; `typescript-eslint` is the constraint that pins TypeScript to 6.0 |
| Package checks | `publint`, `@arethetypeswrong/cli` |
| Size checks | `size-limit` with an esbuild plugin, Lit marked external |

### 3.1 TypeScript, ESNext, and Node Type Stripping

**Language target.** `target` and `module` are `ESNext`. Emitted modules are not downleveled, so source must use only syntax and APIs available in the browser baseline (SPEC §5.1). `lib` is `["ESNext", "DOM", "DOM.Iterable"]`.

**Two compilation contexts.** Code runs in one of two ways, and the rules differ:

| Context | Files | Executed by | Rules |
|---------|-------|-------------|-------|
| Library and browser code | `src/**`, `test/browser/**` | `tsc` build (`tsconfig.build.json`, which excludes `*.test.ts`); Vite/esbuild for tests and Storybook | Decorators, enums, and other TypeScript-only syntax are allowed |
| Node-run code | `scripts/**`, `test/*.test.ts`, `vitest.config.ts`, and the data-only token modules `src/tokens/{base,themes,density}.ts` | Node 26 directly (`node scripts/build-css.ts`) | Erasable syntax only, as below |

**Rules for Node-run code.** Node strips type annotations without transforming anything else, so these files must follow `tsconfig.scripts.json`:

- `erasableSyntaxOnly: true`: no `enum`, `namespace` with runtime content, constructor parameter properties, or `import x = require()`. Use `as const` objects and union types instead of enums.
- `verbatimModuleSyntax: true`: type-only imports and exports use `import type` / `export type`.
- Relative imports include the real `.ts` extension (`allowImportingTsExtensions: true`).
- `module: "nodenext"`, `moduleResolution: "nodenext"`, `noEmit: true`.
- The token data modules import neither Lit nor any DOM API, so scripts can load them in plain Node. `tokens/token.ts` (which uses Lit) is not imported by scripts.
- Scripts are ES modules (`"type": "module"`) and use `node:`-prefixed built-ins.
- `@types/node` matches Node 26.

**Shared source.** The token data modules are consumed by both contexts. They follow the stricter Node-run rules, and `tsc` compiles them for the library with `rewriteRelativeImportExtensions: true`, which rewrites `.ts` specifiers to `.js` in `dist/`.

**Type checking.** Node does not type-check. `npm run typecheck` runs `tsc` for both `tsconfig.json` (library and browser tests, `noEmit`) and `tsconfig.scripts.json` (Node-run code), and CI fails on errors in either. `tsconfig.build.json` extends `tsconfig.json` to emit `dist/` from `src/` only.

**Version pin.** `typescript` is declared as `~6.0` in the workspace root only, with no other workspace declaring its own copy. TypeScript 7 has no JavaScript API and is incompatible with `typescript-eslint` (peer range `>=4.8.4 <6.1.0`), so it is not used. Other tools that load the TypeScript JavaScript API (Storybook, the Custom Elements Manifest analyzer) were checked against 6.0 in work package 8: Storybook does not depend on TypeScript, and the analyzer pins `typescript@~5.4`, so the root `package.json` declares `"overrides": { "typescript": "$typescript" }` to force the single 6.0 copy. The analyzer runs correctly on it, and the toolchain gate confirms one version. `npm ls` reports the analyzer's `~5.4` range as invalid, and that is expected.

## 4. Repository Layout

```text
package.json                    private workspace root (engines.node >=26)
.nvmrc                          26
tsconfig.base.json
tsconfig.scripts.json           Node-run code: scripts/, token data modules, tests; noEmit, erasableSyntaxOnly
eslint.config.js
.prettierrc.json
.github/workflows/ci.yml
scripts/
  check-toolchain.ts            Node 26 and single TypeScript 6.0.x gate
packages/core/
  package.json
  tsconfig.json                 library and browser tests, noEmit
  tsconfig.build.json           emits dist/ from src/, excluding tests
  vitest.config.ts              browser mode, engines via PUNK_BROWSERS, setColorScheme and setForcedColors commands
  custom-elements-manifest.config.mjs   analyzer config; `npm run build:manifest` writes custom-elements.json (git-ignored, published)
  scripts/
    build-css.ts                tokens → dist/css/*.css (run as: node scripts/build-css.ts)
    render-css.ts               pure CSS renderers shared by build-css.ts and tests
    check-contrast.ts           theme contrast gate (§6.8)
    check-package.ts            exports/side-effect/tree-shake gate; run with publint and attw (§10.4)
    check-consumer.ts           packs the package, installs it into throwaway projects, type-checks and runs the fixture (§10.4)
    build-visual.ts             bundles test/visual/matrix.ts into static files; runs on the host, never in the container
    serve-visual.ts             static server for that output
    visual.ts                   check, update, and selftest for the visual tests, in the Playwright image (§10.3)
  .size-limit.json              size budgets (§10.4)
  playwright.config.ts          visual tests: Chromium, Firefox, WebKit
  src/
    index.ts                    class exports only; no registration
    tokens/
      base.ts                   non-color tokens (compact defaults)
      themes.ts                 color sets per theme
      density.ts                low-density overrides
      token.ts                  token() helper (§6.3)
    styles/
      base.ts                   host reset
      density.ts                lowDensityTokens, compactDensityTokens for a local density property
      surfaces.ts               raised, inset, flat
      focus.ts                  focus ring
      texture.ts                tiled SVG noise data URI
      forced-colors.ts          forced-colors fallbacks
    internal/
      punk-element.ts           PunkElement base class
      button-base.ts            shared by button and icon-button
      slot-presence.ts          reactive "has slotted content"
    utilities/
      register-element.ts
      localize.ts               default strings + setStrings()
      locale.ts                 resolveLang(element), formatPercent(ratio, lang)
      position.ts               tooltip placement/flip/shift
      dev.ts / dev.dev.ts       PUNK_DEV flag (§5.4)
      warn.ts                   devWarn(element, message)
    components/
      panel/        panel.ts, panel.styles.ts, index.ts, register.ts, panel.test.ts
      divider/      …same shape
      button/
      icon-button/
      progress-bar/
      tooltip/
  test/
    visual/         matrix.html, matrix.ts, matrix.spec.ts, __screenshots__/ (written by CI)
    visual-ci.test.ts   node:test check that the workflows' Playwright image matches the installed version
    tokens.test.ts  node:test suite for token sources, emitted CSS, and the contrast gate
    browser/
      foundations.test.ts   criteria 12.1.3 to 12.1.5 in real browsers (§12.1)
      a11y.test.ts          axe over the gallery in every theme, density, and content variant; forced colors (§10.2)
      manifest.test.ts      the manifest checked against what actually renders (§10.1)
      commands.ts           types for custom Vitest browser commands
      helpers.ts            track/cleanup, addStylesheets, rgb for browser tests
      fixtures/probe.ts     PunkProbe, a test-only element built like a component
      fixtures/gallery.ts   every component's states in four content variants; shared by axe, manifest, and visual tests
    package/        fixture consumer: plain.html, app.html, src/, probe.ts, tsconfig.json
apps/storybook/
  package.json                  private workspace; dev, build, typecheck, and test:smoke scripts
  scripts/smoke.ts              loads every story and docs page in the built output
  tsconfig.json                 browser code; noEmit
  .storybook/
    main.ts                     Vite config, including the `development` condition
    preview.ts                  fonts, CSS, manifest, theme and density toolbar, story order
  src/
    stories/                    one `*.stories.ts` per component, Foundations pages, Overview, two `*.mdx` pages
    lib/                        workbench-only helpers: matrix, contrast math, token parsing, foundations elements
    styles/workbench.css        stage and layout styles
    icons/icons.ts              original demo-only SVG icons
```

## 5. Package Contract

### 5.1 Exports

```json
{
  "name": "@dieselpunk/core",
  "type": "module",
  "sideEffects": ["./dist/components/*/register.js", "./dist/css/*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./tokens.css": "./dist/css/tokens.css",
    "./themes.css": "./dist/css/themes.css",
    "./custom-elements.json": "./custom-elements.json",
    "./*/register.js": "./dist/components/*/register.js",
    "./*": { "types": "./dist/components/*/index.d.ts", "default": "./dist/components/*/index.js" }
  },
  "imports": {
    "#dev": { "development": "./dist/utilities/dev.dev.js", "default": "./dist/utilities/dev.js" }
  }
}
```

`./*/register.js` is the longer pattern and must win over `./*`; `check-package.ts` asserts this resolution for every component.

`tsc` rewrites `.ts` import specifiers to `.js` in emitted JavaScript but leaves them in the `.d.ts` files. This was checked against a consumer on TypeScript 5.0, 5.4, and 6.0 with `skipLibCheck: false` and `types: []`: all resolve the declarations and type-check, so it is harmless and needs no post-processing. `check-consumer.ts` repeats that consumer check for the oldest and newest supported versions.

### 5.2 Registration

- `index.ts` of each component exports the class and, as a type-only declaration, its `HTMLElementTagNameMap` entry. Importing it must not call `customElements.define`.
- `register.ts` imports the class and calls `registerElement(tag, ctor)`, which defines the tag only when `customElements.get(tag)` is undefined.
- `icon-button/register.js` also imports `tooltip/register.js`. This is its only permitted dependency registration and is documented in the manifest.
- Components use `@property` and `@state` decorators but never `@customElement`.

### 5.3 Naming

Class names are `PunkPanel`, `PunkDivider`, `PunkButton`, `PunkIconButton`, `PunkProgressBar`, and `PunkTooltip`.

### 5.4 Development Warnings

`#dev` exports `PUNK_DEV`: `true` under the `development` condition and `false` otherwise. Bundlers drop guarded branches in production. Warnings use one helper, `devWarn(element, message)` in `utilities/warn.ts`, which prefixes the tag name and does nothing unless `PUNK_DEV` is true.

`#dev` resolves differently in three places, and none depends on a built `dist/`:

| Context | Resolution |
|---------|------------|
| Consumers | `imports` in `package.json`: `development` maps to `dist/utilities/dev.dev.js`, everything else to `dist/utilities/dev.js` |
| Type checking | `paths` in `tsconfig.json` maps `#dev` to `src/utilities/dev.ts` |
| Tests | A Vite alias in `vitest.config.ts` maps `#dev` to `dev.dev.ts`, so tests always run with warnings on |

`tsc` leaves `#dev` untouched in emitted JavaScript. This was verified in Node: importing the built `warn.js` logs a warning only under `--conditions=development`.

A component warns once per occurrence of a problem, not on every update: it records that it has warned, and clears the record when the problem goes away.

## 6. Tokens, Themes, and Density

### 6.1 Source of Truth

Tokens are authored in TypeScript (`tokens/`). Both emitted CSS and component fallbacks derive from these files, so values are defined once.

### 6.2 Emitted CSS

`build-css.ts` writes:

- `tokens.css`: base tokens on `:where(:root)`, the default theme on `:where(:root)` and `[data-punk-theme="industrial"]`, and the `compact` and `low` density rules.
- `themes.css`: attribute rules for every other theme and the `auto` mapping.

Selectors:

```css
:where(:root)                                { /* base tokens */ }
:where(:root), [data-punk-theme="industrial"] { /* dark colors */ }
[data-punk-density="compact"]                { /* compact density tokens */ }
[data-punk-density="low"]                    { /* low-density tokens */ }

/* themes.css */
[data-punk-theme="industrial-light"]         { /* light colors */ }
[data-punk-theme="high-contrast"]            { /* high-contrast colors */ }
[data-punk-theme="reduced-texture"]          { /* dark colors, texture off */ }
[data-punk-theme="auto"]                     { /* dark colors */ }
@media (prefers-color-scheme: light) {
  [data-punk-theme="auto"]                   { /* light colors */ }
}
```

`:where(:root)` has zero specificity, so theme and density attributes win regardless of stylesheet order, including when set on `<html>`. The explicit `compact` rule lets a compact subtree sit inside a low-density one.

Each theme block also sets `color-scheme` (`dark` or `light`) so native scrollbars and form chrome match.

### 6.3 No Global Stylesheet Requirement

SPEC §5.1 forbids requiring a global stylesheet. Components therefore read tokens through `token(name)`, which returns `var(--punk-<name>, <compact-dark default>)`. Defaults are inlined from the token source, so an unthemed page renders correctly and any ancestor can override values.

Components must not declare token defaults in `:host`, because a `:host` declaration would shadow values inherited from ancestors.

### 6.4 Token Set

Phase 1 keeps every token in SPEC §6.2 and adds:

| Token | Purpose |
|-------|---------|
| `--punk-color-focus` | Outer focus ring color |
| `--punk-color-focus-inner` | Inner focus ring color |
| `--punk-color-accent-text` | Text/icon color on accent fills |
| `--punk-color-danger-text` | Text/icon color on danger fills |
| `--punk-color-disabled-fill` / `--punk-color-disabled-text` | Disabled surface and label |
| `--punk-surface-gradient-strength` | `1` for the raised gradient, `0` for flat fills (`0` in `reduced-texture` and `high-contrast`) |
| `--punk-texture-opacity` | Noise overlay opacity; default `0.06`, `0` when reduced or high-contrast |
| `--punk-icon-size-sm` / `-md` / `-lg` | Icon box sizes: 16, 20, 24 |
| `--punk-z-overlay` | z-index for the non-top-layer tooltip fallback |
| `--punk-tooltip-max-width` | Default `320px` |

**Token values never reference other custom properties.** A custom property whose value uses `var()` is resolved on the element that declares it, so a derived token declared on `:root` would ignore a later override of its inputs on a subtree (for example `.factory-console { --punk-color-panel: ... }` from SPEC §12). A test enforces this. Derived values are therefore composed where they are used:

- The focus ring is `box-shadow: 0 0 0 2px <color-focus-inner>, 0 0 0 4px <color-focus>`, written in `focus.ts`. There is no `--punk-focus-ring` token.
- The raised gradient runs from `color-panel-raised` to `color-panel`, blended with `color-mix()` by `--punk-surface-gradient-strength`.

The two-tone ring stays visible on both light and dark surfaces. In the light and high-contrast themes the outer ring is the dark color and the inner ring the bright one, so the outer ring always contrasts with the surrounding surface.

### 6.5 Themes

| Theme | Intent | Values |
|-------|--------|--------|
| `industrial` (default) | Charcoal metal, brass, safety orange | The values in SPEC §6.2, plus `danger-text` `#0e0d0b` |
| `industrial-light` | Same material language on pale steel; dark text | canvas `#d8d5ca`, panel `#bfbcb0`, panel-raised `#d0cdc2`, panel-inset `#aeab9f`, text `#1f201d`, text-muted `#34342f`, accent `#7d4000`, focus `#1d1e1c`, focus-inner `#f2cf44` |
| `high-contrast` | Black/white with a yellow accent; no gradients or texture; text at least 7:1 | canvas `#000000`, panel `#0d0d0d`, text `#ffffff`, edges `#ffffff`, accent `#ffd400` |
| `reduced-texture` | Dark palette, flat fills, no noise | Same as `industrial`, with `--punk-texture-opacity: 0` and `--punk-surface-gradient-strength: 0` |

`packages/core/src/tokens/themes.ts` is the source of truth; the table lists the key values. Every value passes the contrast gate (§6.8), and any change must keep it passing. Fill colors that carry meaning (progress fills, selected outlines) use the theme accent, which in `industrial-light` is darker than the dark theme's so it meets 3:1 against light surfaces.

### 6.6 Density

| Token | compact (default) | low |
|-------|-------------------|-----|
| `--punk-space-1` … `-5` | 4, 8, 12, 16, 24 | 5, 10, 15, 20, 30 |
| `--punk-control-height-sm` / `-md` / `-lg` | 28, 36, 44 | 34, 44, 54 |
| `--punk-slot-size` | 40 | 50 |
| `--punk-density-scale` | 1 | 1.25 |

Compact is the default. Font sizes do not change with density.

### 6.7 Selecting Theme and Density

- `data-punk-theme` and `data-punk-density` can be set on `<html>` or any subtree. Nested values override outer ones.
- `punk-panel` exposes a `density` property (§8.1) that applies the density token set to its own subtree through `:host([density="low"])` and `:host([density="compact"])`, using `lowDensityTokens` and `compactDensityTokens` from `styles/density.ts`. They live there, not in `tokens/density.ts`, because that module is Node-run and cannot import Lit (§3.1).
- Theme and density are independent; all eight combinations are supported and tested.

### 6.8 Contrast Gate

`check-contrast.ts` runs in CI and fails the build when, for any theme:

- `text` on canvas, panel, panel-raised, or panel-inset is below 4.5:1 (7:1 for `high-contrast`);
- `text-muted` on canvas, panel, or panel-inset is below the same threshold. It is not checked on panel-raised: raised surfaces carry controls, which use `text`;
- accent, accent-strong, warning, danger, success, and info fills against panel-inset are below 3:1. Inset troughs are the only Phase 1 surface that carries these fills; Phase 2 must extend this check to the surfaces status components use;
- `accent-text` on accent, or `danger-text` on danger, is below the text threshold;
- the outer focus color is below 3:1 against canvas, panel, panel-raised, or panel-inset, or the inner focus color is below 3:1 against the outer one.

**Known gap.** The gate does not check control boundaries. In the `industrial` palette from SPEC §6.2, `edge-dark` on panel is 1.78:1 and `edge-light` on panel is 2.22:1, below the 3:1 SPEC §10 requires for non-text controls (`industrial-light` and `high-contrast` pass for `edge-dark`). Raised surfaces differ from panel by only 1.41:1. Either the dark palette's edges must be strengthened or the spec must define which boundary satisfies the requirement; the gate then gains a matching rule. **Status: open.** `punk-button` shipped without resolving it, by decision, and the gap must be closed before Phase 1 is complete (§13).

**Scope of the gap.** It blocks `punk-button` and the other interactive controls, whose boundaries identify them as components (WCAG 1.4.11). It does not block `punk-panel`, `punk-divider`, or `punk-progress-bar`'s trough: a static container is not a user interface component, and its text is covered by the text rules above. The panel therefore shipped before the gap was resolved.

## 7. Shared Styles and Internals

### 7.1 `PunkElement`

Extends `LitElement`. Provides:

- `static styles` composition with the shared base styles (`box-sizing: border-box`, `:host([hidden]) { display: none !important }`, font and text color from tokens).
- `emit(name, detail?)`: dispatches a bubbling, composed `CustomEvent`.

Phase 1 components emit no custom events, but `emit` is defined here so Phase 2 has a single implementation.

### 7.2 Surfaces

`styles/surfaces.ts` exports three style fragments. The recipe below is illustrative; the source file is canonical.

| Surface | Fill | Edges |
|---------|------|-------|
| `raised` | Vertical gradient from `panel-raised` to `panel`, blended with `color-mix()` by `--punk-surface-gradient-strength` (strength `0` is flat) | Inset 1px light top/left and dark bottom/right, plus a `border-width` outline in `edge-dark` |
| `inset` | `panel-inset` solid | Inset 1px dark top/left and light bottom/right |
| `flat` | `panel` solid | Outline only |

All surfaces use `--punk-radius` (maximum 4px). No blur, glow, or soft shadows (SPEC §6.3).

`surfaces.ts` also exports the `box-shadow` value lists (`raisedShadow`, `raisedHoverShadow`, `insetShadow`, `outlineShadow`) so a control can swap bevels on hover and press without restating the surface. `raisedHoverShadow` adds a half-strength second ring to the raised bevel, which increases edge contrast in every theme without introducing colors.

### 7.3 Texture

`texture.ts` exports a tiled 128x128 SVG noise image (feTurbulence) as a data URI. It is original, procedural, and rasterized once as a background image. It applies only to `punk-panel` in Phase 1, through a `pointer-events: none` pseudo-element with opacity `--punk-texture-opacity`. Buttons use gradients only, to keep paint cost low in dense interfaces.

### 7.4 Focus

`focus.ts` exports `focusRing(selector)`, a `:focus-visible` rule that draws a two-tone ring from `--punk-color-focus-inner` and `--punk-color-focus` (§6.4) on the selector's `::after`. Drawing it on a pseudo-element means it never competes with the element's own bevel `box-shadow`. The selector must be `position: relative`, and the host must not clip it (`overflow: visible`). The default outline is removed only for `:focus-visible`, and the ring replaces it. Under forced colors the ring becomes a `2px solid Highlight` outline.

### 7.5 Forced Colors

`forced-colors.ts` exports `forcedColorsSurface(selector, colors?)`, which returns an `@media (forced-colors: active)` block for one surface. `colors` names the system colors for the fill and for text and border, and defaults to `Canvas`/`CanvasText`; a control passes `ButtonFace`/`ButtonText`. Each component applies it to its own surfaces and adds any component-specific rules. The block replaces gradients, textures, and bevels with 2px solid borders, uses `Highlight` for selected/active emphasis, `GrayText` for disabled, and `Highlight` outlines for focus.

### 7.6 Localization

`localize.ts` exports `setStrings(partial)`, `resetStrings()`, and an internal `t(key)`. `setStrings` is part of the public API (exported from the package root). Phase 1 has one key, `loading` (default `"Loading"`). Components read strings when they render and are not updated when strings change, so `setStrings` must be called before components render. Components never contain other hard-coded user-facing strings.

### 7.7 Slot Presence

`slot-presence.ts` is a reactive controller reporting whether a slot has assigned content. A name such as `'header'` is a named slot; the empty name `''` is the default slot, which also counts non-blank text and ignores whitespace-only text. It checks light-DOM child nodes synchronously in `hostConnected` and re-evaluates on `slotchange`. A component that must keep tracking content while the slot is visually hidden renders the slot inside a `hidden` wrapper instead of omitting it, because slot assignment and `slotchange` do not depend on rendering.

## 8. Components

All components:

- use Shadow DOM, logical CSS properties (RTL-safe), and tokens exclusively for color, spacing, and size;
- declare `@slot`, `@csspart`, `@cssprop`, `@attr`, and `@fires` JSDoc so the manifest is complete;
- respect `prefers-reduced-motion` by disabling non-essential transitions and animations.

### 8.1 `punk-panel`

A structural surface.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `variant` | `variant` | `'raised' \| 'inset' \| 'flat'` | `'raised'` | yes |
| `density` | `density` | `'compact' \| 'low' \| undefined` | `undefined` (inherit) | yes |

- **Slots:** default, `header`, `footer`.
- **Parts:** `surface`, `header`, `body`, `footer`.
- **CSS properties:** `--punk-panel-padding` (default `var(--punk-space-3)`).
- Header and footer wrappers are rendered with `hidden` when their slots are empty, using slot presence (§7.7).
- Header and footer strips use `panel-inset`, so their text is covered by the contrast gate in every theme.
- An unknown `variant` value renders as `raised`.
- An explicit `density` also overrides an ancestor's `data-punk-density`, including `compact` inside a low-density ancestor.
- The header has a darker strip with an etched lower edge. The footer mirrors it above.
- The host is `display: block`; no fixed width or height.
- The panel has no ARIA role. Consumers add `role="region"` and a label when it is a landmark.
- Texture applies to `raised` and `flat` variants, not `inset`.

### 8.2 `punk-divider`

An etched separator.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `orientation` | `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | yes |
| `decorative` | `decorative` | `boolean` | `false` | yes |

- **Slots:** default (optional label).
- **Parts:** `line`, `label`.
- **CSS properties:** `--punk-divider-gap` (label spacing; default `var(--punk-space-2)`).
- The line is a 1px dark line adjacent to a 1px light line (etched).
- Default semantics: `role="separator"` with `aria-orientation`. When `decorative`, `role="none"` and no `aria-orientation`.
- The component writes `role` and `aria-orientation` as attributes on its own host, replacing any values a consumer set. Host attributes were chosen over `ElementInternals` because they work with every assistive technology and can be asserted in tests, whereas an internals role is invisible to the DOM and to Playwright's role engine.
- An unknown `orientation` value behaves as `horizontal`, including its `aria-orientation`.
- Horizontal with a label draws the label centered with a line on each side, using two `line` parts. Without a label there is one line. Whitespace-only text is not a label.
- The label slot always renders, inside a wrapper that is `hidden` when there is no label or the divider is vertical, so label tracking keeps working in every state.
- Vertical dividers stretch to the container's block size (`align-self: stretch`; a `1em` minimum keeps them visible outside a flex container) and ignore the label slot, emitting a dev warning once when it is populated.
- The label color is `--punk-color-text-muted`.

### 8.3 `punk-button`

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `variant` | `variant` | `'default' \| 'primary' \| 'danger'` | `'default'` | yes |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | yes |
| `disabled` | `disabled` | `boolean` | `false` | yes |
| `loading` | `loading` | `boolean` | `false` | yes |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | yes |

- **Slots:** default, `icon-start`, `icon-end`.
- **Parts:** `button`, `label`, `icon-start`, `icon-end`, `spinner`.
- **CSS properties:** `--punk-button-padding-inline` (default `var(--punk-space-3)`).
- **Events:** native `click` only.

Implementation:

- Renders a native `<button type="button">` filling the host, through `shadowRootOptions` with `delegatesFocus: true`. The inner button never submits on its own, because a button in a shadow tree has no form owner; the component submits or resets the form itself.
- Shared behavior lives in `PunkButtonBase` (`internal/button-base.ts`), which `punk-icon-button` also extends. Subclasses supply `renderContent()` and may override the accessible name.
- The class is form-associated (`static formAssociated = true`). On click with `type="submit"` it calls `internals.form?.requestSubmit()`; with `type="reset"` it calls `internals.form?.reset()`. No submitter is passed, so `SubmitEvent.submitter` is `null`; this is a documented limitation in Phase 1.
- The host mirrors its `aria-label` attribute onto the inner button. No other host ARIA attributes are forwarded in Phase 1. A host `aria-label` on an element with no role may be flagged by axe's `aria-prohibited-attr` rule; the accessibility suite (work package 9) decides whether the host needs a role.
- A disabled `<fieldset>` ancestor disables the button, except inside the fieldset's first `<legend>`. This is read live on every render rather than cached from `formDisabledCallback`, which also fires for the host's own `disabled` attribute and lagged one update behind the property.
- Height comes from `--punk-control-height-<size>`. Icon boxes use `--punk-icon-size-<size>`.

Visual states:

| State | Treatment |
|-------|-----------|
| Idle | Raised surface |
| Hover | Brighter edges (increased edge contrast) |
| Active (`:active`) | Inset surface, content shifts 1px down and inline-end |
| Focus-visible | Focus ring (§7.4) |
| Disabled | Flat, desaturated, `--punk-color-disabled-*`; label stays readable |
| Loading | Label rendered at `opacity: 0`, spinner centered, width unchanged |

`primary` uses accent fill with `accent-text`; `danger` uses the danger color with matching contrast text.

Behavior:

- `disabled` sets the inner `<button disabled>`. A capturing click listener on the host also stops propagation when disabled or loading, so no consumer listener or form action is triggered by clicks in host padding.
- `loading` sets `aria-disabled="true"` and `aria-busy="true"` on the inner button. It does not set `disabled`, so keyboard focus is retained. Clicks are suppressed as above. The accessible name is unchanged.
- The spinner is a CSS-only rotating mechanical gear shape; with reduced motion it is static.
- While loading, a visually hidden `role="status"` element, a sibling of the inner button (not inside it), contains the localized `loading` string. This announces the state without changing the button's accessible name.
- Under `@media (pointer: coarse)`, a `::before` pseudo-element extends the hit area to at least 40px block size (§2 item 7): `inset-block: min(0px, calc((var(--_h) - 40px) / 2))`, so a 28px button grows by 6px each side, a 36px button by 2px, and a 44px button not at all. A test cannot emulate a coarse pointer per test, so it extracts this rule from the component's own stylesheet, applies it unconditionally, and hit-tests the result; a separate assertion checks the media condition.
- Hover and press apply only while the button is neither disabled nor loading. Hover adds `raisedHoverShadow`. Press swaps to `insetShadow` and shifts the content 1px down and toward the inline end; a default button also takes the inset fill, while primary and danger keep their fill.
- `--_h` and `--_icon` are private custom properties set per size class. They are internal aliases, not API.
- Exposes the tooltip anchor protocol (§8.6): `setExternalDescription(text: string | null)`, which renders the text into a visually hidden element referenced by the inner button's `aria-describedby`.

### 8.4 `punk-icon-button`

A square, icon-only button. Extends the same base as `punk-button` (`internal/button-base.ts`).

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `label` | `label` | `string` | `''` (required) | yes |
| `variant`, `size`, `disabled`, `loading`, `type` | same as `punk-button` | | | |
| `tooltipPlacement` | `tooltip-placement` | `'top' \| 'bottom' \| 'start' \| 'end'` | `'top'` | yes |

- **Slots:** default (a single icon element, typically inline SVG using `currentColor`).
- **Parts:** `button`, `icon`, `spinner`, `tooltip`.
- Width and height both equal `--punk-control-height-<size>`.
- The inner button's accessible name comes from `label`, falling back to a host `aria-label`. If neither is set, a dev warning is emitted once, and again if the name is later removed.
- Renders an internal `punk-tooltip` as the inner button's next sibling, through a `renderAfterButton()` hook in `PunkButtonBase`, so the tooltip's default anchor (its previous sibling) is the button. The tooltip shows `label` and is created with `describe = false` so screen readers do not read the name twice. Its `delay` is 400ms and its `placement` follows `tooltipPlacement`.
- `::slotted(*)` icons are sized to `--punk-icon-size-<size>`, and the icon is centered.
- While loading, the icon is hidden and the spinner takes its place; the accessible name stays `label`, the size does not change, and the tooltip still works.
- `icon-button/register.js` imports `tooltip/register.js`, so using the icon button never requires registering the tooltip separately. Importing the class entry registers neither.

### 8.5 `punk-progress-bar`

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `value` | `value` | `number \| undefined` | `undefined` (indeterminate) | yes |
| `max` | `max` | `number` | `100` | yes |
| `variant` | `variant` | `'default' \| 'success' \| 'warning' \| 'danger'` | `'default'` | yes |
| `label` | `label` | `string` | `''` | yes |
| `labelHidden` | `label-hidden` | `boolean` | `false` | yes |
| `showValue` | `show-value` | `boolean` | `false` | yes |
| `accessibleLabel` | `aria-label` | `string \| null` | `null` | no |

- **Parts:** `header`, `label`, `value`, `track`, `fill`.
- **CSS properties:** `--punk-progress-height` (default `calc(var(--punk-control-height-sm) * 0.6)`).
- Layout: optional header row (label start, value end) above an inset trough with a fill.
- Semantics: the track element has `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (percentage) when determinate. Indeterminate omits `aria-valuenow`. The label element is its `aria-labelledby` target, and with `label-hidden` it is visually hidden but still present, so it remains the accessible name. When there is no `label`, the host `aria-label` (property `accessibleLabel`) names the track instead, because a host attribute cannot reach an element inside the shadow root. With neither, a dev warning is emitted.
- Values are clamped to `[0, max]`. A non-finite `value` is treated as indeterminate; `max` that is not a finite number above zero is treated as `100`. Each of these, and a `value` outside `[0, max]`, emits a dev warning once per occurrence: it is not repeated while the problem persists, and fires again if the problem returns after being fixed.
- An empty `value` attribute means indeterminate, not zero.
- The percentage text uses `Intl.NumberFormat` with `style: 'percent'`, `maximumFractionDigits: 0`, and the nearest `lang` ancestor's locale. The search crosses shadow roots (a host's `lang` applies to content inside it), and `lang=""` means unknown, so the browser default applies. An invalid tag falls back to the default. The text is computed at render time, so a changed `lang` takes effect on the next update.
- Fill width animates `inline-size` over `--punk-duration-normal`. It is not a `transform: scaleX`, because scaling would stretch the variant patterns while the fill grows. ARIA values update immediately; animation is disabled under reduced motion.
- Indeterminate state shows a full-width hazard-stripe fill that scrolls; under reduced motion the stripes are static.
- Variants do not rely on color alone: `default` is a plain solid fill in the accent color, `success` a segmented fill of regular ticks, `warning` a diagonal hatch, and `danger` a dense cross-hatch. (An earlier draft made both `default` and `success` solid, which cannot be told apart without color.) An unknown variant renders as `default`.
- Forced colors: the track becomes a system-colored box and the fill uses `Highlight` with `Canvas` gaps, keeping the patterns.

### 8.6 `punk-tooltip`

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `for` | `for` | `string` | `''` | no |
| `placement` | `placement` | `'top' \| 'bottom' \| 'start' \| 'end'` | `'top'` | yes |
| `delay` | `delay` | `number` (ms) | `400` | no |
| `describe` | `describe` | `boolean` | `true` | no |
| `open` | `open` | `boolean` | `false` | yes (read-only for consumers; use methods) |

- **Slots:** default (rich content; no interactive elements).
- **Parts:** `surface`, `content`.
- **CSS properties:** `--punk-tooltip-max-width`, `--punk-tooltip-offset` (default `8px`).
- **Methods:** `show()`, `hide()`. `show()` opens immediately, whatever the delay.
- `describe` is true unless set to the string `"false"` (`describe="false"`), because a plain boolean attribute cannot express a default-true value. Removing the attribute restores `true`.

Anchor resolution:

1. If `for` is set, the anchor is the element with that id in the tooltip's root node.
2. Otherwise it is `previousElementSibling`.

The tooltip must be a sibling of its anchor, not a child: nested content would contribute to the anchor's accessible name.

Behavior:

- The tooltip attaches listeners to its anchor on connect and removes them on disconnect.
- Pointer enter opens after `delay`. Focus (via `:focus-visible` semantics, using `focusin` plus a `matches(':focus-visible')` check) opens immediately. Touch pointers never open a tooltip.
- Closing: pointer leave and blur close the tooltip after a 100ms grace period, which is cancelled if the pointer enters the tooltip itself. This keeps content hoverable, dismissible, and persistent as WCAG 1.4.13 requires.
- Escape closes the tooltip. A capturing `keydown` listener exists on `document` only while open; when it closes the tooltip it calls `stopPropagation()` so that Escape closes only the topmost overlay (SPEC §9.1). Focus does not move.
- At most one tooltip is open at a time; opening one closes the previous. If another tooltip was closed within the last 300ms, the next opens without delay. That window is module-level state, so `resetTooltipWarmup()` is exported for tests; without it a test can inherit a shortened delay from the test before it.
- Rendering uses the Popover API (`popover="manual"` on the surface, `showPopover()`/`hidePopover()`) so the tooltip is in the top layer. Without Popover API support, the surface uses `position: fixed` and `--punk-z-overlay`.
- Positioning (`utilities/position.ts`) computes the preferred placement, flips to the opposite side if it does not fit, then shifts along the cross axis to stay within an 8px viewport margin. `start` and `end` are logical and respect `dir`.
- While open, and only then, the tooltip listens for scroll (capture, passive, `requestAnimationFrame`-throttled) and window resize and observes the anchor with `ResizeObserver`. All are removed on close. No document-wide observers exist while closed.
- Description wiring: when `describe` is true, the **tooltip host** (not its surface) gets `role="tooltip"` and an id if it has none. An `aria-describedby` reference cannot point into the tooltip's own shadow root, so a role and id on the surface would never be reachable from a light-DOM anchor; the host sits in the same tree as the anchor. If the anchor has `setExternalDescription` (the `punk-button` family), the tooltip calls it with its trimmed `textContent` instead and keeps it current with a `MutationObserver` on itself. Otherwise it adds its id to the anchor's `aria-describedby`, preserving any ids already there. On disconnect, on a change of anchor, and when `describe` becomes false, it removes only what it added, including the role and id it created. If the anchor is a custom element that is not defined yet, wiring waits for `customElements.whenDefined`.
- The surface has no ARIA role of its own. The tooltip host uses `display: contents` so its shadow content renders while the host stays out of layout.
- A dev warning is emitted once when no anchor can be resolved, and once when the default slot contains focusable descendants.
- Focus opens the tooltip only when the real focused element matches `:focus-visible` (read from the event's composed path, since the anchor may be a shadow host). A tooltip stays open while either the pointer is over the anchor or the tooltip, or the anchor has focus; it closes after the grace period once none of those hold.
- Positioning is the pure function `computePosition` in `utilities/position.ts`, which has its own unit tests. A surface that fits on neither side keeps the requested side, and one wider than the viewport pins to the margin.

## 9. Documentation Workbench

`apps/storybook` includes:

1. **Toolbar controls:** theme (`industrial`, `industrial-light`, `high-contrast`, `reduced-texture`, `auto`) and density (`compact`, `low`). Both set attributes on the story's stage element, a wrapper the preview adds around every story, so they combine. The attributes are not on `<html>`, so each story is themed independently and Storybook's own docs chrome keeps its look.
2. **Foundations pages:** color swatches per theme with measured contrast ratios; spacing, control-height, and typography scales; surface recipes (raised, inset, flat) rendered; texture on/off; and an asset policy page covering SPEC §4.3.
3. **One docs page and story set per component:** a playground with controls bound to properties; every state; the theme × density matrix; keyboard instructions beside the example; and a manifest-driven API table (properties, slots, parts, CSS properties).
4. **Overview (first screen):** a composed "machine panel" using panel, divider, buttons, icon buttons, a progress bar, and tooltips.
5. **Plain HTML and TypeScript integration page** with copy-paste import examples.
6. **Demo-only icons** in `src/icons/`: gear, plus, close, info, warning, and check, drawn originally on a 24x24 grid using `currentColor`.

The workbench consumes the built package through the same exports as an external consumer, so it exercises the real `exports` map. That includes `custom-elements.json`, which therefore must be built first; the workbench's `typecheck` script builds core before it runs, and the root `npm run storybook` does the same before starting the dev server.

Implementation notes:

- **Manifest.** `npm run build:manifest` runs `@custom-elements-manifest/analyzer` with its Lit support. Classes never call `customElements.define`, so each component declares its tag with a `@tagname` JSDoc tag, which is what `@wc-toolkit/storybook-helpers` looks up. Manifest assertions (§10.1) remain in work package 9.
- **Controls.** Slot content is a string arg named `<slot>-slot` (`default-slot`, `header-slot`), which the helpers render, so slots are editable in the Controls panel. The demo icons are therefore SVG strings.
- **Foundations data is measured.** Contrast is computed in the browser from each theme's computed custom properties, and the scale pages are parsed from the shipped `tokens.css`, so they show what a consumer gets rather than a copy of the TypeScript sources. The contrast table repeats the pairs of the gate (§6.8) and adds the three control-edge pairs, labeled `gap` while the open gap in §6.8 remains.
- **Development warnings** are on in every build of the workbench: `main.ts` adds the `development` export condition, so misuse such as an unlabeled icon button is visible.
- **Tooltip matrix.** Only one tooltip can be open at a time, so the tooltip's theme and density matrix shows one hoverable anchor per cell, and its state story shows placement, delay, `describe`, and `for`.
- Hover, focus, and pressed states are interactive and not drawn in the static matrices.

## 10. Testing and CI

### 10.1 Unit and DOM Tests

Node-run code (token sources, CSS rendering, the contrast gate, scripts) is tested with `node --test` and `node:assert`, with no browser or test framework.

Component tests run in Chromium, Firefox, and WebKit. Local runs default to Chromium only. CI sets `PUNK_BROWSERS=chromium,firefox,webkit` explicitly, so it never depends on a default. `PUNK_BROWSERS` takes a comma-separated list, and the config rejects unknown names. The config lists the Lit entry points in `optimizeDeps.include`; without it a cold Vite cache discovers them mid-run, reloads, and loads Lit twice. Each component has tests covering the criteria in §12, plus these package-wide assertions:

- Importing a component's class entry does not define its element; importing `register.js` does; importing it twice does not throw.
- Every `part` attribute rendered in a component's shadow DOM appears in its manifest `csspart` list, and vice versa.
- Every documented slot, attribute, and CSS property appears in the manifest.

The manifest assertions are in `test/browser/manifest.test.ts`. They compare the manifest with what the components do, not with the JSDoc it was generated from, so it cannot agree with itself while being wrong:

- Parts and slots are read from the rendered shadow DOM of every gallery state, in every content variant.
- Attributes are compared with the class's `observedAttributes`.
- A `--punk-*` property a component reads, in its styles or its class, must be listed unless it is a shared token, and every listed property must really be read. The icon button is the one explicit exception: the shared base reads `--punk-button-padding-inline`, but the icon button zeroes that padding, so it is not part of its API.
- Every component, attribute, slot, part, and CSS property has a non-empty description, and each component's tag name is recorded (a `@tagname` JSDoc tag, since the classes never call `define`).

The manifest is regenerated by `pretest:browser`, so `npm test` never reads a stale one. Importing the class entry check lives with each component, in `*.registration.test.ts`.

**Engine differences the tests account for.** These were found by running the suite on Firefox and WebKit on Linux, which macOS does not reproduce. `docker run` with the Playwright image of the pinned version and a Linux `npm ci` in a copy of the repository runs the whole suite there in about 20 seconds.

- **Emulated media features reach Firefox late.** After `emulateMedia`, `matchMedia` in the test frame reports the new value only after about two animation frames, while Chromium and WebKit report it at once. `setColorScheme`, `setForcedColors`, and `setReducedMotion` therefore wait until the frame reports the requested state, and fail with a timeout after five seconds when it never does, rather than hang. Resetting to the default needs no wait.
- **Firefox starts without page focus.** In headless Firefox on Linux, `document.hasFocus()` is false in a fresh test frame, and a Tab press then does nothing at all: no `focusin` fires. `focusWithKeyboard` focuses the window first. On WebKit it still uses a keypress and `focus()`.
- **WebKit keeps a stale reduced-motion state.** Toggling `prefers-reduced-motion` in a test leaves a shared stylesheet's media queries stale for the files that run after it. A test that toggles it therefore lives in its own `*.reduced-motion.test.ts` file, which sets the preference once in `beforeAll` and resets it in `afterAll`. The button, icon button, and progress bar each have one, and their main test files do not call `setReducedMotion`.
- **Firefox lays out to fractions of a pixel.** A geometry assertion that a box stays within a margin is checked to within half a pixel.

### 10.2 Accessibility

`axe-core` runs against every component fixture in all four themes and both densities. Serious or critical violations fail CI. A forced-colors run (Chromium `forcedColors: 'active'`) verifies borders and focus indicators remain visible.

Implemented in `test/browser/a11y.test.ts`, over the shared gallery (`fixtures/gallery.ts`), which renders every component's states (variants, sizes, disabled, loading, an open tooltip, and the like) in four content variants: short, long German, missing optional labels, and RTL Hebrew. That is 32 scans, and each runs in all three engines in CI. Two further tests keep a clean result meaningful: one inserts a real violation and requires axe to report it, and one makes text unreadable inside a progress bar and requires a contrast violation whose target is inside the shadow root. The `region` rule is off, because landmarks are the page's job. The forced-colors checks run only in Chromium, the one engine that emulates the mode, and assert a visible border on each surface and a solid focus outline of at least 2px on both button types.

Axe finds no serious or critical violation in any combination, on Chromium and WebKit, which are the engines that could run on the development machine; Firefox could not launch there, so its first run is in CI. A host `aria-label` on `punk-progress-bar`, which the unlabeled content variant sets, is not flagged. The question left open in §8.3 for `punk-button` is not answered, because the gallery sets no host `aria-label` on buttons.

### 10.3 Visual Regression

`test/visual/matrix.html` renders each component's states for the matrix below.

| Dimension | Values |
|-----------|--------|
| Theme | `industrial`, `industrial-light`, `high-contrast`, `reduced-texture` |
| Density | `compact`, `low` |
| Container | desktop (1024px) and 375px |
| Zoom | 100% and 200% (viewport width halved with `deviceScaleFactor: 2`) |
| Content | short, long (German), missing optional label, RTL |

Chromium runs the full matrix. Firefox and WebKit run default and `industrial-light` + `low` at 100%. Baselines are generated and committed only from the Linux CI image, since local macOS rendering differs and is not authoritative. Hover, focus-visible, and active states are forced through Playwright interactions, not CSS class hooks.

Implementation:

- `test/visual/matrix.ts` builds the page from the same gallery and the same CSS renderers as the shipped stylesheets, picking theme, density, content, and optionally one component from the query string. `scripts/build-visual.ts` bundles it with esbuild into `test-results/visual-site`, and `playwright.config.ts` serves that. The bundle is built on the host or runner, because esbuild's binary is platform-specific, so the container needs no `node_modules` of its own.
- Chromium has 128 matrix screenshots plus 3 interaction screenshots (hover, focus-visible, and active on the primary button); Firefox and WebKit have 5 each. The focus test asserts that the button really has focus before it takes the screenshot.
- `matrix.ts` throws if any component is not registered. A page of unregistered elements would otherwise screenshot cleanly and become a baseline of nothing. This was a real failure: esbuild honored the package's `sideEffects` field, which describes `dist/`, and dropped every `register.ts` import from the source build until `ignoreAnnotations` was set.
- Rendering happens on `mcr.microsoft.com/playwright:v<version>-noble`, where `<version>` is the installed `@playwright/test`. `scripts/visual.ts` runs it in Docker off Linux, and runs Playwright directly on Linux. In CI the job runs inside that image, with `HOME=/root` set on the job: GitHub starts container jobs with `$HOME` owned by another user, and Firefox then refuses to launch as root (the first baseline run failed all 131 Firefox tests this way, while Chromium and WebKit rendered 136 screenshots). `test/visual-ci.test.ts` fails if a workflow pins a different image than the installed Playwright, since a version bump silently invalidates every baseline.
- `node scripts/visual.ts selftest` renders the whole matrix twice into a scratch folder and requires the second pass to match the first exactly. It proves the harness is deterministic on all three engines without any committed baseline, and it passed.
- Baselines are never written locally. `visual.ts update` refuses outside CI, because a container on Apple Silicon is arm64, and emulating amd64 there crashes Chromium. The "Update visual baselines" workflow deletes the old folder, regenerates everything on the pinned image, and uploads it as an artifact to commit, so baselines for removed tests cannot linger and never fail. The first set (141 screenshots, from Chromium, Firefox, and WebKit) is committed. A local `test:visual` on Apple Silicon passes against it, so it works as a quick check, but CI stays authoritative.
- The tolerance is `maxDiffPixelRatio: 0.002`, with animations disabled and reduced motion on. A one-pixel change to the success fill's tick pattern fails 24 Chromium screenshots.

### 10.4 Size, Packaging, and Manifest Gates

| Gate | Threshold |
|------|-----------|
| Shared runtime and tokens (gzip, excluding Lit) | ≤ 12 kB |
| Each component (gzip) | ≤ 5 kB; `punk-tooltip` and `punk-icon-button` must document any exception |
| Tree-shaking | A bundle importing only `button/register.js` must not contain `punk-tooltip` code |
| `publint` and `attw` | No errors |
| Manifest | Generated, valid, and every public component has a description |
| Contrast gate | Passes (§6.8) |

Measured sizes (gzip, Lit excluded, from `npm run check:size`):

| Entry | Size | Budget |
|-------|------|--------|
| Shared runtime and tokens | 9.5 kB | 12 kB |
| `punk-divider` | 2.6 kB | 5 kB |
| `punk-panel` | 3.5 kB | 5 kB |
| `punk-progress-bar` | 4.1 kB | 5 kB |
| `punk-button` | 4.6 kB | 5 kB |
| `punk-tooltip` | 4.8 kB | 5 kB |
| `punk-icon-button` | 7.1 kB | 7.5 kB |

Each component's figure includes the shared code it imports, which is the stricter reading of "each component". `punk-icon-button` is the documented exception: its register entry also contains the tooltip and the button base. `size-limit` measures gzip because the spec says so; its default is brotli, which reports smaller numbers.

The gates and how they are checked:

- **`check-package.ts`** resolves `<package>/<component>/register.js` and `<package>/<component>` through the real exports map and requires the first to win over the wildcard. It requires `sideEffects` to list exactly the register entries and stylesheets, and requires that nothing but a register entry calls `customElements.define`. It bundles every register entry and requires each bundle to hold its own component, only the documented dependencies, and nothing else. Each component has a string only its own code contains; for the button that is `icon-start`, because `--punk-button-padding-inline` is also read by the shared base and would have hidden that the icon button does not bring the button with it. It also bundles a class-only import and requires no registration.
- **`publint --strict`** and **`attw`**, with the `esm-only` profile: this is a browser package with no CommonJS build. `attw` only understands JavaScript and types, so `tokens.css` and `themes.css` are excluded from it and verified by `check-package.ts` instead.
- **`check-consumer.ts`** packs the real tarball, installs it into throwaway projects with TypeScript 5.0.4 and the root's `~6.0` pin, and type-checks the fixture in both with `skipLibCheck: false`. A `@ts-expect-error` line makes sure the package's types are real and not `any`. It then bundles `plain.html` and `app.html` and loads them in Chromium: each must define exactly the elements it imported (the icon button brings the tooltip, and the plain page defines no tooltip), upgrade them, apply `tokens.css`, expose a progress bar with `aria-valuenow`, and log no warnings.

TypeScript 5.0 comes from an install into the throwaway project, not from an alias in the repo: an aliased copy installed its own `tsc` binary over the real one and silently made every typecheck run on 5.0.

### 10.5 CI

Pipeline stages, all required, all running on Node 26: install, toolchain check (`npm ls typescript` reports a single 6.0.x version), lint, typecheck, build (modules, CSS, manifest, Storybook), contrast gate, unit tests (3 browsers, including the manifest and axe suites), package, size, and consumer gates, the Storybook smoke test, and visual regression.

Visual regression is its own job, in the pinned Playwright container. The "Update visual baselines" workflow is manual and uploads new baselines as an artifact. The story smoke test loads every story and docs page in the built workbench and fails on a render error or any console warning or error other than Lit's one-time dev-mode notice. It fails for a story that throws and for a story that misuses a component, such as an icon button without a label, which only logs a development warning.

### 10.6 Dependency Updates

`.github/dependabot.yml` opens weekly pull requests for npm (one entry covers every workspace, since they share the root lockfile) and for GitHub Actions. Packages that release together are grouped so they update in one pull request: Storybook and its helpers, `size-limit` and its plugins, Vitest, the linting tools, and the fonts. Three dependencies are held back on purpose:

- **TypeScript** takes patch updates only, because `typescript-eslint` caps it at 6.0 (§3.1). The toolchain gate would fail a newer one anyway.
- **`@types/node`** takes no major updates, since it follows the Node major in `.nvmrc`.
- **Playwright** takes no automatic updates. Every version changes the browser builds, which invalidates every visual baseline (§10.3), and the version is also written in the image tag of both workflows, which Dependabot does not edit. To upgrade it, change the package versions and both image tags together, then run the "Update visual baselines" workflow and commit its artifact. `test/visual-ci.test.ts` fails if the tags and the installed version disagree.

## 11. Work Packages

Packages are ordered by dependency. Each ends with the CI gates that apply to what it added.

| # | Package | Depends on | Output |
|---|---------|------------|--------|
| 1 | Scaffolding | — | Workspaces, `.nvmrc`, `engines`, tsconfigs (including `tsconfig.scripts.json`), lint, CI skeleton on Node 26, empty `core` package building |
| 2 | Tokens, themes, density | 1 | `tokens/`, `build-css.ts`, `check-contrast.ts`, emitted CSS |
| 3 | Internals and shared styles | 2 | `PunkElement`, `token()`, surfaces, focus, texture, forced-colors, localize, dev flag, registration helper. Done: `PunkElement`, `token()`, base styles, surfaces, texture, forced-colors helper, density helper, slot presence, registration helper, dev flag and `devWarn`. Remaining: focus, localize. |
| 4 | Panel and divider | 3 | Two components, tests, fixtures. Done. |
| 5 | Tooltip | 3 | Component, `position.ts`, tests. Done. |
| 6 | Button base, button, icon button | 3, 5 | Components, form behavior, anchor protocol, tests. Done. |
| 7 | Progress bar | 3 | Component, `locale.ts`, tests. Done. |
| 8 | Storybook workbench | 3 (stories added per component as 4–7 land) | App, foundations, stories, API tables, manifest generation. Done. |
| 9 | Test infrastructure | 4–7 | Visual matrix, axe suite, size and package gates, fixture consumer. Done. |
| 10 | Hardening | 9 | Forced-colors, RTL, 200% zoom fixes; budget tuning; docs polish |

Work packages 4, 5, and 7 can proceed in parallel after package 3. Package 8 starts after package 3 so the workbench is available for visual review while components are built.

## 12. Acceptance Criteria

### 12.1 Foundations

No component exists yet, so criteria 3 to 5 are verified in `test/browser/foundations.test.ts` against `PunkProbe`, a test-only element built with `PunkElement` and `token()` exactly as components will be. It exposes the resolved value of every token. Each component task adds its own unstyled-appearance assertion to that component's tests, which is what finally satisfies “every component” in criterion 3.

The tests also cover cases beyond the criteria: both stylesheet orders, attributes on `<html>`, a compact subtree inside a low-density one, nested themes, and plain custom-property overrides on a subtree.
1. `tokens.css` and `themes.css` are emitted; all token values originate from `tokens/*.ts`.
2. The contrast gate passes for all four themes.
3. An unstyled page (no stylesheet) renders every component in the default dark, compact appearance.
4. Setting `data-punk-theme` or `data-punk-density` on an ancestor restyles components without re-creating them, for all eight theme × density combinations.
5. `data-punk-theme="auto"` follows `prefers-color-scheme`.

### 12.2 Panel

1. Each variant renders the corresponding surface; no fixed width or height is imposed.
2. Empty `header` and `footer` slots render no strip; adding content later shows it.
3. `density="low"` on a panel increases spacing for its descendants only.

Verified in `src/components/panel/panel.test.ts`. `panel.registration.test.ts` verifies that importing the class entry does not define the element and that `register.ts` does. The panel's own unstyled-appearance assertion (12.1.3) is in the same file.

### 12.3 Divider

1. Horizontal and vertical orientations render and report `aria-orientation`.
2. A label renders centered between two lines; vertical ignores it with a dev warning.
3. `decorative` produces `role="none"`.

Verified in `src/components/divider/divider.test.ts` and `divider.registration.test.ts`, including the divider's own unstyled-appearance assertion (12.1.3). Shared test setup lives in `test/browser/helpers.ts`.

### 12.4 Button

1. Enter and Space activate it; focus order and `focus()` on the host work.
2. `disabled` and `loading` prevent click handlers and form actions, including clicks on host padding.
3. A loading button keeps its width and accessible name, stays keyboard-focusable, and announces the localized loading string through a status element outside the button.
4. `type="submit"` submits and `type="reset"` resets the enclosing form; the default type is `button`.
5. Host `aria-label` reaches the inner button.
6. `setExternalDescription` text is exposed through `aria-describedby` on the inner button.
7. Pressed state is visibly inset and the 1px offset applies; focus ring is visible on all variants and themes.
8. Coarse-pointer hit area is at least 40px in compact density.

### 12.5 Icon Button

1. The accessible name equals `label`; a missing `label` produces a dev warning.
2. The tooltip shows the label on hover and keyboard focus and is not duplicated in the accessibility description.
3. The control is square at each size and density.
4. Loading hides the icon, shows the spinner, and keeps the name.
5. `icon-button/register.js` registers `punk-tooltip` as well.

### 12.6 Progress Bar

1. A determinate bar exposes `role="progressbar"` with correct `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`.
2. Omitting `value` renders the indeterminate state without `aria-valuenow`.
3. Out-of-range and non-finite values are clamped or treated as indeterminate as specified, with dev warnings.
4. ARIA values update immediately while the fill animates; reduced motion removes animation.
5. Each variant is distinguishable without color (pattern differs).
6. `show-value` output respects the `lang` ancestor.

Verified in `src/components/progress-bar/progress-bar.test.ts` and `progress-bar.registration.test.ts`, including the bar's own unstyled-appearance assertion (12.1.3). The reduced-motion cases are in `progress-bar.reduced-motion.test.ts`, a separate file because WebKit does not re-evaluate a shared stylesheet's media queries when the preference changes mid-page; that file sets the preference once before anything renders. Criterion 5 is checked by forcing every status color to the same value and asserting that the four fill patterns still differ.

### 12.7 Tooltip

1. It opens after `delay` on pointer hover and immediately on keyboard focus; it never opens for touch.
2. Escape closes it, stops propagation, and leaves focus in place.
3. The pointer can move onto the tooltip without it closing.
4. It flips and shifts to remain inside the viewport and honors RTL for `start`/`end`.
5. No scroll, resize, or observer work remains after it closes.
6. Only one tooltip is open at a time; adjacent anchors within 300ms skip the delay.
7. The anchor is described through `setExternalDescription` or `aria-describedby`, and cleaned up on disconnect.
8. It works with and without Popover API support.

### 12.8 Workbench

1. Theme and density controls affect every story and combine correctly.
2. Every component has a docs page with a state matrix, keyboard instructions, and a manifest-generated API table.
3. The first screen is the Foundations overview described in §9.
4. The asset policy page is present.

Verified by `npm run build` (which builds the workbench) and by loading each of the 33 entries in Chromium from the built output, with no render errors and no console warnings. Screenshots of the Overview, Colors, Scales, and component pages were checked in `industrial` / `compact` and `industrial-light` / `low`. There are no automated assertions for these criteria yet; work package 9 adds the axe suite and a story smoke test.

## 13. Definition of Done

Phase 1 is complete when:

1. All acceptance criteria in §12 pass.
2. All gates in §10 pass in CI, with Chromium, Firefox, and WebKit tests green.
3. `@dieselpunk/core` can be consumed from plain HTML and from a TypeScript fixture app with no global setup other than optional CSS imports.
4. Importing any component class has no registration side effect, and the tree-shaking gate passes.
5. The package contains no assets or code derived from Factorio files, and bundled textures and icons (core texture; workbench icons) are documented as original.
6. `SPEC.md` is updated for the decisions in §2 that change its wording.
7. The boundary-contrast gap in §6.8 is closed: control edges meet 3:1 or the spec defines the qualifying boundary, and the gate checks it.
8. Every script runs as `node <file>.ts` on Node 26 with no TypeScript runner, and `npm ls typescript` reports exactly one version, 6.0.x.

## 14. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Shadow DOM breaks ARIA id references between a tooltip and a punk anchor | The `setExternalDescription` protocol in §8.3 and §8.6; covered by tests in Chromium, Firefox, and WebKit |
| `./*` and `./*/register.js` export patterns resolve incorrectly in some tools | `check-package.ts`, `attw`, and a fixture consumer app resolve every entry |
| Light theme accent or muted text fails contrast on inset surfaces | The contrast gate runs before components are built on top of the palette (work package 2) |
| Baseline screenshot churn across operating systems | Baselines come only from the Linux CI image |
| Texture raster cost on large panels | A single tiled image on one pseudo-element, with the `reduced-texture` theme as an escape hatch |
| Popover API gaps in older engines | The fixed-position fallback is tested by disabling `HTMLElement.prototype.showPopover` in a test |
| A dependency pulls in TypeScript 7, which has no JavaScript API and breaks `typescript-eslint` and Storybook tooling | `typescript` is pinned to `~6.0` at the root; the CI toolchain check fails if `npm ls typescript` shows any other version |
| Vitest, Storybook, Playwright, or Vite do not yet support Node 26 | CI runs on Node 26 from work package 1, so incompatibilities surface at scaffolding time rather than later |
| ESNext output uses syntax newer than the browser baseline | The 3-browser unit and visual suites run the emitted code unmodified; Firefox and WebKit failures are treated as baseline violations |
