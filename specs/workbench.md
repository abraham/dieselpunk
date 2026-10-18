# Documentation Site

**Scope:** the Storybook workbench, the private package `@dieselpunk/workbench` in `packages/workbench`, and its publication as the public documentation at **https://dieselpunk.dev**: what it is for, how it consumes the library, what it contains, how it is tested, and how it is built, hosted, and deployed.
**Code:** `packages/workbench/`: `.storybook/`, `src/stories/`, `src/lib/`, `src/icons/`, `src/styles/workbench.css`, `public/`, `scripts/smoke.ts`, `scripts/site.ts`; `.github/workflows/docs.yml`.

## 1. Purpose

The workbench is where people build with and review the library, not a marketing site, and it is the same build that is published at dieselpunk.dev: there is no second documentation site to keep in step. Its first screen is the **Inventory overview**: an assembler built from a panel, a slot grid of item stacks, a recipe, a progress bar, meters, status lights, and buttons. Every component, state, theme, and density is reachable from the sidebar, and every claim in a guide is backed by something that runs.

## 2. Build and consumption

- **The package.** `packages/workbench` is `@dieselpunk/workbench`: `private: true`, never published, and without `check:package`, `check:size`, or `check:api`. Its scripts are `dev`, `build`, `build:site`, `typecheck`, `test:smoke`, and `test:stories`; the root `start`, `storybook`, and `test:smoke` delegate to it. It depends on `@dieselpunk/core` and `@dieselpunk/locales`, and on `@dieselpunk/testing` for development, and imports each only by package name ([testing.md §10](testing.md)). **Why:** with every workspace in `packages/`, the root `workspaces` is one glob, and the import rule, `tsconfig.scripts.json`, and CI change detection have one layout to know; an `apps/` folder held this one workspace only.
- **Addresses do not depend on the folder.** Storybook ids come from titles and export names (§7), so moving or renaming the package changes no published page.
- Storybook for web components with Vite (`@storybook/web-components-vite`), with the docs and accessibility addons, and the Vitest addon to run the accessibility checks ([accessibility.md §13](accessibility.md)).
- The workbench imports the **built** packages through their public exports, including `custom-elements.json`, exactly as an external consumer does, so it exercises the real `exports` map. The root `storybook` script builds core first; its `typecheck` reads whatever was last built, so run `npm run build` before it, as CI does ([ci.md §3](ci.md)).
- The `development` export condition is on in every build, so development warnings (a missing name, a bad range) show in stories.
- Fonts (Chakra Petch, IBM Plex Mono) come from `@fontsource` as development dependencies; neither package bundles a font.

## 3. Structure

- **Toolbar controls** set `data-punk-theme` (`dark`, `light`, `high-contrast`, `reduced-texture`, `auto`) and `data-punk-density` (`compact`, `low`) on each story's stage wrapper, not on `<html>`, so each story is themed independently, they combine, and Storybook's own chrome keeps its look.
- **Overview:** Inventory (the first screen) and Application shell (the acceptance scenario's assembler: a movable, dismissible window with a toolbar, tabs for Production, Modules, Settings, and Logistics, a recipe, a progress bar, status lights and stats, a slot grid of item stacks, a settings form with a live `FormData` display, a confirmation dialog, a popover menu, connection rows, and toasts, all wired from outside with the components' own events).
- **Foundations:** colors per theme with contrast ratios measured in the browser from computed properties (the gate's pairs), spacing, control-height, and typography scales parsed from the shipped `tokens.css`, the surface recipes, texture on and off, and the Machine panel composition.
- **One page per component family:** a playground with controls from the manifest; every state; the theme by density matrix; a keyboard table beside the example; and an API table from the manifest. Overlays open from a button. Families add stories where a state needs one (the slot grid's selection modes, narrow container, and 100 slots; the connection row's removal pattern with focus moved and Undo).
- **Examples:** Production dashboard (stats with sparklines, meters, status lights, and progress bars, updated once a second by a seeded simulation, with a visible Pause updates switch, never moving focus or announcing, and stopping its timer when the story is not shown); Logistics network (a filterable list of connection rows, a confirming dialog before removal, focus to the next row or the heading, and an Undo toast); Interface settings (a locale select over English and the five packs, applied with `setLocale` and `bindDocumentLocale`, with theme and density).
- **Demo art:** original icons (gear, plus, close, info, warning, check) and item art (gear, plate, circuit, module, coil), drawn on a 24px grid in `currentColor`, in `src/icons/`. They are workbench-only and documented on the asset policy page.

## 4. Guides

| Guide                    | Covers                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration              | Installing, plain HTML and TypeScript: class versus register imports, CSS, a page without a build step through an import map (the page `check:consumer` loads), typing, forms, and localization setup |
| React, Vue, Svelte       | Properties versus attributes, `punk-` and native events, binding a value, calling methods, typing; each shows its fixture's code with `?raw`, so the page is what `check:frameworks` built            |
| Forms                    | Association, what each control submits, defaults and reset, validation timing, fieldsets, names and labels, events, platform limits                                                                   |
| Focus and overlays       | Modality, the Escape order, backdrop clicks, popover focus modes, toast announcements and modals, window move mode                                                                                    |
| Responsive layouts       | Windows and footers at 560px and 320px, a tall modal, a settings row from stack, cluster, and a container query; containers decide                                                                    |
| Accessibility and layout | Reflow, right-to-left, forced colors, reduced motion, focus, each family's keyboard model and non-color cues                                                                                          |
| Localization             | Configuring Lit Localize, merging application messages, `bindDocumentLocale`, writing XLIFF, the rules, what does not change, and a table of every message read from the XLIFF                        |
| Performance              | Budgets, what each component costs, updating many stats, `content-visibility` for long lists with measurements and caveats, a list of connection rows virtualized with `@lit-labs/virtualizer`        |
| Screen reader checklist  | The manual scenarios and combinations of [accessibility.md §14](accessibility.md), and the results table                                                                                              |
| Asset policy             | What is original, what applications must supply, and the rule against game-derived assets                                                                                                             |

## 5. Smoke and interaction tests

Two runners check the workbench, and each flow runs in one of them, never both.

**Interaction tests** are `play` functions written with `storybook/test` (`userEvent`, `expect`, `waitFor`). `test:stories` runs them together with the accessibility check ([accessibility.md §13](accessibility.md)), and a failure can be stepped through in the Interactions panel. They cover the compositions:

- the Application shell: tabs, the live form, opening the Stop dialog, and the Actions menu;
- the examples: dashboard updates, pause, and resume without focus moves or announcements; logistics removal, cancel, Undo, filter, and focus targets; interface-settings `lang`, `dir`, and names for every locale.

The rules for them:

- **Compositions only.** A component's own behavior is tested beside its source, in three engines and with real input ([testing.md §2](testing.md)). A component story has a `play` function only to wait for a state its accessibility check needs.
- **A flow is its own story.** It extends the story it drives (`Story.extend()`), is tagged `!dev`, `!autodocs`, and `flow` so it is tested but not listed, and is named `<Story> flow`. The smoke test skips stories tagged `flow`. **Why:** a `play` function also runs when a reader opens the story, which would leave an example mid-flow, with a dialog open or a row removed.
- **Synthetic input stays synthetic.** `userEvent` dispatches events from the page; it does not do what the browser does with a real key. A step that depends on that (Escape closing a native `<dialog>` or a popover, Tab moving focus, `:focus-visible`) stays in the smoke test.
- **Flows that move focus or run timers do not run beside each other.** The stories tagged `flow` run in their own Vitest project, `flows`, without file parallelism and after the other stories, since a story that takes focus in one frame blurs the others.

**The smoke test**, `scripts/smoke.ts`, loads the built workbench in Chromium with Playwright and fails on:

- any story or docs page that throws, or logs a warning or error other than Lit's one-time development notice (so a story that misuses a component fails);
- sideways scrolling of more than 1px at 375px and 187px for the overviews, the examples, and the responsive-layout stories;
- the steps that need real input: Escape on the Stop dialog, the Actions menu, and the removal dialog, and where focus returns after each;
- guide content: each framework guide contains its app's code, the Integration guide contains its import-map page, the Localization table lists every message id, the checklist has its rows and combinations, and the guides with Markdown tables render them as tables.

An entry counts as loaded when Storybook's preview reports it rendered (or failed), and two frames later; entries load 4 at a time, and the flows run after them, one at a time. `PUNK_SMOKE_PART=<n>/<total>` checks one slice of the entries, with the flows in the first part ([ci.md §5.4](ci.md)).

## 6. Authoring rules

- MDX is compiled with GitHub-flavored Markdown (`remark-gfm`), so docs pages use pipe tables; JSX tables are for tables built from data.
- Slot content in a story's controls is a string argument named `<slot>-slot` (`default-slot`, `header-slot`), which the manifest helpers render. Demo icons are therefore available as SVG strings.
- A story never produces a development warning: an icon button has a label, a grid has a name.
- A story with a timer stops it when the story is not shown.
- A slotted control in a shadow-rendered footer (a dialog's buttons) is found from the page with an exact accessible name, not from the overlay's locator.

## 7. The public site

**Domain.** `https://dieselpunk.dev` is the canonical address. HTTPS is enforced, `www.dieselpunk.dev` redirects to the apex, and every page declares the apex as canonical.

**What is served.**

| Path                          | Content                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `/`                           | The workbench, built from the latest release, opening on the Inventory overview  |
| `/next/`                      | The workbench built from `main`, marked as unreleased in its sidebar header      |
| `/v<major>/`                  | The last build of each earlier major version, kept after a new major is released |
| `/custom-elements.json`       | The manifest of the release that `/` documents, for editors and tooling          |
| `/sitemap.xml`, `/robots.txt` | Generated from Storybook's `index.json`: one entry per docs page                 |
| `/404.html`                   | A static page in the industrial look that links to the overview and the guides   |

Before 1.0 there are no releases, so `/` is built from `main` and `/next/` does not exist.

**Stable addresses.** A published page's address is its Storybook id (`?path=/docs/<id>` and `?path=/story/<id>`), derived from its title and export name. Once published, an id is public surface like the API: renaming a title or export changes the address, so a page that moves keeps its old id with an explicit `id` or is listed as removed in the published-ids file (`packages/workbench/published-ids.json`), which a CI check compares with the build.

**Identity.** The Storybook manager uses a theme built from the industrial tokens (canvas, panel, text, accent, and fonts), with the site title "Dieselpunk" and an original logo and favicon in `public/`, so the chrome matches the components. Every page has a title, a description, and social-card metadata with an original image. Nothing in them is derived from game assets ([product.md §4](product.md)).

**Privacy and third parties.** The site makes no request to any other origin: fonts are bundled from `@fontsource`, there is no analytics, tracking, cookie, or embedded third-party content, and Storybook's telemetry is disabled in the build. A Content Security Policy that allows only the site's own origin (with the inline styles and scripts Storybook needs) is set by a `<meta>` tag, since the host does not set headers.

**Accessibility.** The site's own pages (overviews, guides, and examples) meet the same WCAG 2.2 AA target as the components. The Storybook manager chrome is a third-party application and is tested only for what this site configures in it (theme contrast, the logo's name).

**Browsers.** The site supports the same browsers as the library: the latest two major versions of Chrome, Firefox, and Safari ([product.md §7.1](product.md)).

**Getting started.** The Integration guide is the entry for newcomers and is linked from the sidebar header: it shows `npm install`, the class and register imports, the stylesheets, and a plain HTML page that loads the packages through an import map, so a reader can copy a working page.

**Package links.** The `homepage` field of `@dieselpunk/core` and `@dieselpunk/locales` is `https://dieselpunk.dev`, their `repository` is `abraham/dieselpunk` with the package's folder as its `directory`, and each component's manifest description links its docs page.

## 8. Publishing

- **Host:** GitHub Pages for `abraham/dieselpunk`, deployed by GitHub Actions. The custom domain is set in the repository's Pages settings; deployments from Actions need no `CNAME` file. **Why:** it is part of the repository's existing CI, needs no other account or secret, and serves static files, which is all a Storybook build is.
- **Workflow** (`.github/workflows/docs.yml`) builds and deploys, and nothing else: it runs no tests and does not wait for CI, which tests the same commit on its own. On a published release it builds the release into `/`; on a push to `main` it builds `main` into `/next/` (or `/` before 1.0). It also runs on demand (`workflow_dispatch`). Each run: `npm ci`, build core, locales, and the workbench, add the manifest, sitemap, and robots file (`npm run build:site -w @dieselpunk/workbench`, from `scripts/site.ts`) and earlier major versions, and deploy the assembled folder with `actions/upload-pages-artifact` and `actions/deploy-pages`. A failed build deploys nothing. **Why:** documentation should follow `main` promptly, and a failing or slow test elsewhere in CI should not hold back a docs fix.
- **Pull requests** do not run the docs workflow; CI builds the workbench and runs the smoke test on them.
- **Concurrency:** one deployment at a time; a newer run cancels a queued older one.
- **Rollback** is re-running the docs workflow for the previous release.
- **DNS** (apex `A`/`AAAA` records and the `www` `CNAME` at the registrar) is the owner's and outside the repository.

## Verification

- `npm run build` builds the workbench; `test:smoke` runs the smoke test of §5 in CI, and `test:stories` runs §5's interaction tests and the accessibility addon over every story ([accessibility.md §13](accessibility.md)).
- Every guide's framework code is the code `check:frameworks` builds, and the Integration guide's import-map page is the page `check:consumer` loads from a fresh install.
- Foundations data is measured from the built CSS, so it cannot drift from what consumers get.
- Nothing gates a deploy but a successful build: a commit that fails CI on `main` is still published, and the CI failure is fixed on `main`.

## Gaps

- **The screen reader results table is empty** ([accessibility.md](accessibility.md) Gaps).
- **Only the pre-1.0 path is built.** `docs.yml` deploys `main` to `/`. The release build into `/`, `main` into `/next/`, and the kept `/v<major>/` folders are added with the first release.
- **No identity.** The Storybook manager uses its default theme; there is no logo, favicon, social image, page descriptions, or 404 page.
- **No published-ids file or check** in CI.
- **The guides are not scanned by axe.** The accessibility addon checks stories, which include the overviews and examples, but not MDX docs pages ([accessibility.md §13](accessibility.md)). Closing it: run axe over every docs page in the smoke test, outside the Storybook chrome.
- **Manifest descriptions do not link their docs pages.**
