import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  budgetReport,
  countTests,
  grepFor,
  onlyProse,
  parseSelection,
  planSmoke,
  planVisual,
} from '../../../scripts/ci-matrix.ts';
import type { Budget, Count } from '../../../scripts/ci-matrix.ts';
import { themeNames } from '../src/tokens/themes.ts';
import { groupNames } from './browser/fixtures/groups.ts';

test('a change of specs, Markdown, or the Dependabot settings is prose only', () => {
  assert.ok(onlyProse(['specs/ci.md', 'README.md', 'packages/core/README.md']));
  assert.ok(onlyProse(['.github/dependabot.yml']));
  assert.ok(!onlyProse(['specs/ci.md', 'scripts/ci-matrix.ts']));
  assert.ok(!onlyProse(['apps/storybook/src/stories/guide.md']));
  assert.ok(!onlyProse(['.github/workflows/ci.yml']));
  assert.ok(!onlyProse([]));
});

test('the budget report lists the slowest jobs against their targets', () => {
  const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();
  const report = budgetReport(
    [
      { name: 'static', started_at: at(0), completed_at: at(90) },
      { name: 'visual / chromium · shell', started_at: at(0), completed_at: at(300) },
      { name: 'ci-success', started_at: at(0), completed_at: at(5) },
      { name: 'smoke (1/1)', started_at: null, completed_at: null },
    ],
    2,
  );
  assert.deepEqual(report.split('\n').slice(2), [
    '| visual / chromium · shell | 5m 00s | 4m | 125% (over) |',
    '| static | 1m 30s | 2m | 75% |',
  ]);
});

// The packing of the visual jobs (specs/ci.md §6). Theme names are made up except where the plan
// checks them against the token source.

const budget: Budget = {
  cap: 100,
  weights: { chromium: 1, firefox: 2 },
  jobPerGroup: new Set(['chromium']),
};

const count = (project: string, group: string, theme: string, tests: number): Count => ({
  project,
  group,
  theme,
  tests,
});

// Playwright matches --grep against the title path and the tags, joined by spaces.
const line = (group: string, theme: string) =>
  `matrix.spec.ts a test @group:${group} @theme:${theme}`;

test('Chromium runs one job per group, and the other projects pack whole groups', () => {
  const jobs = planVisual(
    [
      count('chromium', 'foundation', 'steel', 40),
      count('chromium', 'inventory', 'steel', 30),
      count('firefox', 'foundation', 'steel', 20),
      count('firefox', 'inventory', 'steel', 20),
      count('firefox', 'shell', 'steel', 30),
    ],
    budget,
  );
  // Largest first: shell, then foundation fills that job to the cap, and inventory starts another.
  assert.deepEqual(
    jobs.map((job) => job.name),
    [
      'chromium · foundation',
      'chromium · inventory',
      'firefox · foundation, shell',
      'firefox · inventory',
    ],
  );
});

test('a project that fits one job runs every group there', () => {
  const jobs = planVisual(
    [count('firefox', 'foundation', 'steel', 10), count('firefox', 'shell', 'steel', 10)],
    budget,
  );
  assert.deepEqual(
    jobs.map(({ id, name }) => [id, name]),
    [['firefox-all', 'firefox · all groups']],
  );
});

test('a group over the cap is split by theme', () => {
  const jobs = planVisual(
    [count('chromium', 'overlays', 'steel', 60), count('chromium', 'overlays', 'steel-light', 60)],
    budget,
  );
  assert.deepEqual(
    jobs.map(({ id, name }) => [id, name]),
    [
      ['chromium-overlays-steel', 'chromium · overlays · steel'],
      ['chromium-overlays-steel-light', 'chromium · overlays · steel-light'],
    ],
  );
});

test('a group and theme over the cap fails the plan', () => {
  assert.throws(
    () => planVisual([count('chromium', 'overlays', 'steel', 101)], budget),
    /chromium · overlays · steel costs 101, over the cap of 100/,
  );
});

test('a project with no weight fails the plan', () => {
  assert.throws(
    () => planVisual([count('webkit', 'shell', 'steel', 1)], budget),
    /No weight for the visual project "webkit"/,
  );
});

test('a selection plans only its groups and themes, and each job greps its themes', () => {
  const jobs = planVisual(
    [
      count('chromium', 'shell', 'steel', 10),
      count('chromium', 'shell', 'steel-light', 10),
      count('chromium', 'shell', 'brass', 10),
      count('chromium', 'forms', 'steel', 10),
      count('firefox', 'shell', 'brass', 10),
    ],
    budget,
    { groups: ['shell'], themes: ['steel', 'steel-light'] },
  );
  assert.deepEqual(
    jobs.map(({ id, name }) => [id, name]),
    [['chromium-shell-steel-steel-light', 'chromium · shell · steel, steel-light']],
  );
  const grep = new RegExp(jobs[0]!.grep);
  assert.ok(grep.test(line('shell', 'steel-light')));
  assert.ok(!grep.test(line('shell', 'brass')));
  assert.ok(!grep.test(line('forms', 'steel')));
});

test('a selection that matches no test fails the plan', () => {
  assert.throws(
    () => planVisual([count('chromium', 'shell', 'steel', 1)], budget, { themes: ['brass'] }),
    /No visual tests match/,
  );
});

test('a selection is read from a list, and unknown names fail', () => {
  assert.deepEqual(parseSelection('', ''), {});
  assert.deepEqual(parseSelection(`${groupNames[0]}, ${groupNames[1]}`, ` ${themeNames[0]} `), {
    groups: [groupNames[0], groupNames[1]],
    themes: [themeNames[0]],
  });
  assert.throws(() => parseSelection('attic'), /Unknown group: attic/);
  assert.throws(() => parseSelection('', 'sepia'), /Unknown theme: sepia/);
});

test('a grep selects its groups and no others', () => {
  const grep = new RegExp(grepFor([{ group: 'shell' }, { group: 'forms' }]));
  assert.ok(grep.test(line('shell', 'industrial')));
  assert.ok(grep.test(line('forms', 'high-contrast')));
  assert.ok(!grep.test(line('foundation', 'industrial')));
  assert.ok(!grep.test(line('shells', 'industrial')));
});

test('a grep by theme does not match a theme whose name starts with it', () => {
  const grep = new RegExp(grepFor([{ group: 'overlays', themes: ['steel'] }, { group: 'forms' }]));
  assert.ok(grep.test(line('overlays', 'steel')));
  assert.ok(!grep.test(line('overlays', 'steel-light')));
  assert.ok(!grep.test(line('shell', 'steel')));
  assert.ok(grep.test(line('forms', 'steel-light')));
});

const report = (tags: string[]) => ({
  suites: [
    {
      title: 'matrix.spec.ts',
      specs: [{ title: 'a test', tags, tests: [{ projectName: 'chromium' }] }],
    },
  ],
});
const [group = ''] = groupNames;
const [theme = ''] = themeNames;

test('tests are counted by project, group, and theme', () => {
  assert.deepEqual(countTests(report([`@group:${group}`, `@theme:${theme}`, '@forced'])), [
    count('chromium', group, theme, 1),
  ]);
});

test('a test without exactly one known group and theme fails the plan', () => {
  assert.throws(() => countTests(report([`@theme:${theme}`])), /needs one group tag and one theme/);
  assert.throws(
    () => countTests(report(['@group:attic', `@theme:${theme}`])),
    /unknown group "attic"/,
  );
  assert.throws(
    () => countTests(report([`@group:${group}`, '@theme:sepia'])),
    /unknown theme "sepia"/,
  );
});

test('the smoke test gets a part for each full set of entries', () => {
  const parts = (entries: number) => planSmoke(entries, 100).map((job) => job.part);
  assert.deepEqual(parts(0), ['1/1']);
  assert.deepEqual(parts(100), ['1/1']);
  assert.deepEqual(parts(101), ['1/2', '2/2']);
  assert.deepEqual(parts(250), ['1/3', '2/3', '3/3']);
});
