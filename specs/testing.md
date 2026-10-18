# Testing and Quality Gates

**Scope:** how the system is tested: the test layers, the shared gallery, the engines, what every component test covers, visual regression, mutation checking, the package and consumer checks, the list of CI gates, and the testing package that holds the shared tooling.
**Code:** `packages/testing/`, `packages/*/test/`, `packages/*/scripts/check-*.ts`, `packages/core/vitest.config.ts`, `playwright.config.ts`, `scripts/visual.ts`, `build-visual.ts`, `serve-visual.ts`, `packages/workbench/scripts/smoke.ts`, `.github/workflows/`.

## 1. Principles

1. **Test behavior, not implementation.** Tests read what users and tools get: the rendered shadow DOM, the accessibility tree, computed colors, real input.
2. **Never let a gate agree with itself.** The manifest is checked against rendering, not against its JSDoc; axe is proven able to see a violation; the visual harness is proven deterministic; a fixture table must cover every message id.
3. **Every gate is made to fail once** before it is trusted ([§7](#7-mutation-checking)).
4. **One source of states.** The axe, reflow, manifest, strings, and visual suites all render the same gallery, so a state added once is covered everywhere.
5. **Real engines, real platforms.** Component tests run in Chromium, Firefox, and WebKit, and are run on Linux before they are trusted, since macOS does not reproduce every Firefox and WebKit behavior.
6. **Tooling is shared, tests are owned.** The machinery tests run on lives in `@dieselpunk/testing` ([§10](#10-the-testing-package)); the tests, fixtures, and baselines that state what a package does live in that package.

## 2. Layers

| Layer              | Runs under                               | Covers                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logic              | `node --test`, no browser                | Pure modules ([component-model.md §5](component-model.md)), token sources and emitted CSS, the contrast gate, the XLIFF reader and locale rules, the API snapshot, script helpers                                                 |
| Component          | Vitest browser mode, Playwright provider | Each component's behavior, beside its source (`*.test.ts`, `*.registration.test.ts`, `*.reduced-motion.test.ts`)                                                                                                                  |
| Cross-component    | Vitest browser mode                      | `test/browser/`: gallery suites (§3), forms, focus and modality, performance gates, foundations, strings, readout surface and review                                                                                              |
| Accessibility tree | Playwright                               | `test/visual/aria.spec.ts`: ARIA snapshots of every family                                                                                                                                                                        |
| Visual             | Playwright in the pinned image           | `test/visual/matrix.spec.ts` (§6)                                                                                                                                                                                                 |
| Package            | Node scripts                             | Exports, side effects, tree shaking, `publint`, `attw`, sizes, the API snapshot, strings and locales (§8)                                                                                                                         |
| Consumer           | Node scripts and Chromium                | Packed tarballs installed into throwaway projects, type-checked and driven (§8)                                                                                                                                                   |
| Frameworks         | Node scripts and Chromium                | React, Vue, and Svelte fixture apps built and driven (§8)                                                                                                                                                                         |
| Workbench          | Node script, Vitest, and Chromium        | Every story and docs page, widths, guide content, and the real-input steps of the flows; interaction tests on the compositions ([workbench.md §5](workbench.md)); axe over every story ([accessibility.md §13](accessibility.md)) |

## 3. The gallery

`test/browser/fixtures/gallery.ts` renders every component in its states, grouped:

| Group        | Components                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `foundation` | panel, divider, button, icon button, progress bar, tooltip                                                                 |
| `inventory`  | slot, item stack, slot grid, recipe, meter, status light                                                                   |
| `production` | production stat, connection row                                                                                            |
| `shell`      | stack, cluster, accordion and its items, tabs and tab, toolbar, non-modal windows, splitter                                |
| `forms`      | checkbox, switch, slider, range slider, text field, number field, select, date field, time field                           |
| `inputs`     | radio group and radio, textarea, combobox, fieldset, file field                                                            |
| `navigation` | toggle group, list and list item, breadcrumb and item, pagination, steps and step, menubar, tree and tree item, menu items |
| `data`       | table, alert, badge, spinner, keyboard key, description list, tag                                                          |
| `overlays`   | each overlay open on its own page: modal window, dialog, popover in both modes, toast stack, drawer, menu                  |

Each renders in four content variants: `short`, `long` (German), `unlabeled` (optional labels missing), and `rtl`. Fields marked as touched show their messages. The full gallery (`componentNames`, used by the axe, reflow, and manifest suites) also holds the dialog, popover, drawer, and menu closed, an empty toast stack, and inline toasts of each variant; an open modal would make the rest of the page inert, so overlays are open only in `overlays`.

Suites over the gallery:

- **Axe** (`a11y.test.ts`, `overlays-a11y.test.ts`): every group, theme, density, and variant; no serious or critical violation; one exemption, `label-content-name-mismatch` on parent tree items, in `axe.ts` ([keyboard-and-selection.md §14](keyboard-and-selection.md)); two control tests that axe reports a planted violation, one inside a shadow root.
- **Reflow** (`reflow.test.ts`): 187, 256, 375, and 512px; no component past its container's edge and no container scrolling; overlays against the viewport.
- **Manifest** (`manifest.test.ts`): rendered parts and slots, observed attributes, and CSS properties read, against the manifest; descriptions present.
- **Strings** (`strings.test.ts`): no unlocalized text in the pseudo-locale ([localization.md](localization.md) Verification).
- **Visual** (§6). The matrix page throws if any component is unregistered, so a page of undefined elements can never become a baseline.

## 4. Engines

- Local runs default to Chromium. CI runs the browser suites in jobs by engine and part, each setting `PUNK_BROWSERS` to its engine; the config rejects unknown names. Firefox and WebKit render the gallery suites in two theme and density pairs only ([ci.md §5.3](ci.md)).
- Before trusting a new test, run the suite on Linux in the pinned Playwright image from a Linux `npm ci`.
- The Vitest config lists Lit's entry points in `optimizeDeps.include`, so a cold cache never reloads mid-run and loads Lit twice.
- Engine behaviors the helpers account for:
  - Emulated media features reach Firefox about two frames late. `setColorScheme`, `setForcedColors`, and `setReducedMotion` wait until the frame reports the new state, and time out after five seconds rather than hang.
  - Headless Firefox on Linux starts without page focus, and Tab does nothing; `focusWithKeyboard` focuses the window first.
  - WebKit keeps a shared stylesheet's media queries stale after `prefers-reduced-motion` is toggled; a test that toggles it lives in its own `*.reduced-motion.test.ts`, set once in `beforeAll`.
  - Firefox lays out to fractions of a pixel; geometry assertions allow half a pixel.
  - Keyboard events whose default runs before a microtask (Tab in Firefox) need a synchronous update where the component relies on the update.

## 5. What every component test covers

- **Registration:** the class entry defines nothing; `register.js` defines the family; a second import is harmless.
- **Unstyled appearance:** with no stylesheet, the default dark, compact look.
- **Both directions of every property:** set before and after connection, and the attribute added, changed, and removed.
- **Repairs and warnings:** each invalid input is repaired and warns once per occurrence.
- **Semantics:** roles, names, and states, read from the rendered tree.
- **Keyboard:** every key table, in `ltr` and `rtl`.
- **Events:** once per user change, never for a script change, with the documented detail.
- **Ownership:** everything written to a host or a child is restored when it is turned off, the child leaves, or the owner disconnects.
- **Non-color cues:** with every status color forced to one value, the states stay different.
- **Forced colors and reduced motion** where the component has rules for them.

## 6. Visual regression

**Matrix.**

| Dimension | Values                                                              |
| --------- | ------------------------------------------------------------------- |
| Theme     | `dark`, `light`, `high-contrast`, `reduced-texture`                 |
| Density   | `compact`, `low`                                                    |
| Container | 1024px and 375px                                                    |
| Zoom      | 100% and 200% (half the viewport width with `deviceScaleFactor: 2`) |
| Content   | The gallery's variants, cut per group where noted                   |

**Projects.** `chromium` runs the full matrix for every group. `firefox` and `webkit` run the default and `light` with `low` at 100%. `chromium-forced` runs every group with forced colors active at one theme (themes have no effect there), 100%, both densities, both widths, and every variant. Interaction captures (hover, keyboard focus, and pressed, driven by real input, never by class hooks) run in each project, and clip to the target with a margin and a tight tolerance (`threshold: 0.02`, `maxDiffPixelRatio: 0.0005`), since a hover changes only an edge. In CI the visual tests are split by project and gallery group ([ci.md §5.2](ci.md)). The visual tests always run 4 workers, one per vCPU of a GitHub runner, locally as well as in CI.

**Baselines.**

- Rendered only in `mcr.microsoft.com/playwright:v<version>-noble`, with `<version>` the installed `@playwright/test`. `scripts/visual.ts` runs the container off Linux and Playwright directly on Linux. The page is bundled with esbuild on the host (`build-visual.ts`), since esbuild's binary is platform-specific.
- **Committed baselines come from CI**, by the manual "Update visual baselines" workflow, which re-renders all baselines or only some groups and themes and uploads the whole set to commit; the re-rendered ones are deleted first, so no stale baseline lingers ([ci.md §8](ci.md)). `visual.ts update` refuses outside CI, unless forced. A local check against the committed set is precise but not authoritative.
- Each group has its own folder under each project. A group's folder stays under about 20 MB; when it would not, its content variants are cut and the cut is recorded in the gallery.
- The page-level tolerance is `maxDiffPixelRatio: 0.002`, with animations disabled and reduced motion on.
- `node scripts/visual.ts selftest` renders everything twice into a scratch folder and requires identical output, which proves the harness deterministic in every engine without a baseline.
- `packages/testing/test/visual-ci.test.ts` fails if a workflow's image tag differs from the installed Playwright.

## 7. Mutation checking

A test or gate is trusted only after it has failed against a deliberately broken implementation:

- New tests are run against a mutation of the code they guard (a removed rule, an inverted condition, a dropped listener removal, a missing warning). A test that survives is fixed or replaced.
- New gates (`check:*` scripts, performance gates) are made to fail once by adding the cost or defect they guard, then restored.
- A mutation that survives because it is equivalent (it cannot change behavior) is recorded as such in the test, or the redundant code is removed.
- After any mutation run, the source is checked to be restored, since a killed run can leave it mutated.

## 8. Packaging, consumer, and framework checks

- **`check:package`** in each package ([package-contract.md](package-contract.md) Verification).
- **`check:size`** ([performance.md §2](performance.md)).
- **`check:api`** ([package-contract.md §8](package-contract.md)).
- **`check:consumer`** packs both packages, installs the tarballs into throwaway projects with the oldest supported TypeScript (5.0) and the root's, type-checks the fixtures with `skipLibCheck: false` and `@ts-expect-error` guards on unions and event details, bundles them, and drives them in Chromium:
  - `plain.html` and `app.html`: each page defines exactly the tags it imported, upgrades them, applies `tokens.css`, and logs nothing.
  - `import-map.html`: the Integration guide's page without a build step, served from the installed project's own `node_modules/` and resolved by an import map, defines exactly a panel, a divider (which loads the `#dev` warning module), and a button, applies `tokens.css`, and logs nothing.
  - `shell.ts`: the acceptance scenario's assembler ([product.md §8](product.md)): the window opens and is named, a tab switch changes the panel, a selection is reported, a form submits a control's value, Escape closes the window, and only the expected tags are defined.
  - `production.ts`: stats, a meter, a status light, and a connection row in a window; Lit Localize configured from the consumer's own copy; German and Arabic set `lang`, `dir`, and the remove button's name; a remove click reports its detail; and the bundle holds one `@lit/localize`.
  - `ssr/`: in a project with Lit SSR, every tag rendered under Node, then the page upgraded in Chromium without Lit's hydration support, with it alone, and with it and `hydrate.js` ([ssr.md](ssr.md) Verification).
  - `csp/`: the gallery's markup for every component, built against the installed package and served with the Content Security Policy of [security.md §4.3](security.md) as a header: the policy is in force, every tag is defined, and there is no violation and nothing logged.
  - An older TypeScript is installed into the throwaway project, never aliased in the repository, since an alias's binary can replace the real `tsc`.
- **`check:frameworks`** builds a React, a Vue, and a Svelte app from `test/frameworks/` with esbuild and drives each in Chromium with real input: a text field, switch, and slider bound to framework state, a property set from the framework, a submitted form, a tab change, a dialog closed with an action, and a window closed with Escape. Each app reports what it received, which must equal the expected report. The React app is type-checked. The guides show the fixtures' code.

## 9. Gate list

| Gate               | Where     | Fails on                                                                                                                             |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `check:toolchain`  | root      | Another Node major, or more than one TypeScript                                                                                      |
| `format:check`     | root      | Unformatted files                                                                                                                    |
| `lint`             | root      | ESLint errors                                                                                                                        |
| `typecheck`        | all       | Type errors in either compilation context                                                                                            |
| `build`            | all       | Build errors                                                                                                                         |
| `check:contrast`   | core      | A theme below a contrast rule                                                                                                        |
| `check:strings`    | locales   | Extraction changes the XLIFF; a unit without id or note; a non-literal id or description                                             |
| `check:locales`    | locales   | Any translation rule ([localization.md §6](localization.md))                                                                         |
| `check:api`        | core      | Any API difference from the snapshot; an undocumented public name                                                                    |
| `test`             | all       | Node and browser suites; split across CI jobs as [ci.md](ci.md) describes                                                            |
| `check:package`    | all       | Export, side-effect, registration, chunk, `publint`, or `attw` errors                                                                |
| `check:size`       | all       | An entry over its limit, or without a reason                                                                                         |
| `check:lockfile`   | root      | A package from another registry or without integrity, a bad signature, or an unlisted install script ([security.md §5](security.md)) |
| `check:consumer`   | core      | The consumer fixtures                                                                                                                |
| `check:frameworks` | core      | The framework fixtures                                                                                                               |
| `test:smoke`       | storybook | A story or page that errors, warns, overflows, or fails a real-input step                                                            |
| `test:stories`     | storybook | A story that throws, fails its `play` function, or has an accessibility violation                                                    |
| `test:visual`      | core      | A screenshot that differs from its baseline (CI visual job)                                                                          |

## 10. The testing package

`packages/testing` is `@dieselpunk/testing`: the tooling that the other workspaces' tests and gates run on. It holds machinery, not claims. No test of a component, a translation, or a page lives in it; a package's tests, fixtures, gallery, baselines, and gate rules stay in that package.

**Why:** tooling that two workspaces share otherwise gets reached by relative paths across them (the locales size check once ran a core script, and core read the XLIFF reader out of the locales scripts). A move in one workspace then breaks another's tests with no error pointing at it, and every new package copies the reach-arounds.

**Rules.**

- **Private and unbuilt.** `private: true`, never published, and without `build`, `check:package`, `check:size`, or `check:api`. Its exports point at TypeScript sources: Node runs the Node modules by type stripping, and Vite or Playwright compiles the others with the file that imports them. Node strips types only outside `node_modules`, which holds because the workspace link resolves to `packages/testing/`, also inside the Playwright container; nothing runs Node with `--preserve-symlinks`.
- **One direction.** It imports no workspace package. Core, locales, and the workbench list it in `devDependencies` and pass it what is theirs: paths, group and theme lists, a selection parser that checks names, a page to build. **Why:** a cycle would break the root build order and let the tooling depend on the code it checks.
- **Thin entries.** Each workspace keeps its scripts (`scripts/visual.ts`, `build-visual.ts`, `serve-visual.ts`, `check-size-reasons.ts`, and the root `scripts/ci-matrix.ts` and `merge-baselines.ts`) as entries that pass their own data to the tool, so commands, CI steps, and the other specs' names for them do not change. The root `scripts/` are the repository's glue and may read any workspace's files.
- **No reaching across workspaces.** A file in a workspace imports another workspace only by package name, and what two workspaces' tests share goes here. The ESLint rule `local/workspace-imports` rejects a relative import that leaves its workspace, and any import of `@dieselpunk/testing` from a published package's `src/` outside its `*.test.ts` files. The exceptions are marked with a comment that names their gap.
- **One context per export.** Node exports follow the Node-run rules of [toolchain.md §3](toolchain.md) and are checked by `tsconfig.scripts.json`; `./browser` is checked by the package's own `tsconfig.json`. No export mixes the two.
- **Dependencies.** It declares what its modules import: `@vitest/browser-playwright`, esbuild, and Playwright, with `vitest` as a peer. Test runners (`vitest`, `@playwright/test`) stay `devDependencies` of each workspace that runs them, since their binaries run from there, at the one version the root resolves.
- **Its own tests are the exception.** The tooling's logic tests run in its `test:node` with made-up groups, themes, and messages: part selection, matrix packing, change detection, the budget report, baseline merging, size reasons, the XLIFF reader, the pseudo-locale, and the image pin of the workflows. Each tool is made to fail once like any gate (§7).

**Exports.**

| Export         | Context | Contents                                                                                                                                                                             | Used by                                                            |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `./browser`    | Browser | `track`, `cleanup`, `addStyles`, `rgb`, `focusWithKeyboard`, and the typings of the shared browser commands                                                                          | Core and locales browser tests                                     |
| `./vitest`     | Node    | The shared browser commands (media emulation that waits for the frame, a held pointer), the engines chosen by `PUNK_BROWSERS`, the pre-bundled dependencies, and part selection (§4) | Core and locales Vitest configs                                    |
| `./playwright` | Node    | `groupTag`, `themeTag`, and the page and interaction tolerances of §6                                                                                                                | Core's Playwright config and specs, `./ci`                         |
| `./visual`     | Node    | The visual runner (`check`, `update`, `selftest`) in the pinned image or directly on Linux, and the esbuild page bundler                                                             | Core's `test:visual`                                               |
| `./server`     | Node    | A static file server confined to its root                                                                                                                                            | The visual page, the consumer and framework checks, the smoke test |
| `./consumer`   | Node    | Packing a workspace, installing tarballs into a throwaway project, running a command, and collecting a page's errors and warnings                                                    | `check:consumer`, `check:frameworks`                               |
| `./xliff`      | Node    | The XLIFF reader                                                                                                                                                                     | Locales' checks, the pseudo-locale, the workbench's message table  |
| `./pseudo`     | Node    | The pseudo-locale transform ([localization.md](localization.md) Verification)                                                                                                        | Core's `build-pseudo.ts`                                           |
| `./size`       | Node    | The size-reason check ([performance.md §2](performance.md))                                                                                                                          | `check:size` in each package                                       |
| `./ci`         | Node    | Visual, browser, and smoke job planning, change detection, the budget report, and baseline merging ([ci.md](ci.md))                                                                  | The `plan` job, the baseline workflow                              |
| `./lockfile`   | Node    | What a lockfile may install: registry, integrity, and listed install scripts ([security.md §5](security.md))                                                                         |

**Stays in its workspace:**

- Tests and what they render: component tests, the `test/browser/` suites, the gallery, `groups.ts` and its checked `parseSelection`, the test locale, the consumer and framework fixture apps and the consumer probe, `aria.spec.ts`, `matrix.spec.ts` and its `at` tags, `playwright.config.ts`, and the baselines.
- Gate rules that state a package's contract: the contrast rules, the API snapshot, the `check-package` sentinels, the locale and message rules, and string extraction.
- Helpers that know one package: core's `addStylesheets` (its token CSS), its `readManifest` command, and `receptacle-helpers.ts`.
- The smoke test's real-input steps and the workbench's interaction stories.

## Gaps

- **The locales browser test renders core's gallery** through relative imports, the one exception to §10 in a test, and the gallery is core's and stays there. Closing it: either move that suite to a private workspace that depends on both packages, or give it its own sample of each family.
- **The workbench's message table imports the committed German XLIFF** by a relative path, since the locales package does not publish its XLIFF. Closing it: export the XLIFF from the locales package for the workbench, or generate the table's data at build time.

- **Committed baselines were rendered on arm64,** in the pinned image, not by the CI workflow on amd64. They matched CI renders when that was last compared, but the current set has not been. Closing it: run the "Update visual baselines" workflow and commit its output if it differs.
- **Older interaction captures use the page-level tolerance.** The button, slot, connection row, and form-control captures predate the clipped, tight-tolerance captures, and a subtle hover change on them can pass. Closing it: clip them the same way.
- **Vue and Svelte fixtures are built and driven but not type-checked.** Closing it: run `vue-tsc` and `svelte-check` in `check:frameworks`.
- **The readout surface test covers two components** ([visual-system.md](visual-system.md) Gaps).
