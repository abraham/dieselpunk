# Toolchain and Repository

**Scope:** how the repository is laid out, which tools build and check it, how code runs, and how dependencies are kept.
**Code:** root `package.json`, `tsconfig.base.json`, `tsconfig.scripts.json`, `eslint.config.js`, `.prettierrc.json`, `scripts/`, `.github/`, and each workspace's `package.json`, `tsconfig*.json`, and `scripts/`.

## 1. Layout

```text
package.json              private workspace root: engines.node >=26, the one TypeScript, root scripts
.nvmrc                    26
tsconfig.base.json        shared compiler options
tsconfig.scripts.json     Node-run code (§3)
scripts/                  the repository's glue: check-toolchain, ci-matrix, merge-baselines
specs/                    these specifications
packages/
  core/                   @dieselpunk/core
    src/
      components/<name>/  <name>.ts, <name>.styles.ts, index.ts, register.ts, tests beside them
      internal/           base classes, controllers, and pure logic (component-model.md)
      styles/             shared style modules (visual-system.md)
      tokens/             token sources (visual-system.md §1)
      utilities/          registration, development warnings, locale resolution, positioning
      index.ts            class and type exports only
    scripts/              build, check, and visual-test scripts, run as `node <file>.ts`
    test/                 Node logic tests, browser suites, the gallery, visual tests, fixtures
  locales/                @dieselpunk/locales
    xliff/                committed translations
    src/                  loader, metadata, document binding, per-locale re-exports
    scripts/              check-strings, check-locales, and the message and locale rules
  testing/                @dieselpunk/testing (private): the shared test tooling (testing.md §10)
    src/                  one module per export, run from source
    test/                 Node tests of the tooling itself
  workbench/              @dieselpunk/workbench (private): the Storybook workbench (workbench.md)
```

A component's tests live beside it. Tests that span components (the gallery suites, form participation, focus and modality, performance) live in `packages/core/test/browser/`. Pure-logic tests live in `packages/core/test/*.test.ts` and run under Node. The machinery tests run on, shared by more than one workspace, lives in `packages/testing` and holds no test of another package.

## 2. Language and runtime

| Concern          | Choice                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager  | npm workspaces, one lockfile                                                                                                                                     |
| Development Node | Node.js 26, from `.nvmrc`; `engines.node` is on the private root only, since the published packages are browser code                                             |
| Language         | TypeScript `~6.0`, declared once at the root, `strict`, `target` and `module` `ESNext`, `lib` `ESNext`, `DOM`, `DOM.Iterable`                                    |
| Decorators       | `experimentalDecorators: true`, `useDefineForClassFields: false`, as Lit documents                                                                               |
| Rendering        | Lit 3                                                                                                                                                            |
| Module output    | `tsc` emits unbundled ESNext modules and declarations into `dist/`, mirroring `src/`, with `rewriteRelativeImportExtensions` turning `.ts` specifiers into `.js` |

**One TypeScript.** The repository resolves exactly one TypeScript, 6.0.x. `typescript-eslint` caps it below 6.1, and TypeScript 7 has no JavaScript API, which `typescript-eslint`, the Custom Elements Manifest analyzer, and `@lit/localize-tools` all need. Tools that ask for an older TypeScript are forced onto the root copy with `overrides` (`"typescript": "$typescript"`, plus an explicit entry for any tool whose nested range the global override does not reach). `npm run check:toolchain` fails on a second copy or another Node major.

**Why** one copy: two TypeScripts in one tree silently make some tools type-check with the wrong one, which is worse than a peer-range warning.

## 3. Two compilation contexts

| Context                  | Files                                                                                                                                                               | Run by                                                      | Syntax                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Library and browser code | `src/**` (except the Node-run modules below), `test/browser/**`, `packages/testing/src/browser.ts`, the workbench                                                   | `tsc` for `dist/`; Vite and esbuild for tests and Storybook | Any TypeScript, decorators included |
| Node-run code            | `scripts/**`, `test/*.test.ts`, config files, the token data modules, every pure logic module a Node test imports, and the other modules of `packages/testing/src/` | Node 26 directly, by type stripping                         | Erasable syntax only                |

Rules for Node-run code, enforced by `tsconfig.scripts.json`:

- `erasableSyntaxOnly`: no `enum`, runtime `namespace`, constructor parameter properties, or `import x = require()`. Use `as const` objects and unions.
- `verbatimModuleSyntax`: type-only imports and exports say `type`.
- Relative imports carry the real `.ts` extension (`allowImportingTsExtensions`), and `module`/`moduleResolution` are `nodenext`.
- No import of Lit or a DOM API. A pure module that needs `Intl` may use it; one that needs `document` is split in two, a pure part and a DOM part ([component-model.md §5](component-model.md)).
- Built-ins use the `node:` prefix.

There is no `tsx`, `ts-node`, or script build step: every script runs as `node <file>.ts`. Node does not type-check, so `npm run typecheck` runs `tsc` over both contexts, and CI fails on either.

## 4. Builds

| Workspace | `npm run build`                                                                                                                                                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core      | `tsc -p tsconfig.build.json` (emits `dist/` from `src/`, no tests), then `scripts/inline-tokens.ts` (token defaults written into `dist/`), then `scripts/minify-css.ts` (`css` templates in `dist/` minified), then `scripts/build-css.ts` (`tokens.css`, `themes.css`, `surfaces.css`), then the Custom Elements Manifest |
| locales   | `lit-localize build` (generated runtime modules from the XLIFF), then `tsc`, then `check:locales`                                                                                                                                                                                                                          |
| workbench | Builds the workbench against the built packages                                                                                                                                                                                                                                                                            |

The root `build` runs every workspace in dependency order. Generated files (`dist/`, `custom-elements.json`, `packages/locales/src/generated/`, the test pseudo-locale) are not committed. Scripts that read generated sources make them first (`pretest:browser`, and `typecheck` for the locale modules and pseudo-locale). No typecheck builds `dist/`, so the workbench's `typecheck` runs after `build`.

## 5. Scripts

Root scripts aggregate the workspaces (`--workspaces --if-present`) or delegate to the one that owns the check. The full list, and what each gate checks, is in [testing.md §9](testing.md). A new check is a TypeScript file in the owning workspace's `scripts/`, a `check:<name>` script there, a root alias, and a CI step; machinery that more than one workspace needs goes in `packages/testing`, with a thin entry in each ([testing.md §10](testing.md)).

## 6. Lint and format

- ESLint flat config with `typescript-eslint`, `eslint-plugin-lit`, and `eslint-plugin-wc`. A rule is turned off only with a comment that says why.
- `local/workspace-imports`, defined in `eslint.config.js`, keeps imports inside their workspace ([testing.md §10](testing.md)).
- Prettier with `singleQuote` and `printWidth: 100`, over code and these specs.
- `npm run format:check` and `npm run lint` are CI gates.

## 7. Dependencies

- **Core runtime:** `lit` and `@lit/localize`. Nothing else, ever, without a change to [product.md §2](product.md). Lit Labs packages, whose APIs may change, are never runtime dependencies of core: `@lit-labs/virtualizer` is a peer dependency of the planned optional package for virtualized containers only ([performance.md §4.1](performance.md)).
- **Locales runtime:** none. `@dieselpunk/core` and `@lit/localize` are peer dependencies.
- **Development:** Vitest with the Playwright provider, Playwright, `axe-core`, `@custom-elements-manifest/analyzer`, `@lit/localize-tools`, `size-limit` with its esbuild plugin, `publint`, `@arethetypeswrong/cli`, Storybook with `@wc-toolkit/storybook-helpers`, `@fontsource` fonts for the workbench, and the framework fixture dependencies.
- **Updates:** Dependabot opens weekly grouped pull requests for npm and GitHub Actions. Packages that release together are one group (Storybook, `size-limit`, Vitest, linting, fonts, framework fixtures). Held back on purpose:
  - **TypeScript** takes patch updates only (§2).
  - **`@types/node`** takes no major update; it follows `.nvmrc`.
  - **Playwright** takes no automatic update. Its version is also the tag of the CI container image, and every new version invalidates every visual baseline. It is upgraded by hand: package versions and both workflow image tags together, then the baseline workflow ([testing.md §6](testing.md)).
  - **React, Vue, and Svelte** take no automatic major update; each is upgraded with its integration guide.

## 8. Continuous integration

The workflows, their jobs, how they split the suites, and their time budgets are specified in [ci.md](ci.md). Every job runs on the Node of `.nvmrc`, and every check it runs is a root script listed in [testing.md §9](testing.md), so CI never runs a command a developer cannot run locally.

## Verification

- `check:toolchain`: Node major and a single TypeScript 6.0.x.
- `typecheck`: both compilation contexts, all workspaces.
- `lint`, `format:check`.
- `packages/testing/test/visual-ci.test.ts`: both workflows pin the image of the installed Playwright.
- Every script is exercised in CI by running it; none has a separate build.

## Gaps

- **Peer ranges are overridden, not satisfied.** The manifest analyzer, `@arethetypeswrong/core`, and `@lit/localize-tools` declare TypeScript 5.x ranges, so `npm ls` reports them as invalid. This is expected while §2 holds. It closes when those tools accept 6.x, or when `typescript-eslint` supports TypeScript 7 and the whole toolchain moves together.
