# Security

**Scope:** what keeps the published packages, the release path, and the pages that use them safe, and the automated audits and scanners that enforce it: the threat model, rules for shipped code, dependency and supply-chain checks, code and workflow scanning, when each check runs, and how findings are handled.
**Code:** `eslint.config.js`, `scripts/check-audit.ts`, `.audit-exemptions.json`, `packages/testing/test/workflows.test.ts`, `packages/core/test/package/csp/`, `.github/workflows/ci.yml` (the `security` job), `.github/workflows/security.yml`, `.github/workflows/publish.yml`, `.github/dependabot.yml`, `SECURITY.md`.

## 1. Goals

1. **Nothing known ships.** No published version has a known advisory in its runtime dependency tree, and no high or critical code-scanning alert, at the time it is published.
2. **What is on npm is what CI built.** A package version can only come from a reviewed commit on `main` that passed `ci-success`, built by `publish.yml`, with provenance that says so.
3. **No injection sinks in consumers' pages.** The library adds no way for data to become markup or script, and works on a page with a strict Content Security Policy and Trusted Types.
4. **Automated, with a person only for judgment.** Every check runs without anyone starting it. A person decides only whether a finding is fixed now, later, or exempted, and writes down why.
5. **Quiet enough to be read.** A check that fails a pull request fails for something the pull request can fix. Findings outside its reach go to a scheduled run, not to every pull request.

## 2. Threat model

| Asset                                       | Threat                                                                                                     | Main defense                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Consumers' pages                            | A runtime dependency (`lit`, `@lit/localize`) with a vulnerability, or replaced by a malicious version     | Runtime audit (§5.1), lockfile integrity (§5.2)    |
| Consumers' pages                            | Library code that turns a property or attribute into markup, script, or a script URL                       | Code rules (§4), CodeQL (§6.1), CSP fixture (§4.3) |
| The published packages and the npm identity | A compromised development dependency that runs during install or build and alters `dist/` or reads a token | Install-script allowlist (§5.3), release path (§7) |
| The published packages and the npm identity | A compromised GitHub Action, through a moved tag                                                           | Actions pinned to commits (§6.2)                   |
| `GITHUB_TOKEN` and the repository           | Workflow injection from pull request data, or a token with more rights than its job needs                  | Workflow invariants (§6.2)                         |
| The repository                              | A committed credential                                                                                     | Secret scanning with push protection (§6.3)        |
| The workbench at dieselpunk.dev             | Third-party script or requests                                                                             | No other origin ([workbench.md §7](workbench.md))  |

Out of scope: content the consumer puts in a component's light DOM (slotted markup is the consumer's, and is sanitized by the consumer if it comes from users); browser and platform vulnerabilities; denial of service through very large inputs.

## 3. Principles

- **Prevent by construction, then detect.** A rule that a lint or a test can enforce on every change is enforced there. Scanners catch what the rules did not anticipate. **Why:** a lint error names the line in the pull request that adds it; a scanner alert arrives later and is easier to dismiss.
- **Every check gates or reports, never both, never neither.** A gate fails a job. A report goes to GitHub code scanning or a scheduled run's failure. A check that only prints output nobody reads is removed.
- **Every exemption is written, reasoned, used, and dated.** An exemption names one finding, says why it does not apply, and expires. A gate fails on an expired or unused exemption, as `check:size` fails on an entry without a reason ([performance.md](performance.md)).
- **The same command locally.** Each gate is a root script ([testing.md §9](testing.md)) that needs nothing but the npm registry, so a developer reproduces a failure without CI ([toolchain.md §8](toolchain.md)). Checks that need GitHub (CodeQL, dependency review, secret scanning) are the exception and say so.
- **Least privilege, pinned execution.** Anything that runs with a token is pinned to an immutable version and gets only the permissions its job uses.
- **Each gate is made to fail once** before it is trusted ([testing.md §7](testing.md)).

## 4. Rules for shipped code

These apply to `packages/core/src` and `packages/locales/src`, excluding tests.

### 4.1 No markup or script sinks

- Shipped code uses no `unsafeHTML`, `unsafeSVG`, `unsafeStatic`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `setHTMLUnsafe`, `document.write`, `eval`, `new Function`, or string arguments to `setTimeout` and `setInterval`. Markup is rendered only through Lit templates, which bind data as text or attributes.
- `unsafeCSS` takes only the library's own constants: token values, selectors, and custom property names written in the source. It is allowed only in `src/styles/` and `src/tokens/`, and never receives a value read from an attribute, property, or the page.
- **Enforced by** `no-restricted-syntax`, `no-restricted-imports`, and `no-restricted-properties` rules in `eslint.config.js`, scoped to shipped source, so `lint` fails on a new sink.

### 4.2 URLs

- A property that renders into a URL attribute (the breadcrumb item's `href`) renders no link when its scheme is not `http:`, `https:`, `mailto:`, or relative: the item renders as text and warns once in development ([package-contract.md §6](package-contract.md)). **Why:** Lit binds attributes without checking schemes, so a `javascript:` URL from user data would run in the consumer's origin when clicked. Native `<a>` has the same hole, but a component that builds the link is the place to close it, as frameworks do.
- A new URL attribute in shipped code is added to the list that `lint` checks: a `href=${…}` or `src=${…}` binding not passed through the guard fails `lint`.

### 4.3 Content Security Policy and Trusted Types

- Core and locales run on a page served with `default-src 'self'; script-src 'self'; style-src 'self'; require-trusted-types-for 'script'; trusted-types lit-html`. They inject no inline scripts or `style` attributes from untrusted data, and their styles are constructed stylesheets, which `style-src 'self'` allows.
- Server-rendered pages carry `<style>` elements in their declarative shadow roots, so they need `style-src` to allow them; [ssr.md §7](ssr.md) states the policy a server-rendering application sets.
- **Enforced by** a consumer fixture (`test/package/csp/`, run by `check:consumer`) that serves the gallery under that policy and fails on any `securitypolicyviolation` event or console error.

### 4.4 No network, storage, or messaging

Shipped code makes no requests and reads or writes no storage: no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, or `postMessage`. The locales package's dynamic `import()` loads only its own modules, by literal path. `no-restricted-globals` and `no-restricted-properties` enforce this in `lint`. **Why:** a component library has no reason to talk to anything, and the rule makes any future exception a reviewed lint change.

## 5. Dependencies

### 5.1 Advisories

`npm run check:audit` (`scripts/check-audit.ts`) reads `npm audit --json` and fails on:

- **any** advisory, of any severity, in the runtime tree of a published package (`npm audit --omit=dev`, which covers `lit`, `@lit/localize`, and what they depend on);
- a **high or critical** advisory in a development dependency;
- an exemption in `.audit-exemptions.json` that has expired, matches no current advisory, or lacks a reason.

An exemption is an advisory id (`GHSA-…`), the package, the reason the vulnerable code is not reached (for example "only the dev server, which CI does not expose"), and an expiry at most 90 days out. Runtime advisories cannot be exempted. **Why:** moderate and low advisories in build tools are usually unreachable from this repository's use and are fixed by the weekly Dependabot pull requests; failing every pull request on them would teach people to ignore the gate.

### 5.2 Integrity and provenance

`check:audit` also fails when:

- a lockfile entry resolves from anywhere but `https://registry.npmjs.org/`, or lacks an `integrity` hash;
- `npm audit signatures` reports an installed package with an invalid registry signature or provenance attestation.

`npm ci` is the only install in CI, so the lockfile is what runs.

### 5.3 Install scripts

The lockfile marks every package that runs a lifecycle script on install (`hasInstallScript`). `check:audit` fails on any such package not listed in `.audit-exemptions.json` under `installScripts`, each with a reason (`esbuild`: "installs its platform binary"). **Why:** an install script runs with the developer's or the job's rights before any test does; a new one is a change to review, not a side effect of a version bump.

### 5.4 Updates and new dependencies

- **Dependabot security updates** are on, beside the weekly version updates ([toolchain.md §7](toolchain.md)). The packages held back from version updates (TypeScript, Playwright, `@types/node`, framework majors) are held back from security updates too, since Dependabot applies the same `ignore` rules; an advisory in one of them is fixed by hand within the times of §9.
- **Dependency review.** On each pull request, `actions/dependency-review-action` fails on an added or upgraded package with a high or critical advisory, and on a new runtime dependency of a published package whose license is not MIT, ISC, BSD-2-Clause, BSD-3-Clause, or Apache-2.0. Core takes no new runtime dependency without a change to [product.md §2](product.md) anyway; this makes the check automatic.

## 6. Scanning

### 6.1 Code

CodeQL analyzes `javascript-typescript` with the `security-extended` suite, and `actions` (the workflow files), on every pull request, on every push to `main`, and weekly. Alerts appear in GitHub code scanning. A pull request that adds a high or critical alert fails its `security` job (§8). A dismissed alert carries the dismissal reason and a comment; a false positive that recurs gets a query filter in the CodeQL configuration, with the reason, instead of repeated dismissals.

### 6.2 Workflows

`packages/testing/test/workflows.test.ts`, part of `test:node`, reads every file under `.github/` and fails when:

- a `uses:` of an action outside this repository is not pinned to a full 40-character commit SHA followed by a `# v<version>` comment (Dependabot updates both);
- a workflow has no top-level `permissions:`, or its top-level permissions grant more than `contents: read` (and `actions: read` in `ci.yml`); a job that needs more asks for it in its own `permissions:`;
- a workflow triggers on `pull_request_target` or `workflow_run`;
- `actions/checkout` runs without `persist-credentials: false`, except in a job that pushes;
- a `run:` script contains an `${{ … }}` expression: values reach scripts through `env:`. **Why:** an expression is pasted into the script before the shell parses it, so a branch name or matrix value can become a command; an environment variable cannot.

CodeQL's `actions` analysis (§6.1) covers the data-flow cases the test cannot, such as untrusted input reaching a step through outputs.

### 6.3 Secrets

GitHub secret scanning and push protection are on: a push containing a recognized credential is refused, and any credential found in history is an alert. The repository holds no long-lived secrets: publishing uses OIDC ([package-contract.md §10](package-contract.md)), and every workflow uses the job's `GITHUB_TOKEN`.

### 6.4 Posture

OpenSSF Scorecard runs weekly and on pushes to `main`, and publishes its results to code scanning. It is a report: a dropped check is read at the next triage (§9), not a gate. **Why:** its checks overlap the gates above, and several (code review counts, maintainers) measure the project's process, not a change.

## 7. Release path

`publish.yml`, beyond what [ci.md §8](ci.md) describes:

- runs in a GitHub environment, `npm`, that only release tags may deploy to, and npm's trusted publisher for each package names that workflow and environment, so no other workflow or branch can publish;
- fails unless the tagged commit is on `main` and its `ci-success` check passed, read through the checks API with the job's token;
- installs with `npm ci`, runs `check:audit`, builds, runs `check:package`, then publishes with provenance;
- generates a CycloneDX SBOM for each package (`npm sbom --sbom-format cyclonedx --omit dev`) and attaches it to the GitHub release.

## 8. When each check runs

| Check                                           | Pull request                                       | Push to `main`   | Weekly | Release |
| ----------------------------------------------- | -------------------------------------------------- | ---------------- | ------ | ------- |
| Code rules (§4.1, §4.2, §4.4), through `lint`   | Gate (`static`)                                    | Gate             |        |         |
| `check:audit` (§5.1–§5.3)                       | Gate (`static`)                                    | Gate             | Gate   | Gate    |
| Workflow invariants (§6.2), through `test:node` | Gate (`static`)                                    | Gate             |        |         |
| CSP fixture (§4.3), through `check:consumer`    | Gate (`integration`)                               | Gate             |        |         |
| Dependency review (§5.4)                        | Gate (`security`)                                  |                  |        |         |
| CodeQL (§6.1)                                   | Gate on new alerts (`security`)                    | Report           | Report |         |
| Secret scanning and push protection (§6.3)      | Refuses the push                                   | Refuses the push |        |         |
| Scorecard (§6.4)                                |                                                    | Report           | Report |         |
| Dependabot security updates (§5.4)              | Opens a pull request when an advisory is published |                  |        |         |

- The pull request checks live in `ci.yml`: the existing `static` and `integration` jobs, and a `security` job (dependency review and CodeQL) that `ci-success` needs, so branch protection still requires one check ([ci.md §1](ci.md)). It runs whenever `plan` runs everything, and has a target of 4 minutes and a timeout of 15. It is the only job with `security-events: write`.
- The weekly and `main` runs live in `security.yml` (`schedule`, `push` to `main`, `workflow_dispatch`): `check:audit` on `main`, CodeQL, and Scorecard. A failed scheduled run is the alert: it notifies the owner and is not re-run until the cause is fixed or exempted. **Why:** advisories are published against code that has not changed, so only a scheduled run finds them between pull requests.

## 9. Triage and response

| Finding                                                | Response                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Critical or high, reachable from a published package   | Fix and publish a patch release within 7 days; a GitHub security advisory, with a CVE, when a published version is affected |
| Moderate or low, in a published package's runtime tree | Fix in the next release                                                                                                     |
| High or critical, development only                     | Fix within 14 days, or exempt with a reason and expiry (§5.1)                                                               |
| Moderate or low, development only                      | The weekly Dependabot pull request                                                                                          |
| Code scanning alert                                    | Fix in the pull request that adds it; an existing one by its severity, as above                                             |

- `SECURITY.md` says how to report a vulnerability: GitHub private vulnerability reporting, which is on, and never a public issue. It names the supported versions: the latest minor release while the packages are `0.x`.
- Triage happens weekly, after the scheduled run: open code scanning alerts, Dependabot alerts, exemptions expiring within 14 days, and the Scorecard result.

## Verification

- `lint` fails on each sink of §4.1 and §4.4 and an unguarded URL binding of §4.2; ESLint `RuleTester` cases show each rule catches its pattern in shipped source and ignores tests.
- The breadcrumb item's browser tests cover the URL guard: a `javascript:` `href` renders text and warns; `https:` and relative URLs render links.
- `check:consumer` serves the gallery under the policy of §4.3 and fails on a violation.
- `scripts/check-audit.test.ts` covers the decisions of §5.1–§5.3 on recorded `npm audit` output and lockfiles: runtime versus development severity, exemption expiry and use, registry and integrity checks, and the install-script allowlist.
- `packages/testing/test/workflows.test.ts` covers §6.2.
- Each of these gates has been made to fail once against a deliberately broken input ([testing.md §7](testing.md)).
- Not checked by any gate: the repository settings (secret scanning, push protection, private vulnerability reporting, Dependabot security updates, the `npm` environment's rules) and npm's trusted publisher configuration. They need administrator access that a workflow token does not have, and are checked by hand before each release.

## Gaps

Most of this spec is not built yet. What exists: Dependabot version updates, trusted publishing with provenance, read-only top-level permissions in `ci.yml`, `docs.yml`, and `publish.yml`, and no long-lived secrets.

- **No security lint rules** (§4.1, §4.2, §4.4). The shipped source has no sinks today except `unsafeCSS` with constants and the unguarded breadcrumb `href`, so adding the rules should need no code change beyond the guard.
- **The breadcrumb `href` is not guarded** (§4.2). Closing it is the guard, its development warning and message string, and its tests.
- **No CSP fixture** (§4.3), and [ssr.md §7](ssr.md) does not yet state the policy for server-rendered pages.
- **No `check:audit`** (§5) and no `.audit-exemptions.json`. Closing it adds the script, its Node tests, the root script, the row in [testing.md §9](testing.md), and the step in `static`, `security.yml`, and `publish.yml`.
- **No dependency review or CodeQL** (§5.4, §6.1): no `security` job and no `security.yml`.
- **Workflows do not meet §6.2.** Actions are pinned to major tags, `actions/checkout` keeps its credentials, `visual.yml` and `update-visual-baselines.yml` have no top-level `permissions:`, and `ci.yml` puts `${{ matrix.part }}` in a `run:` script. Closing it is the test, then fixing what it reports.
- **No Scorecard** (§6.4).
- **The release path lacks §7:** no `npm` environment, no check that the tagged commit passed `ci-success`, no audit step, and no SBOM.
- **No `SECURITY.md`**, and the repository settings of §6.3 and §9 are unverified.
