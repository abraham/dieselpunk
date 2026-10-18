# Security policy

## Supported versions

`@dieselpunk/core` and `@dieselpunk/locales` release together. While they are `0.x`, only the latest minor release is supported: security fixes ship as a patch to it, and earlier minors get none.

## Reporting a vulnerability

Report it privately through [GitHub's private vulnerability reporting](https://github.com/abraham/dieselpunk/security/advisories/new). Do not open a public issue, pull request, or discussion about it.

Include what you can of:

- the package, version, and component affected;
- the steps or markup that reproduce it, and in which browser;
- what an attacker gains, such as script running in the consumer's page.

A confirmed vulnerability in a published version is fixed and released as a patch within 7 days, with a GitHub security advisory, and a CVE when consumers are affected. You are credited in the advisory unless you ask not to be.

## Scope

In scope:

- the published packages, including the Content Security Policy and Trusted Types support they promise ([specs/security.md §4](specs/security.md));
- the release path: the workflows that build and publish, and the packages' npm provenance;
- the workbench at [dieselpunk.dev](https://dieselpunk.dev).

Out of scope:

- markup an application places in a component's light DOM: slotted content is the application's, and so is sanitizing it when it comes from users;
- vulnerabilities in browsers or in Lit itself, which go to those projects;
- denial of service through very large inputs.

## Verifying a release

Each version is published from this repository's `publish.yml` with npm provenance, which links it to the workflow run and commit that built it. Check an installed copy with `npm audit signatures`.
