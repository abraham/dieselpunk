import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkWorkflow } from '../src/workflows.ts';

// specs/security.md §6.2.

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const readOnly = { contents: 'read' } as const;

const workflow = (body: string) => `
name: Example
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
${body}`;

const job = (steps: string) => `
  build:
    runs-on: ubuntu-latest
    steps:
${steps}`;

const check = (text: string, file = '.github/workflows/example.yml') =>
  checkWorkflow(file, text, readOnly);

describe('checkWorkflow', () => {
  it('passes a workflow that keeps every rule', () => {
    const text = workflow(
      job(`
      - uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false
      - uses: $/.github/actions/setup
      - run: npm test -- --shard="$PART"
        env:
          PART: \${{ matrix.part }}`),
    );
    assert.deepEqual(check(text), []);
  });

  it('fails an outside action not named by a full version tag', () => {
    for (const ref of ['v7', 'v7.0', 'main', '3d3c42e5aac5ba805825da76410c181273ba90b1']) {
      const text = workflow(job(`      - uses: actions/setup-node@${ref}`));
      assert.deepEqual(
        check(text),
        [
          `.github/workflows/example.yml job build step 1 uses actions/setup-node@${ref}, not by a full vX.Y.Z tag`,
        ],
        ref,
      );
    }
  });

  it('fails a local action named as ./ instead of $/', () => {
    const text = workflow(job('      - uses: ./.github/actions/setup'));
    assert.match(check(text)[0] ?? '', /a local action is named as \$\//);
  });

  it('passes a local reusable workflow, and fails an outside one without a full tag', () => {
    const local = workflow('  visual:\n    uses: ./.github/workflows/visual.yml\n');
    assert.deepEqual(check(local), []);
    const outside = workflow(
      '  visual:\n    uses: someone/workflows/.github/workflows/x.yml@main\n',
    );
    assert.match(check(outside)[0] ?? '', /not by a full vX.Y.Z tag/);
  });

  it('fails missing, broad, or unlisted top-level permissions', () => {
    const steps = job('      - run: npm test');
    const without = workflow(steps).replace('permissions:\n  contents: read\n', '');
    assert.deepEqual(check(without), [
      '.github/workflows/example.yml has no top-level permissions',
    ]);
    const all = workflow(steps).replace('permissions:\n  contents: read', 'permissions: write-all');
    assert.match(check(all)[0] ?? '', /grants "write-all"/);
    const write = workflow(steps).replace('contents: read', 'contents: write');
    assert.match(check(write)[0] ?? '', /grants contents: write/);
    const actions = workflow(steps).replace('contents: read', 'contents: read\n  actions: read');
    assert.match(check(actions)[0] ?? '', /grants actions: read/);
    assert.deepEqual(checkWorkflow('ci.yml', actions, { contents: 'read', actions: 'read' }), []);
  });

  it('fails pull_request_target and workflow_run, in any form of on:', () => {
    const steps = job('      - run: npm test');
    for (const on of [
      'on: pull_request_target',
      'on: [push, workflow_run]',
      'on:\n  pull_request_target:\n    types: [opened]',
    ]) {
      const text = workflow(steps).replace(/on:\n {2}push:\n {4}branches: \[main\]/, on);
      assert.equal(check(text).length, 1, on);
      assert.match(check(text)[0] ?? '', /runs on (pull_request_target|workflow_run)/, on);
    }
  });

  it('fails a checkout that keeps its credentials', () => {
    for (const options of ['', '\n        with:\n          fetch-depth: 0']) {
      const text = workflow(job(`      - uses: actions/checkout@v7.0.1${options}`));
      assert.match(check(text)[0] ?? '', /without persist-credentials: false/, options);
    }
  });

  it('fails an expression in a script, in a workflow or a composite action', () => {
    const text = workflow(job('      - run: npm test -- --shard=${{ matrix.part }}'));
    assert.match(check(text)[0] ?? '', /puts an expression in its script/);
    const composite = `
name: Setup
runs:
  using: composite
  steps:
    - run: echo \${{ inputs.browsers }}
      shell: bash
`;
    assert.deepEqual(checkWorkflow('.github/actions/setup/action.yml', composite, readOnly), [
      '.github/actions/setup/action.yml step 1 puts an expression in its script; pass it through env',
    ]);
  });
});

describe("the repository's workflows and actions", () => {
  const files = [
    ...readdirSync(`${repo}.github/workflows`)
      .filter((file) => /\.ya?ml$/.test(file))
      .map((file) => `.github/workflows/${file}`),
    ...readdirSync(`${repo}.github/actions`).map((name) => `.github/actions/${name}/action.yml`),
  ];

  for (const file of files) {
    it(`${file} keeps every rule`, () => {
      // The plan reads the last run's job durations for its budget summary (specs/ci.md §9).
      const allowed = file.endsWith('/ci.yml') ? { contents: 'read', actions: 'read' } : readOnly;
      const text = readFileSync(`${repo}${file}`, 'utf8');
      assert.deepEqual(checkWorkflow(file, text, allowed as Record<string, 'read'>), []);
    });
  }
});
