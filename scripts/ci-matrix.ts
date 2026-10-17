import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
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
  theme?: string;
  cost: number;
}

interface ReportSuite {
  title: string;
  specs?: Array<{ title: string; tags: string[]; tests: Array<{ projectName: string }> }>;
  suites?: ReportSuite[];
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A tag ends at a space or the end, so `@theme:industrial` does not match `@theme:industrial-light`.
const hasTag = (tag: string) => `(?=.*${escape(tag)}(?=\\s|$))`;

/** A `--grep` that selects exactly the tests of these units. */
export function grepFor(units: ReadonlyArray<{ group: string; theme?: string }>): string {
  if (units.every((unit) => !unit.theme)) {
    const groups = units.map((unit) => escape(unit.group)).join('|');
    return `${escape(groupTag(''))}(?:${groups})(?=\\s|$)`;
  }
  const alternatives = units.map(
    ({ group, theme }) => hasTag(groupTag(group)) + (theme ? hasTag(themeTag(theme)) : ''),
  );
  return `^(?:${alternatives.join('|')})`;
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

/** Packs the visual tests into jobs of whole groups, or of a group's themes when a group is over the cap. */
export function planVisual(counts: readonly Count[], budget: Budget = visualBudget): VisualJob[] {
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
        units.push({ group, cost });
        continue;
      }
      for (const { theme, tests } of themes) {
        if (tests * weight > budget.cap) {
          throw new Error(
            `${project} · ${group} · ${theme} costs ${tests * weight}, over the cap of ${budget.cap}. ` +
              `Split the group into two groups (specs/ci.md §6).`,
          );
        }
        units.push({ group, theme, cost: tests * weight });
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
      const all = bins.length === 1;
      const parts = bin.map(({ group, theme }) => (theme ? `${group} · ${theme}` : group));
      const slug = bin.flatMap(({ group, theme }) => (theme ? [group, theme] : [group]));
      jobs.push({
        id: [project, ...(all ? ['all'] : slug)].join('-'),
        name: `${project} · ${all ? 'all groups' : parts.join(', ')}`,
        project,
        grep: grepFor(bin),
      });
    }
  }
  return jobs;
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
  const visual = planVisual(listVisualTests());
  const output = process.env['GITHUB_OUTPUT'];
  if (output) {
    appendFileSync(output, `visual=${JSON.stringify(visual)}\n`);
  } else {
    console.log(JSON.stringify({ visual }, null, 2));
  }
  const summary = process.env['GITHUB_STEP_SUMMARY'];
  if (summary) {
    const rows = visual.map((job) => `| ${job.name} |`).join('\n');
    appendFileSync(summary, `### Visual jobs\n\n| Job |\n| --- |\n${rows}\n`);
  }
}
