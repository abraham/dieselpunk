# Security

**Scope:** what keeps the published packages, the release path, and the pages that use them safe: the threat model, rules for shipped code, checks on each change (code, dependencies, workflows), the provenance of a release, and how findings are handled. Known advisories in dependencies are Dependabot's (§5.1); this spec's checks run on changes and releases, never on a schedule.
**Code:** `eslint.config.js`, `packages/testing/test/security-lint.test.ts`, `scripts/check-lockfile.ts`, `packages/testing/src/lockfile.ts`, `scripts/sbom.ts`, `scripts/check-codeql.ts`, `packages/testing/src/sarif.ts`, `.github/codeql/codeql-config.yml`, `.install-scripts.json`, `packages/testing/src/workflows.ts`, `packages/testing/test/workflows.test.ts`, `packages/core/test/package/csp/`, `.github/workflows/ci.yml` (the `security` job), `.github/workflows/publish.yml`, `.github/dependabot.yml`, `SECURITY.md`.

## 1. Goals

1. **No change adds a hole.** A pull request cannot add an injection sink, a code-scanning alert of high or critical severity, a dependency with a known high or critical advisory, an unreviewed install script, or a workflow that leaks its token.
2. **What is on npm is what CI built.** A package version can only come from a reviewed commit on `main` that passed `ci-success`, built by `publish.yml`, with provenance that says so.
3. **No injection sinks in consumers' pages.** The library adds no way for data to become markup or script, and works on a page with a strict Content Security Policy and Trusted Types.
4. **Automated, with a person only for judgment.** Every check runs on the change or release that it guards, without anyone starting it. A person decides only whether a finding is fixed or exempted, and writes down why.
5. **Quiet enough to be read.** A check that fails a pull request fails for something the pull request changed. **Why:** an advisory published against unchanged code is not the next pull request's fault; Dependabot turns it into a pull request of its own (§5.1).

## 2. Threat model

| Asset                                       | Threat                                                                                                     | Main defense                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Consumers' pages                            | A runtime dependency (`lit`, `@lit/localize`) with a vulnerability, or replaced by a malicious version     | Dependabot (§5.1), dependency review and lockfile integrity (§5.2) |
| Consumers' pages                            | Library code that turns a property or attribute into markup, script, or a script URL                       | Code rules (§4), CodeQL (§6.1), CSP fixture (§4.3)                 |
| The published packages and the npm identity | A compromised development dependency that runs during install or build and alters `dist/` or reads a token | Install-script allowlist (§5.3), release provenance (§7)           |
| The published packages and the npm identity | A compromised GitHub Action, through a moved tag                                                           | The actions lockfile (§6.2)                                        |
| `GITHUB_TOKEN` and the repository           | Workflow injection from pull request data, or a token with more rights than its job needs                  | Workflow invariants (§6.2)                                         |
| The repository                              | A committed credential                                                                                     | Secret scanning with push protection (§6.3)                        |
| The workbench at dieselpunk.dev             | Third-party script or requests                                                                             | No other origin ([workbench.md §7](workbench.md))                  |

Out of scope: content the consumer puts in a component's light DOM (slotted markup is the consumer's, and is sanitized by the consumer if it comes from users); browser and platform vulnerabilities; denial of service through very large inputs.

## 3. Principles

- **Prevent by construction, then detect.** A rule that a lint or a test can enforce on every change is enforced there. Scanners catch what the rules did not anticipate. **Why:** a lint error names the line in the pull request that adds it; a scanner alert arrives later and is easier to dismiss.
- **Every check gates or reports, never both, never neither.** A gate fails a job. A report goes to GitHub code scanning. A check that only prints output nobody reads is removed.
- **No scheduled scans.** Every check runs on a pull request, a push to `main`, or a release. Code changes only through those, and a new advisory against a dependency arrives as a Dependabot pull request, which runs the same checks.
- **Every exception is written, reasoned, and used.** An exception names one thing (a package's install script, a CodeQL query filter) and says why it is safe. A gate fails on an exception without a reason or that matches nothing, as `check:size` fails on an entry without a reason ([performance.md](performance.md)).
- **The same command locally.** Each gate is a root script ([testing.md §9](testing.md)) that needs nothing but the npm registry, so a developer reproduces a failure without CI ([toolchain.md §8](toolchain.md)). Checks that need GitHub (CodeQL, dependency review, secret scanning) are the exception and say so.
- **Least privilege, pinned execution.** Anything that runs with a token is pinned to an immutable version and gets only the permissions its job uses.
- **Each gate is made to fail once** before it is trusted ([testing.md §7](testing.md)).

## 4. Rules for shipped code

These apply to `packages/core/src` and `packages/locales/src`, excluding tests.

### 4.1 No markup or script sinks

- Shipped code uses no `unsafeHTML`, `unsafeSVG`, `unsafeStatic`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `setHTMLUnsafe`, `document.write`, `eval`, `new Function`, or string arguments to `setTimeout` and `setInterval`. Markup is rendered only through Lit templates, which bind data as text or attributes.
- `unsafeCSS` takes only the library's own constants: token values, selectors, and custom property names written in the source. It is allowed only in `src/styles/` and `src/tokens/`, and never receives a value read from an attribute, property, or the page.
- **Enforced by** `no-eval`, `no-new-func`, `no-restricted-syntax`, `no-restricted-imports`, and `no-restricted-properties` in `eslint.config.js`, scoped to shipped source, so `lint` fails on a new sink.

### 4.2 URLs

- A property that renders into a URL attribute (the breadcrumb item's `href`) renders no link when its scheme is not `http:`, `https:`, `mailto:`, or relative: the item renders as text and warns once in development ([package-contract.md §6](package-contract.md)). The check is `safeUrl()` (`src/internal/safe-url.ts`), which parses the URL as the browser does, so whitespace and control characters cannot disguise a scheme, and treats a URL it cannot parse as unsafe. **Why:** Lit binds attributes without checking schemes, so a `javascript:` URL from user data would run in the consumer's origin when clicked. Native `<a>` has the same hole, but a component that builds the link is the place to close it, as frameworks do.
- `local/url-bindings` in `eslint.config.js` fails `lint` on a URL attribute (`href`, `src`, `srcset`, `action`, `formaction`, `xlink:href`, `poster`, `ping`, or the property of the same name) bound in an `html` or `svg` template other than through `safeUrl(…)`, the guard.

### 4.3 Content Security Policy and Trusted Types

- Core and locales run on a page served with this policy, strict for scripts:

  ```text
  default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline';
  img-src 'self' data:; object-src 'none'; base-uri 'none';
  require-trusted-types-for 'script'; trusted-types lit-html
  ```

  Their only script sink is Lit's, through its `lit-html` Trusted Types policy; they need no `unsafe-eval` and no inline scripts. Their styles are constructed stylesheets, which `style-src 'self'` allows.

- **Two relaxations, neither of which runs script.** `style-src-attr 'unsafe-inline'`: components pass computed values to their styles as custom properties in `style` attributes (`--_ratio` on a slider, progress bar, meter, or splitter; `--_level` on a tree item; `--_rows` on a textarea), and Lit's `styleMap` writes a `style` attribute on its first render. `img-src data:`: the date and time fields' icons and the panel texture are `data:` SVG images in the stylesheets. **Why** not move them out: custom properties set through the CSSOM instead would not be in server-rendered markup ([ssr.md §2](ssr.md)), and every component that sets one would grow; a `style` attribute or a `data:` image can change how a page looks, but cannot run anything.
- Server-rendered pages carry `<style>` elements in their declarative shadow roots, so they also need `style-src-elem 'unsafe-inline'`, or the hashes of those styles; with shared styles, `script-src` also needs the hash of the script they inline. [ssr.md §7](ssr.md) states the policy.
- **Enforced by** a consumer fixture (`test/package/csp/`, run by `check:consumer`) that serves the gallery under that policy, as a header, and fails on any `securitypolicyviolation` event or console error.

### 4.4 No network, storage, or messaging

Shipped code makes no requests and reads or writes no storage: no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, or `postMessage`. The locales package's dynamic `import()` loads only its own modules, by literal path. `no-restricted-globals` and `no-restricted-properties` enforce this in `lint`. **Why:** a component library has no reason to talk to anything, and the rule makes any future exception a reviewed lint change.

## 5. Dependencies

### 5.1 Known advisories

Dependabot owns them. Security updates are on, beside the weekly version updates ([toolchain.md §7](toolchain.md)): when an advisory affects a dependency, Dependabot opens a pull request, which CI checks like any other. The repository runs no audit of its own. **Why:** an audit in CI fails whichever pull request happens to run after an advisory is published, and a scheduled one duplicates Dependabot's alerts.

The packages held back from version updates (TypeScript, Playwright, `@types/node`, framework majors) are held back from security updates too, since Dependabot applies the same `ignore` rules. An advisory in one of them shows as a Dependabot alert with no pull request, and is fixed by hand within the times of §9.

### 5.2 Dependency changes

A pull request that changes the lockfile is a code change, and is checked as one:

- **Dependency review.** `actions/dependency-review-action` fails on an added or upgraded package, of any scope, with a high or critical advisory.
- **Runtime licenses.** `check:lockfile` fails when a published package's runtime tree (its dependencies and optional dependencies, and theirs, as resolved in the lockfile; not its peers) has a package whose license is not MIT, ISC, BSD-2-Clause, BSD-3-Clause, or Apache-2.0. Core takes no new runtime dependency without a change to [product.md §2](product.md) anyway; this makes the check automatic. **Why** not dependency review's license check: it covers every changed package, development tools included, which the rule does not.
- **`npm run check:lockfile`** (`scripts/check-lockfile.ts`) fails when a lockfile entry resolves from anywhere but `https://registry.npmjs.org/` or lacks an `integrity` hash, and when `npm audit signatures` reports an installed package with an invalid registry signature or provenance attestation. `npm ci` is the only install in CI, so the lockfile is what runs.

### 5.3 Install scripts

The lockfile marks every package that runs a lifecycle script on install (`hasInstallScript`). `check:lockfile` fails on any such package not listed in `.install-scripts.json`, each with a reason (`esbuild`: "installs its platform binary"), and on a listed package that no longer has one. **Why:** an install script runs with the developer's or the job's rights before any test does; a new one is a change to review, not a side effect of a version bump.

## 6. Scanning

### 6.1 Code

CodeQL analyzes `javascript-typescript` with the `security-extended` suite, and `actions` (the workflow files), on every pull request and every push to `main`, configured by `.github/codeql/codeql-config.yml`. Alerts appear in GitHub code scanning. On a pull request, `scripts/check-codeql.ts` reads the analysis's SARIF and fails the `security` job on any unsuppressed result whose security severity is 7.0 or more (high or critical). It counts every such result, not only new ones: the gate keeps `main` at none, so the two agree, and when a CodeQL update finds one in unchanged code, the next pull request fixes it or filters it with its reason. **Why** `main` too: code scanning finds a pull request's new alerts by comparing with the last analysis of its base branch. A dismissed alert carries the dismissal reason and a comment; a false positive that recurs gets a query filter in the CodeQL configuration, with the reason, instead of repeated dismissals.

### 6.2 Workflows

Every action a workflow runs is locked in `.github/workflows/actions.lock`, written by `gh actions-lock` ([github/gh-actions-lock](https://github.com/github/gh-actions-lock)). The lockfile pins each action, and each action it uses in turn, to a commit; the runner refuses an action whose tag no longer resolves to its locked commit. Workflows name outside actions by full version tag (`actions/checkout@v7.0.1`), and the repository's own actions as `$/.github/actions/…`, which is pinned to the workflow's own commit; a reusable workflow of this repository is called as `./.github/workflows/…`, which is pinned the same way. A Dependabot pull request that bumps an action's tag is re-locked with `gh actions-lock` before it merges. **Why** a lockfile rather than commit hashes in each `uses:`: transitive actions are pinned too, and a moved tag is caught before the action runs, not only after someone notices a hash.

`static` installs `gh actions-lock` at a pinned release and runs `gh actions-lock --verify`, which fails when a workflow uses an action the lockfile lacks or a locked tag has moved. `packages/testing/test/workflows.test.ts`, part of `test:node`, parses every workflow and composite action under `.github/` with the rules of `packages/testing/src/workflows.ts`, and fails when:

- a `uses:` of an action outside this repository is not a full `vX.Y.Z` tag, or a step's action inside it does not use `$/`;
- a workflow has no top-level `permissions:`, or its top-level permissions grant more than `contents: read` (and `actions: read` in `ci.yml`); a job that needs more asks for it in its own `permissions:`;
- a workflow triggers on `pull_request_target` or `workflow_run`;
- `actions/checkout` runs without `persist-credentials: false`, except in a job that pushes;
- a `run:` script contains an `${{ … }}` expression: values reach scripts through `env:`. **Why:** an expression is pasted into the script before the shell parses it, so a branch name or matrix value can become a command; an environment variable cannot.

CodeQL's `actions` analysis (§6.1) covers the data-flow cases the test cannot, such as untrusted input reaching a step through outputs.

### 6.3 Secrets

GitHub secret scanning and push protection are on: a push containing a recognized credential is refused. The repository holds no long-lived secrets: publishing uses OIDC ([package-contract.md §10](package-contract.md)), and every workflow uses the job's `GITHUB_TOKEN`.

## 7. Release provenance

`publish.yml`, beyond what [ci.md §8](ci.md) describes:

- runs in a GitHub environment, `npm`, that only release tags may deploy to, and npm's trusted publisher for each package names that workflow and environment, so no other workflow or branch can publish;
- fails unless the tagged commit was once the tip of `main`: it is in `main`'s first-parent history. `main`'s ruleset requires `ci-success` and forbids force pushes, so such a commit has passed CI, and the check needs no token. **Why** first-parent: a commit merged in from a branch is reachable from `main` without having been its tip, so CI may never have checked it as it stands;
- installs with `npm ci`, runs `check:lockfile`, builds, runs `check:package`, then publishes with provenance, which links each version to this workflow run and commit;
- before publishing, writes a CycloneDX SBOM of each package with `scripts/sbom.ts`, which packs it, resolves the tarball on its own as a consumer would install it, and runs `npm sbom` with its peers left out (those versions are the consumer's). A second job, the only one with `contents: write`, attaches the SBOMs to the GitHub release, so a consumer can see what each version depends on. **Why** not `npm sbom -w`: in a workspace it describes the repository root, with every private workspace in it.

## 8. When each check runs

| Check                                           | Pull request                                  | Push to `main`   | Release |
| ----------------------------------------------- | --------------------------------------------- | ---------------- | ------- |
| Code rules (§4.1, §4.2, §4.4), through `lint`   | Gate (`static`)                               | Gate             |         |
| Workflow invariants (§6.2), through `test:node` | Gate (`static`)                               | Gate             |         |
| `check:lockfile` (§5.2, §5.3)                   | Gate (`static`)                               | Gate             | Gate    |
| CSP fixture (§4.3), through `check:consumer`    | Gate (`integration`)                          | Gate             |         |
| Dependency review (§5.2)                        | Gate (`security`)                             |                  |         |
| CodeQL (§6.1)                                   | Gate on high or critical results (`security`) | Baseline         |         |
| Secret scanning and push protection (§6.3)      | Refuses the push                              | Refuses the push |         |
| Provenance checks (§7)                          |                                               |                  | Gate    |

Every check runs in `ci.yml` or `publish.yml`; there is no separate security workflow. The `security` job (dependency review on pull requests, CodeQL on both) is in `ci.yml`, and `ci-success` needs it, so branch protection still requires one check ([ci.md §1](ci.md)). It runs whenever `plan` runs everything, has a target of 4 minutes and a timeout of 15, and is the only job with `security-events: write`.

## 9. Response

| Finding                                                             | Response                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A gate fails on a pull request                                      | Fixed in that pull request, or an exception with its reason added there                                             |
| A Dependabot security pull request                                  | Merged once CI passes: within 7 days for critical or high, by the next release otherwise                            |
| A Dependabot alert with no pull request (a held-back package, §5.1) | Upgraded by hand in the same times                                                                                  |
| A vulnerability in a published version                              | Fixed and released as a patch within 7 days, with a GitHub security advisory, and a CVE when consumers are affected |

`SECURITY.md` says how to report a vulnerability: GitHub private vulnerability reporting, which is on, and never a public issue. It names the supported versions: the latest minor release while the packages are `0.x`.

## Verification

- `lint` fails on each sink of §4.1 and §4.4 and an unguarded URL binding of §4.2. `packages/testing/test/security-lint.test.ts` lints a sample of each through the real configuration, as shipped source (it must fail), as a test (it must pass), and as styles (only `unsafeCSS` passes).
- `test/safe-url.test.ts` covers the schemes `safeUrl()` keeps and drops, including disguised and unparseable ones. The breadcrumb item's browser tests cover the guard in place: an unsafe `href` renders text and warns once per occurrence; `http:`, `https:`, `mailto:`, and relative URLs render links.
- `check:consumer` serves the gallery, built against the packed package, with the policy of §4.3 as a header. It fails on a violation, on anything logged, on an undefined tag, or if a probe write to an HTML sink is not blocked, which would mean the policy is not in force. With `style-src-attr` or `require-trusted-types-for` removed from the policy, it fails.
- `packages/testing/test/lockfile.test.ts` covers §5.2 and §5.3 on recorded lockfiles: registry and integrity checks; the install-script list, including an unlisted script, an entry without a reason, and one that matches nothing; and runtime licenses, direct, nested, and optional, ignoring development and peer dependencies. It also checks the repository's own lockfile. Removing a package from `.install-scripts.json` fails `check:lockfile`.
- `packages/testing/test/sarif.test.ts` covers which CodeQL results fail a pull request: high and critical ones, found by rule id or index, and not medium, unscored, or suppressed ones. `check-codeql.ts` fails on a recorded critical result and passes a medium one.
- `packages/testing/test/workflows.test.ts` covers each rule of §6.2 on broken examples, then checks every workflow and composite action in the repository. With an expression put back into a `run:` script, it fails.
- Each of these gates has been made to fail once against a deliberately broken input ([testing.md §7](testing.md)).
- Not checked by any gate: the policy for server-rendered pages ([ssr.md §7](ssr.md)), whose fixture drives its pages with inline scripts; and the repository settings (secret scanning, push protection, private vulnerability reporting, Dependabot security updates, the `npm` environment's rules, `main`'s ruleset) and npm's trusted publisher configuration, which need administrator access that a workflow token does not have, and are checked by hand before each release.

## Gaps

None.
