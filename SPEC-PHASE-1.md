# Phase 1: Foundation — Implementation Specification

**Status:** Draft 1
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
| 5 | Focus ring colors | SPEC §6.2 hard-codes hex values in `--punk-focus-ring`, which cannot adapt to themes. It becomes derived from `--punk-color-focus-inner` and `--punk-color-focus`. |
| 6 | `reduced-texture` | A value of `data-punk-theme` (as SPEC §6.2 lists it). `--punk-texture-opacity` and the surface fill tokens are also overridable on any theme. |
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
| Unit/DOM tests | Vitest browser mode with the Playwright provider: Chromium, Firefox, WebKit |
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
| Library and browser code | `src/**`, tests | `tsc` build; Vite/esbuild for tests and Storybook | Decorators, enums, and other TypeScript-only syntax are allowed |
| Node-run code | `scripts/**` and the data-only token modules `src/tokens/{base,themes,density}.ts` | Node 26 directly (`node scripts/build-css.ts`) | Erasable syntax only, as below |

**Rules for Node-run code.** Node strips type annotations without transforming anything else, so these files must follow `tsconfig.scripts.json`:

- `erasableSyntaxOnly: true`: no `enum`, `namespace` with runtime content, constructor parameter properties, or `import x = require()`. Use `as const` objects and union types instead of enums.
- `verbatimModuleSyntax: true`: type-only imports and exports use `import type` / `export type`.
- Relative imports include the real `.ts` extension (`allowImportingTsExtensions: true`).
- `module: "nodenext"`, `moduleResolution: "nodenext"`, `noEmit: true`.
- The token data modules import neither Lit nor any DOM API, so scripts can load them in plain Node. `tokens/token.ts` (which uses Lit) is not imported by scripts.
- Scripts are ES modules (`"type": "module"`) and use `node:`-prefixed built-ins.
- `@types/node` matches Node 26.

**Shared source.** The token data modules are consumed by both contexts. They follow the stricter Node-run rules, and `tsc` compiles them for the library with `rewriteRelativeImportExtensions: true`, which rewrites `.ts` specifiers to `.js` in `dist/`.

**Type checking.** Node does not type-check. `npm run typecheck` runs `tsc --noEmit` for both `tsconfig.json` (library) and `tsconfig.scripts.json` (scripts), and CI fails on errors in either.

**Version pin.** `typescript` is declared as `~6.0` in the workspace root only, with no other workspace declaring its own copy. TypeScript 7 has no JavaScript API and is incompatible with `typescript-eslint` (peer range `>=4.8.4 <6.1.0`), so it is not used. Other tools that load the TypeScript JavaScript API (Storybook, the Custom Elements Manifest analyzer) must be confirmed against 6.0 in work package 1.

## 4. Repository Layout

```text
package.json                    private workspace root (engines.node >=26)
.nvmrc                          26
tsconfig.base.json
tsconfig.scripts.json           scripts/ and src/tokens/, noEmit, erasableSyntaxOnly
eslint.config.js
.github/workflows/ci.yml
packages/core/
  package.json
  tsconfig.json
  custom-elements-manifest.config.mjs
  scripts/
    build-css.ts                tokens → dist/css/*.css (run as: node scripts/build-css.ts)
    check-contrast.ts           theme contrast gate (§6.8)
    check-package.ts            exports/side-effect/tree-shake gate
  src/
    index.ts                    class exports only; no registration
    tokens/
      base.ts                   non-color tokens (compact defaults)
      themes.ts                 color sets per theme
      density.ts                low-density overrides
      token.ts                  token() helper (§6.3)
    styles/
      base.ts                   host reset
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
      position.ts               tooltip placement/flip/shift
      dev.ts / dev.dev.ts       PUNK_DEV flag (§5.4)
    components/
      panel/        panel.ts, panel.styles.ts, index.ts, register.ts, panel.test.ts
      divider/      …same shape
      button/
      icon-button/
      progress-bar/
      tooltip/
  test/
    visual/         matrix.html, matrix.spec.ts, __screenshots__/
    a11y/           axe helpers and fixtures
    package/        fixture consumer app for packaging tests
apps/storybook/
  .storybook/
  src/stories/
  src/icons/        original demo-only SVG icons
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

### 5.2 Registration

- `index.ts` of each component exports the class and, as a type-only declaration, its `HTMLElementTagNameMap` entry. Importing it must not call `customElements.define`.
- `register.ts` imports the class and calls `registerElement(tag, ctor)`, which defines the tag only when `customElements.get(tag)` is undefined.
- `icon-button/register.js` also imports `tooltip/register.js`. This is its only permitted dependency registration and is documented in the manifest.
- Components use `@property` and `@state` decorators but never `@customElement`.

### 5.3 Naming

Class names are `PunkPanel`, `PunkDivider`, `PunkButton`, `PunkIconButton`, `PunkProgressBar`, and `PunkTooltip`.

### 5.4 Development Warnings

`#dev` exports `PUNK_DEV`: `true` under the `development` condition and `false` otherwise. Bundlers drop guarded branches in production. Warnings use one helper, `devWarn(element, message)`, which prefixes the tag name.

## 6. Tokens, Themes, and Density

### 6.1 Source of Truth

Tokens are authored in TypeScript (`tokens/`). Both emitted CSS and component fallbacks derive from these files, so values are defined once.

### 6.2 Emitted CSS

`build-css.ts` writes:

- `tokens.css`: base tokens plus the default dark theme on `:root`, and the density attribute rules.
- `themes.css`: attribute rules for each theme and the `auto` mapping.

Selectors:

```css
:root, [data-punk-theme="industrial"]        { /* dark colors */ }
[data-punk-theme="industrial-light"]         { /* light colors */ }
[data-punk-theme="high-contrast"]            { /* high-contrast colors */ }
[data-punk-theme="reduced-texture"]          { /* dark colors, texture off */ }
[data-punk-theme="auto"]                     { /* dark colors */ }
@media (prefers-color-scheme: light) {
  [data-punk-theme="auto"]                   { /* light colors */ }
}
[data-punk-density="low"]                    { /* low-density tokens */ }
```

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
| `--punk-color-disabled-fill` / `--punk-color-disabled-text` | Disabled surface and label |
| `--punk-surface-fill-top` / `--punk-surface-fill-bottom` | Raised gradient endpoints (equal in `reduced-texture` and `high-contrast`) |
| `--punk-texture-opacity` | Noise overlay opacity; default `0.06`, `0` when reduced or high-contrast |
| `--punk-icon-size-sm` / `-md` / `-lg` | Icon box sizes: 16, 20, 24 |
| `--punk-z-overlay` | z-index for the non-top-layer tooltip fallback |
| `--punk-tooltip-max-width` | Default `320px` |

`--punk-focus-ring` is defined as:

```css
0 0 0 2px var(--punk-color-focus-inner), 0 0 0 4px var(--punk-color-focus)
```

The two-tone ring stays visible on both light and dark surfaces.

### 6.5 Themes

| Theme | Intent | Starting values |
|-------|--------|-----------------|
| `industrial` (default) | Charcoal metal, brass, safety orange | The values in SPEC §6.2 |
| `industrial-light` | Same material language on pale steel; dark text | canvas `#d8d5ca`, panel `#bfbcb0`, panel-raised `#d0cdc2`, panel-inset `#aeab9f`, text `#1f201d`, text-muted `#34342f`, accent `#8f4a00`, focus-inner `#1d1e1c`, focus `#f2cf44` |
| `high-contrast` | Black/white with a yellow accent; no gradients or texture; text at least 7:1 | canvas `#000000`, panel `#141414`, text `#ffffff`, edges `#ffffff`, accent `#ffd400` |
| `reduced-texture` | Dark palette, flat fills, no noise | Same as `industrial`, with `--punk-texture-opacity: 0` and equal fill-top/bottom |

Values for `industrial-light` and `high-contrast` are starting points. The contrast gate (§6.8) is authoritative, and values must be adjusted until it passes. Fill colors that carry meaning (progress fills, selected outlines) use the theme accent, which in `industrial-light` is darker than the dark theme's so it meets 3:1 against light surfaces.

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
- `punk-panel` exposes a `density` property (§8.1) that applies the low-density token set to its own subtree through `:host([density="low"])`, using the shared `densityLowTokens` stylesheet exported by `tokens/density.ts`.
- Theme and density are independent; all eight combinations are supported and tested.

### 6.8 Contrast Gate

`check-contrast.ts` runs in CI and fails the build when, for any theme:

- text or text-muted on canvas, panel, panel-raised, or panel-inset is below 4.5:1 (7:1 for `high-contrast`);
- accent, danger, warning, and success fills against the surface they appear on are below 3:1;
- the focus ring pair is below 3:1 against both neighboring surfaces;
- `accent-text` on accent is below 4.5:1.

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
| `raised` | Vertical gradient from `surface-fill-top` to `surface-fill-bottom` | Inset 1px light top/left and dark bottom/right, plus a `border-width` outline in `edge-dark` |
| `inset` | `panel-inset` solid | Inset 1px dark top/left and light bottom/right |
| `flat` | `panel` solid | Outline only |

All surfaces use `--punk-radius` (maximum 4px). No blur, glow, or soft shadows (SPEC §6.3).

### 7.3 Texture

`texture.ts` exports a tiled 128x128 SVG noise image (feTurbulence) as a data URI. It is original, procedural, and rasterized once as a background image. It applies only to `punk-panel` in Phase 1, through a `pointer-events: none` pseudo-element with opacity `--punk-texture-opacity`. Buttons use gradients only, to keep paint cost low in dense interfaces.

### 7.4 Focus

`focus.ts` provides a `:focus-visible` rule that applies `--punk-focus-ring`. Ring offset must not be clipped by the host; hosts use `overflow: visible`.

### 7.5 Forced Colors

`forced-colors.ts` provides an `@media (forced-colors: active)` block applied to every component. It replaces gradients, textures, and bevels with 2px solid `ButtonText` or `CanvasText` borders, uses `Highlight` for selected/active emphasis, `GrayText` for disabled, and `Highlight` outlines for focus.

### 7.6 Localization

`localize.ts` exports `setStrings(partial)` and an internal `t(key)`. Phase 1 has one key, `loading` (default `"Loading"`). Components never contain other hard-coded user-facing strings.

### 7.7 Slot Presence

`slot-presence.ts` is a reactive controller reporting whether a named slot has assigned content. It checks light-DOM children synchronously in `hostConnected` and re-evaluates on `slotchange`.

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
- Default semantics: `role="separator"` with `aria-orientation`. When `decorative`, `role="none"`.
- Horizontal with a label draws the label centered with a line on each side.
- Vertical dividers stretch to the container's block size (`align-self: stretch`) and ignore the label slot, emitting a dev warning if it is populated.

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

- Renders a native `<button>` filling the host, through `shadowRootOptions` with `delegatesFocus: true`.
- The class is form-associated (`static formAssociated = true`). On click with `type="submit"` it calls `internals.form?.requestSubmit()`; with `type="reset"` it calls `internals.form?.reset()`. No submitter is passed, so `SubmitEvent.submitter` is `null`; this is a documented limitation in Phase 1.
- The host mirrors its `aria-label` attribute onto the inner button. No other host ARIA attributes are forwarded in Phase 1.
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
- Under `@media (pointer: coarse)`, a `::before` pseudo-element extends the hit area to at least 40px block size (§2 item 7).
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
- The inner button's accessible name comes from `label`. A missing or empty `label` triggers a dev warning.
- Renders an internal `punk-tooltip` anchored to the inner button, showing `label`. This tooltip is created with `describe = false` so screen readers do not read the name twice.
- `::slotted(*)` icons are sized to `--punk-icon-size-<size>`.
- While loading, the icon is hidden and the spinner takes its place; the accessible name stays `label`.

### 8.5 `punk-progress-bar`

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `value` | `value` | `number \| undefined` | `undefined` (indeterminate) | yes |
| `max` | `max` | `number` | `100` | yes |
| `variant` | `variant` | `'default' \| 'success' \| 'warning' \| 'danger'` | `'default'` | yes |
| `label` | `label` | `string` | `''` | yes |
| `labelHidden` | `label-hidden` | `boolean` | `false` | yes |
| `showValue` | `show-value` | `boolean` | `false` | yes |

- **Parts:** `header`, `label`, `value`, `track`, `fill`.
- **CSS properties:** `--punk-progress-height` (default `calc(var(--punk-control-height-sm) * 0.6)`).
- Layout: optional header row (label start, value end) above an inset trough with a fill.
- Semantics: the track element has `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (percentage) when determinate. Indeterminate omits `aria-valuenow`. The label element is its `aria-labelledby` target, and with `label-hidden` it is visually hidden but still present.
- Values are clamped to `[0, max]`. A non-finite `value` is treated as indeterminate; `max <= 0` is treated as `100`. Both cases emit a dev warning.
- The percentage text uses `Intl.NumberFormat` with `style: 'percent'`, `maximumFractionDigits: 0`, and the nearest `lang` ancestor's locale.
- Fill width animates with `transform: scaleX` over `--punk-duration-normal`. ARIA values update immediately; animation is disabled under reduced motion.
- Indeterminate state shows a hazard-stripe fill that scrolls; under reduced motion the stripes are static.
- Variants do not rely on color alone: `success` is a solid fill, `warning` a diagonal hatch, and `danger` a dense cross-hatch.

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
- **Methods:** `show()`, `hide()`.

Anchor resolution:

1. If `for` is set, the anchor is the element with that id in the tooltip's root node.
2. Otherwise it is `previousElementSibling`.

The tooltip must be a sibling of its anchor, not a child: nested content would contribute to the anchor's accessible name.

Behavior:

- The tooltip attaches listeners to its anchor on connect and removes them on disconnect.
- Pointer enter opens after `delay`. Focus (via `:focus-visible` semantics, using `focusin` plus a `matches(':focus-visible')` check) opens immediately. Touch pointers never open a tooltip.
- Closing: pointer leave and blur close the tooltip after a 100ms grace period, which is cancelled if the pointer enters the tooltip itself. This keeps content hoverable, dismissible, and persistent as WCAG 1.4.13 requires.
- Escape closes the tooltip. A capturing `keydown` listener exists on `document` only while open; when it closes the tooltip it calls `stopPropagation()` so that Escape closes only the topmost overlay (SPEC §9.1). Focus does not move.
- At most one tooltip is open at a time; opening one closes the previous. If another tooltip was closed within the last 300ms, the next opens without delay.
- Rendering uses the Popover API (`popover="manual"` on the surface, `showPopover()`/`hidePopover()`) so the tooltip is in the top layer. Without Popover API support, the surface uses `position: fixed` and `--punk-z-overlay`.
- Positioning (`utilities/position.ts`) computes the preferred placement, flips to the opposite side if it does not fit, then shifts along the cross axis to stay within an 8px viewport margin. `start` and `end` are logical and respect `dir`.
- While open, and only then, the tooltip listens for scroll (capture, passive, `requestAnimationFrame`-throttled) and window resize and observes the anchor with `ResizeObserver`. All are removed on close. No document-wide observers exist while closed.
- Description wiring: when `describe` is true, the tooltip sets `role="tooltip"` and an id on its surface. If the anchor has `setExternalDescription` (the `punk-button` family), the tooltip calls it with the tooltip's `textContent`; otherwise it sets `aria-describedby` on the anchor. Both are removed on disconnect.
- A dev warning is emitted when the default slot contains focusable descendants or no anchor can be resolved.

## 9. Documentation Workbench

`apps/storybook` includes:

1. **Toolbar controls:** theme (`industrial`, `industrial-light`, `high-contrast`, `reduced-texture`, `auto`) and density (`compact`, `low`). Both set attributes on the preview root so they combine.
2. **Foundations pages:** color swatches per theme with measured contrast ratios; spacing, control-height, and typography scales; surface recipes (raised, inset, flat) rendered; texture on/off; and an asset policy page covering SPEC §4.3.
3. **One docs page and story set per component:** a playground with controls bound to properties; every state; the theme × density matrix; keyboard instructions beside the example; and a manifest-driven API table (properties, slots, parts, CSS properties).
4. **Overview (first screen):** a composed "machine panel" using panel, divider, buttons, icon buttons, a progress bar, and tooltips.
5. **Plain HTML and TypeScript integration page** with copy-paste import examples.
6. **Demo-only icons** in `src/icons/`: gear, plus, close, info, warning, and check, drawn originally on a 24x24 grid using `currentColor`.

The workbench consumes the built package through the same exports as an external consumer, so it exercises the real `exports` map.

## 10. Testing and CI

### 10.1 Unit and DOM Tests

Run in Chromium, Firefox, and WebKit. Each component has tests covering the criteria in §12, plus these package-wide assertions:

- Importing a component's class entry does not define its element; importing `register.js` does; importing it twice does not throw.
- Every `part` attribute rendered in a component's shadow DOM appears in its manifest `csspart` list, and vice versa.
- Every documented slot, attribute, and CSS property appears in the manifest.

### 10.2 Accessibility

`axe-core` runs against every component fixture in all four themes and both densities. Serious or critical violations fail CI. A forced-colors run (Chromium `forcedColors: 'active'`) verifies borders and focus indicators remain visible.

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

### 10.4 Size, Packaging, and Manifest Gates

| Gate | Threshold |
|------|-----------|
| Shared runtime and tokens (gzip, excluding Lit) | ≤ 12 kB |
| Each component (gzip) | ≤ 5 kB; `punk-tooltip` and `punk-icon-button` must document any exception |
| Tree-shaking | A bundle importing only `button/register.js` must not contain `punk-tooltip` code |
| `publint` and `attw` | No errors |
| Manifest | Generated, valid, and every public component has a description |
| Contrast gate | Passes (§6.8) |

### 10.5 CI

Pipeline stages, all required, all running on Node 26: install, toolchain check (`npm ls typescript` reports a single 6.0.x version), lint, typecheck, build (modules, CSS, manifest), contrast gate, unit tests (3 browsers), axe, visual regression, size and packaging gates, Storybook build.

## 11. Work Packages

Packages are ordered by dependency. Each ends with the CI gates that apply to what it added.

| # | Package | Depends on | Output |
|---|---------|------------|--------|
| 1 | Scaffolding | — | Workspaces, `.nvmrc`, `engines`, tsconfigs (including `tsconfig.scripts.json`), lint, CI skeleton on Node 26, empty `core` package building |
| 2 | Tokens, themes, density | 1 | `tokens/`, `build-css.ts`, `check-contrast.ts`, emitted CSS |
| 3 | Internals and shared styles | 2 | `PunkElement`, `token()`, surfaces, focus, texture, forced-colors, localize, dev flag, registration helper |
| 4 | Panel and divider | 3 | Two components, tests, fixtures |
| 5 | Tooltip | 3 | Component, `position.ts`, tests |
| 6 | Button base, button, icon button | 3, 5 | Components, form behavior, anchor protocol, tests |
| 7 | Progress bar | 3 | Component, tests |
| 8 | Storybook workbench | 3 (stories added per component as 4–7 land) | App, foundations, stories, API tables |
| 9 | Test infrastructure | 4–7 | Visual matrix, axe suite, size and package gates, fixture consumer |
| 10 | Hardening | 9 | Forced-colors, RTL, 200% zoom fixes; budget tuning; docs polish |

Work packages 4, 5, and 7 can proceed in parallel after package 3. Package 8 starts after package 3 so the workbench is available for visual review while components are built.

## 12. Acceptance Criteria

### 12.1 Foundations

1. `tokens.css` and `themes.css` are emitted; all token values originate from `tokens/*.ts`.
2. The contrast gate passes for all four themes.
3. An unstyled page (no stylesheet) renders every component in the default dark, compact appearance.
4. Setting `data-punk-theme` or `data-punk-density` on an ancestor restyles components without re-creating them, for all eight theme × density combinations.
5. `data-punk-theme="auto"` follows `prefers-color-scheme`.

### 12.2 Panel

1. Each variant renders the corresponding surface; no fixed width or height is imposed.
2. Empty `header` and `footer` slots render no strip; adding content later shows it.
3. `density="low"` on a panel increases spacing for its descendants only.

### 12.3 Divider

1. Horizontal and vertical orientations render and report `aria-orientation`.
2. A label renders centered between two lines; vertical ignores it with a dev warning.
3. `decorative` produces `role="none"`.

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

## 13. Definition of Done

Phase 1 is complete when:

1. All acceptance criteria in §12 pass.
2. All gates in §10 pass in CI, with Chromium, Firefox, and WebKit tests green.
3. `@dieselpunk/core` can be consumed from plain HTML and from a TypeScript fixture app with no global setup other than optional CSS imports.
4. Importing any component class has no registration side effect, and the tree-shaking gate passes.
5. The package contains no assets or code derived from Factorio files, and bundled textures and icons (core texture; workbench icons) are documented as original.
6. `SPEC.md` is updated for the decisions in §2 that change its wording.
7. Every script runs as `node <file>.ts` on Node 26 with no TypeScript runner, and `npm ls typescript` reports exactly one version, 6.0.x.

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
