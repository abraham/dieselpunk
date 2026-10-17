# Documentation Site

**Scope:** the Storybook workbench in `apps/storybook` and its publication as the public documentation at **https://dieselpunk.dev**: what it is for, how it consumes the library, what it contains, how it is tested, and how it is built, hosted, and deployed.
**Code:** `apps/storybook/.storybook/`, `src/stories/`, `src/lib/`, `src/icons/`, `src/styles/workbench.css`, `public/`, `scripts/smoke.ts`, `.github/workflows/docs.yml`.

## 1. Purpose

The workbench is where people build with and review the library, not a marketing site, and it is the same build that is published at dieselpunk.dev: there is no second documentation site to keep in step. Its first screen is the **Inventory overview**: an assembler built from a panel, a slot grid of item stacks, a recipe, a progress bar, meters, status lights, and buttons. Every component, state, theme, and density is reachable from the sidebar, and every claim in a guide is backed by something that runs.

## 2. Build and consumption

- Storybook for web components with Vite (`@storybook/web-components-vite`).
- The workbench imports the **built** packages through their public exports, including `custom-elements.json`, exactly as an external consumer does, so it exercises the real `exports` map. Its `typecheck` and the root `storybook` script build core first.
- The `development` export condition is on in every build, so development warnings (a missing name, a bad range) show in stories.
- Fonts (Chakra Petch, IBM Plex Mono) come from `@fontsource` as development dependencies; neither package bundles a font.

## 3. Structure

- **Toolbar controls** set `data-punk-theme` (`industrial`, `industrial-light`, `high-contrast`, `reduced-texture`, `auto`) and `data-punk-density` (`compact`, `low`) on each story's stage wrapper, not on `<html>`, so each story is themed independently, they combine, and Storybook's own chrome keeps its look.
- **Overview:** Inventory (the first screen) and Application shell (the acceptance scenario's assembler: a movable, dismissible window with a toolbar, tabs for Production, Modules, Settings, and Logistics, a recipe, a progress bar, status lights and stats, a slot grid of item stacks, a settings form with a live `FormData` display, a confirmation dialog, a popover menu, connection rows, and toasts, all wired from outside with the components' own events).
- **Foundations:** colors per theme with contrast ratios measured in the browser from computed properties (the gate's pairs), spacing, control-height, and typography scales parsed from the shipped `tokens.css`, the surface recipes, texture on and off, and the Machine panel composition.
- **One page per component family:** a playground with controls from the manifest; every state; the theme by density matrix; a keyboard table beside the example; and an API table from the manifest. Overlays open from a button. Families add stories where a state needs one (the slot grid's selection modes, narrow container, and 100 slots; the connection row's removal pattern with focus moved and Undo).
- **Examples:** Production dashboard (stats with sparklines, meters, status lights, and progress bars, updated once a second by a seeded simulation, with a visible Pause updates switch, never moving focus or announcing, and stopping its timer when the story is not shown); Logistics network (a filterable list of connection rows, a confirming dialog before removal, focus to the next row or the heading, and an Undo toast); Interface settings (a locale select over English and the five packs, applied with `setLocale` and `bindDocumentLocale`, with theme and density).
- **Demo art:** original icons (gear, plus, close, info, warning, check) and item art (gear, plate, circuit, module, coil), drawn on a 24px grid in `currentColor`, in `src/icons/`. They are workbench-only and documented on the asset policy page.

## 4. Guides

| Guide                    | Covers                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration              | Plain HTML and TypeScript: class versus register imports, CSS, typing, forms, and localization setup                                                                                           |
| React, Vue, Svelte       | Properties versus attributes, `punk-` and native events, binding a value, calling methods, typing; each shows its fixture's code with `?raw`, so the page is what `check:frameworks` built     |
| Forms                    | Association, what each control submits, defaults and reset, validation timing, fieldsets, names and labels, events, platform limits                                                            |
| Focus and overlays       | Modality, the Escape order, backdrop clicks, popover focus modes, toast announcements and modals, window move mode                                                                             |
| Responsive layouts       | Windows and footers at 560px and 320px, a tall modal, a settings row from stack, cluster, and a container query; containers decide                                                             |
| Accessibility and layout | Reflow, right-to-left, forced colors, reduced motion, focus, each family's keyboard model and non-color cues                                                                                   |
| Localization             | Configuring Lit Localize, merging application messages, `bindDocumentLocale`, writing XLIFF, the rules, what does not change, and a table of every message read from the XLIFF                 |
| Performance              | Budgets, what each component costs, updating many stats, `content-visibility` for long lists with measurements and caveats, a list of connection rows virtualized with `@lit-labs/virtualizer` |
| Screen reader checklist  | The manual scenarios and combinations of [accessibility.md §13](accessibility.md), and the results table                                                                                       |
| Asset policy             | What is original, what applications must supply, and the rule against game-derived assets                                                                                                      |

## 5. Smoke test

`scripts/smoke.ts` loads the built workbench in Chromium and fails on:

- any story or docs page that throws, or logs a warning or error other than Lit's one-time development notice (so a story that misuses a component fails);
- sideways scrolling of more than 1px at 375px and 187px for the overviews, the examples, and the responsive-layout stories;
- the Application shell's keyboard flows: tabs, the live form, the Stop dialog and its focus return, and the Actions menu;
- the examples' flows: dashboard updates, pause, and resume without focus moves or announcements; logistics removal, cancel, Undo, filter, and focus targets; interface-settings `lang`, `dir`, and names for every locale;
- guide content: each framework guide contains its app's code, the Localization table lists every message id, and the checklist has its rows and combinations.

## 6. Authoring rules

- MDX here has no GitHub-flavored Markdown: pipe tables do not render, so docs pages use JSX tables.
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

**Stable addresses.** A published page's address is its Storybook id (`?path=/docs/<id>` and `?path=/story/<id>`), derived from its title and export name. Once published, an id is public surface like the API: renaming a title or export changes the address, so a page that moves keeps its old id with an explicit `id` or is listed as removed in the published-ids file (`apps/storybook/published-ids.json`), which a check compares with the build ([§8](#8-publishing)).

**Identity.** The Storybook manager uses a theme built from the industrial tokens (canvas, panel, text, accent, and fonts), with the site title "Dieselpunk" and an original logo and favicon in `public/`, so the chrome matches the components. Every page has a title, a description, and social-card metadata with an original image. Nothing in them is derived from game assets ([product.md §4](product.md)).

**Privacy and third parties.** The site makes no request to any other origin: fonts are bundled from `@fontsource`, there is no analytics, tracking, cookie, or embedded third-party content, and Storybook's telemetry is disabled in the build. A Content Security Policy that allows only the site's own origin (with the inline styles and scripts Storybook needs) is set by a `<meta>` tag, since the host does not set headers.

**Accessibility.** The site's own pages (overviews, guides, and examples) meet the same WCAG 2.2 AA target as the components. The Storybook manager chrome is a third-party application and is tested only for what this site configures in it (theme contrast, the logo's name).

**Getting started.** The Integration guide is the entry for newcomers and is linked from the sidebar header: it shows `npm install`, the class and register imports, the stylesheets, and a plain HTML page that loads the packages through an import map, so a reader can copy a working page.

**Package links.** The `homepage` field of `@dieselpunk/core` and `@dieselpunk/locales` is `https://dieselpunk.dev`, and each component's manifest description links its docs page.

## 8. Publishing

- **Host:** GitHub Pages for `abraham/dieselpunk`, deployed by GitHub Actions. The custom domain is set in the repository's Pages settings; deployments from Actions need no `CNAME` file. **Why:** it is part of the repository's existing CI, needs no other account or secret, and serves static files, which is all a Storybook build is.
- **Workflow** (`.github/workflows/docs.yml`): on a published release it builds the release into `/`; on a push to `main` that passes CI it builds `main` into `/next/` (or `/` before 1.0). Each run: `npm ci`, build core, locales, and the workbench, run `test:smoke` and the published-ids check against the built output, add the manifest, sitemap, robots file, and earlier major versions, and deploy the assembled folder. A failing check deploys nothing, so the live site is never older than its last good build and never broken by a bad one.
- **Pull requests** build the site and upload it as an artifact for review; they never deploy.
- **Concurrency:** one deployment at a time; a newer run cancels a queued older one.
- **Rollback** is re-running the docs workflow for the previous release.
- **DNS** (apex `A`/`AAAA` records and the `www` `CNAME` at the registrar) is the owner's and outside the repository.

## Verification

- `npm run build` builds the workbench; `test:smoke` runs §5.
- Every guide's framework code is the code `check:frameworks` builds.
- Foundations data is measured from the built CSS, so it cannot drift from what consumers get.
- The docs workflow deploys only after `test:smoke` and the published-ids check pass on the exact output it deploys.

## Gaps

- **The screen reader results table is empty** ([accessibility.md](accessibility.md) Gaps).
- **The site is not published.** There is no `docs.yml` workflow, no custom domain in the Pages settings, and no DNS record for dieselpunk.dev.
- **No identity.** The Storybook manager uses its default theme; there is no logo, favicon, social image, page descriptions, 404 page, sitemap, or robots file, and telemetry is not disabled.
- **No published-ids file or check.**
- **The guides and overviews are not scanned by axe.** Closing it: run axe over every docs page and example in the smoke test, outside the Storybook chrome.
- **The packages have no `homepage` or `repository` field,** and manifest descriptions do not link their docs pages.
- **The Integration guide has no `npm install` step or plain HTML import-map page,** since the packages are not on npm yet.
