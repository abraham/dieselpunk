import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeNames } from '../packages/core/src/tokens/themes.ts';
import { groupNames } from '../packages/core/test/browser/fixtures/groups.ts';
import { groupTag, themeTag } from '../packages/core/test/visual/tags.ts';

// Writes the CI matrices as outputs of the `plan` job (specs/ci.md §6).

/** The number of visual tests of one project that render one group in one theme. */
export interface Count {
  project: string;
  group: string;
  theme: string;
  tests: number;
}

/** One visual job: a project and the tests its `--grep` selects. */
export interface VisualJob {
  id: string;
  name: string;
  project: string;
  grep: string;
}

export interface Budget {
  /** The most a job may cost, in Chromium tests. */
  cap: number;
  /** What one test costs in each project, relative to Chromium. */
  weights: Record<string, number>;
  /** Projects that run one job per group, instead of packing groups together. */
  jobPerGroup: ReadonlySet<string>;
}

// Chromium renders a test in about 1.4 worker-seconds, 0.35s at 4 workers. 400 is about 2.5 minutes,
// which leaves room for the container and `npm ci` in the 4-minute target (specs/ci.md §9).
// Firefox and WebKit take about twice as long per test.
export const visualBudget: Budget = {
  cap: 400,
  weights: { chromium: 1, 'chromium-forced': 1, firefox: 2, webkit: 2 },
  jobPerGroup: new Set(['chromium']),
};

interface Unit {
  group: string;
  themes?: readonly string[];
  cost: number;
}

/** The groups and themes to render; all of either when absent. */
export interface Selection {
  groups?: readonly string[];
  themes?: readonly string[];
}

interface ReportSuite {
  title: string;
  specs?: Array<{ title: string; tags: string[]; tests: Array<{ projectName: string }> }>;
  suites?: ReportSuite[];
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A tag ends at a space or the end, so `@theme:industrial` does not match `@theme:industrial-light`.
const oneOf = (prefix: string, names: readonly string[]) =>
  `${escape(prefix)}(?:${names.map(escape).join('|')})(?=\\s|$)`;

/** A `--grep` that selects exactly the tests of these units. */
export function grepFor(
  units: ReadonlyArray<{ group: string; themes?: readonly string[] | undefined }>,
): string {
  if (units.every((unit) => !unit.themes)) {
    return oneOf(
      groupTag(''),
      units.map((unit) => unit.group),
    );
  }
  const alternatives = units.map(
    ({ group, themes }) =>
      `(?=.*${oneOf(groupTag(''), [group])})` +
      (themes ? `(?=.*${oneOf(themeTag(''), themes)})` : ''),
  );
  return `^(?:${alternatives.join('|')})`;
}

/** Reads comma- or space-separated group and theme names, and rejects unknown ones. */
export function parseSelection(groups = '', themes = ''): Selection {
  const list = (text: string, known: readonly string[], kind: string) => {
    const names = text.split(/[\s,]+/).filter(Boolean);
    const unknown = names.filter((name) => !known.includes(name));
    if (unknown.length > 0) {
      throw new Error(`Unknown ${kind}: ${unknown.join(', ')}. Known: ${known.join(', ')}.`);
    }
    return names.length > 0 ? names : undefined;
  };
  const selection: Selection = {};
  const g = list(groups, groupNames, 'group');
  const t = list(themes, themeNames, 'theme');
  if (g) selection.groups = g;
  if (t) selection.themes = t;
  return selection;
}

/** Counts the tests of a `playwright test --list --reporter=json` report by project, group, and theme. */
export function countTests(report: { suites: ReportSuite[] }): Count[] {
  const counts = new Map<string, Count>();
  const problems: string[] = [];
  const visit = (suite: ReportSuite, path: string[]) => {
    for (const spec of suite.specs ?? []) {
      const tags = spec.tags.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`));
      const groups = tags.filter((tag) => tag.startsWith(groupTag('')));
      const themes = tags.filter((tag) => tag.startsWith(themeTag('')));
      const title = [...path, spec.title].join(' › ');
      const group = groups[0]?.slice(groupTag('').length);
      const theme = themes[0]?.slice(themeTag('').length);
      if (groups.length !== 1 || themes.length !== 1 || !group || !theme) {
        problems.push(`${title}: needs one group tag and one theme tag, has ${tags.join(' ')}`);
        continue;
      }
      if (!(groupNames as readonly string[]).includes(group)) {
        problems.push(`${title}: unknown group "${group}"`);
      }
      if (!(themeNames as readonly string[]).includes(theme)) {
        problems.push(`${title}: unknown theme "${theme}"`);
      }
      for (const { projectName: project } of spec.tests) {
        const key = `${project}\n${group}\n${theme}`;
        const count = counts.get(key) ?? { project, group, theme, tests: 0 };
        count.tests++;
        counts.set(key, count);
      }
    }
    for (const child of suite.suites ?? []) visit(child, [...path, child.title]);
  };
  for (const suite of report.suites) visit(suite, [suite.title]);
  if (problems.length > 0) throw new Error(problems.join('\n'));
  return [...counts.values()];
}

/**
 * Packs the visual tests into jobs of whole groups, or of a group's themes when a group is over the
 * cap. With a selection, only those groups and themes are planned.
 */
export function planVisual(
  all: readonly Count[],
  budget: Budget = visualBudget,
  selection: Selection = {},
): VisualJob[] {
  const counts = all.filter(
    (count) =>
      (!selection.groups || selection.groups.includes(count.group)) &&
      (!selection.themes || selection.themes.includes(count.theme)),
  );
  const projects = [...new Set(counts.map((count) => count.project))];
  const order = (group: string) => (groupNames as readonly string[]).indexOf(group);
  const jobs: VisualJob[] = [];

  for (const project of projects) {
    const weight = budget.weights[project];
    if (weight === undefined) throw new Error(`No weight for the visual project "${project}"`);
    const mine = counts.filter((count) => count.project === project);
    const groups = [...new Set(mine.map((count) => count.group))].sort(
      (a, b) => order(a) - order(b),
    );

    const units: Unit[] = [];
    for (const group of groups) {
      const themes = mine.filter((count) => count.group === group);
      const cost = themes.reduce((sum, count) => sum + count.tests, 0) * weight;
      if (cost <= budget.cap) {
        const restricted = selection.themes ? { themes: themes.map((count) => count.theme) } : {};
        units.push({ group, cost, ...restricted });
        continue;
      }
      for (const { theme, tests } of themes) {
        if (tests * weight > budget.cap) {
          throw new Error(
            `${project} · ${group} · ${theme} costs ${tests * weight}, over the cap of ${budget.cap}. ` +
              `Split the group into two groups (specs/ci.md §6).`,
          );
        }
        units.push({ group, themes: [theme], cost: tests * weight });
      }
    }

    let bins: Unit[][];
    if (budget.jobPerGroup.has(project)) {
      bins = units.map((unit) => [unit]);
    } else {
      // Largest first, each into the first job it fits.
      bins = [];
      const loads: number[] = [];
      for (const unit of [...units].sort((a, b) => b.cost - a.cost)) {
        const index = loads.findIndex((load) => load + unit.cost <= budget.cap);
        if (index === -1) {
          bins.push([unit]);
          loads.push(unit.cost);
        } else {
          bins[index]!.push(unit);
          loads[index]! += unit.cost;
        }
      }
      for (const bin of bins) bin.sort((a, b) => order(a.group) - order(b.group));
    }

    for (const bin of bins) {
      const whole = bins.length === 1 && !selection.themes;
      const parts = bin.map(({ group, themes }) =>
        themes ? `${group} · ${themes.join(', ')}` : group,
      );
      const slug = bin.flatMap(({ group, themes }) => [group, ...(themes ?? [])]);
      jobs.push({
        id: [project, ...(whole ? ['all'] : slug)].join('-'),
        name: `${project} · ${whole ? 'all groups' : parts.join(', ')}`,
        project,
        grep: grepFor(bin),
      });
    }
  }
  if (jobs.length === 0) throw new Error('No visual tests match the selected groups and themes.');
  return jobs;
}

/** One smoke job: the `PUNK_SMOKE_PART` it checks. */
export interface SmokeJob {
  part: string;
}

// The pool renders an entry in about 0.07s locally, perhaps three times that on a runner, so 400
// entries and the flows fit the 3-minute target with the build (specs/ci.md §9).
export const smokeEntriesPerPart = 400;

/** Enough parts that none checks more than `perPart` entries. */
export function planSmoke(entries: number, perPart = smokeEntriesPerPart): SmokeJob[] {
  const parts = Math.max(1, Math.ceil(entries / perPart));
  return Array.from({ length: parts }, (_, index) => ({ part: `${index + 1}/${parts}` }));
}

/** The number of workbench entries, from Storybook's index, which needs no build. */
function countWorkbenchEntries(): number {
  const workbench = fileURLToPath(new URL('../apps/storybook/', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'punk-plan-'));
  try {
    const file = join(dir, 'index.json');
    execFileSync('npx', ['storybook', 'index', '-o', file, '--quiet', '--disable-telemetry'], {
      cwd: workbench,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const { entries } = JSON.parse(readFileSync(file, 'utf8')) as { entries: object };
    return Object.keys(entries).length;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function listVisualTests(): Count[] {
  const core = fileURLToPath(new URL('../packages/core/', import.meta.url));
  const report = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
    cwd: core,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return countTests(JSON.parse(report) as { suites: ReportSuite[] });
}

if (import.meta.main) {
  // The baseline workflow renders a subset (specs/ci.md §8); CI renders everything.
  const selection = parseSelection(
    process.env['PUNK_GALLERY_GROUPS'],
    process.env['PUNK_GALLERY_THEMES'],
  );
  const visual = planVisual(listVisualTests(), visualBudget, selection);
  const entries = countWorkbenchEntries();
  const smoke = planSmoke(entries);
  const output = process.env['GITHUB_OUTPUT'];
  if (output) {
    appendFileSync(output, `visual=${JSON.stringify(visual)}\nsmoke=${JSON.stringify(smoke)}\n`);
  } else {
    console.log(JSON.stringify({ visual, smoke }, null, 2));
  }
  const summary = process.env['GITHUB_STEP_SUMMARY'];
  if (summary) {
    const rows = visual.map((job) => `| ${job.name} |`).join('\n');
    appendFileSync(
      summary,
      `### Visual jobs\n\n| Job |\n| --- |\n${rows}\n\n` +
        `### Smoke\n\n${entries} workbench entries in ${smoke.length} part(s).\n`,
    );
  }
}
