import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeNames } from '../packages/core/src/tokens/themes.ts';
import {
  galleryGroups,
  groupNames,
  parseSelection,
} from '../packages/core/test/browser/fixtures/groups.ts';
import type { Selection } from '../packages/core/test/browser/fixtures/groups.ts';
import { groupTag, themeTag } from '../packages/core/test/visual/tags.ts';

export { parseSelection };
export type { Selection };

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

/** One browser job: an engine, its part of the component tests, and what its gallery suites render. */
export interface BrowserJob {
  name: string;
  engine: string;
  part: string;
  /** Comma-separated; empty when the part runs no gallery suite. */
  groups: string;
  themes: string;
}

export interface BrowserBudget {
  /** The most gallery rendering a part may hold, in seconds. */
  cap: number;
  /** What the gallery suites spend on one component in one theme and density. */
  secondsPerCombination: number;
  /** The theme and density pairs each engine renders (specs/ci.md §5.3). */
  combinations: Record<string, number>;
  /** The parts the component tests of each engine are spread across, at least. */
  componentParts: Record<string, number>;
}

// In CI the gallery suites took about 0.35s per component, theme, and density in each engine. Beside
// setup and about a minute of component tests, a part has about 100s for them in its 4-minute target.
export const browserBudget: BrowserBudget = {
  cap: 100,
  secondsPerCombination: 0.35,
  combinations: { chromium: themeNames.length * 2, firefox: 2, webkit: 2 },
  componentParts: { chromium: 1, firefox: 1, webkit: 1 },
};

interface GalleryUnit {
  groups: string[];
  themes?: string[];
  cost: number;
}

/**
 * Splits each engine's browser tests into parts: gallery groups packed under the cap, a group split by
 * theme when it alone is over it, and the component tests spread across as many parts.
 */
export function planBrowser(
  groups: Readonly<Record<string, readonly string[]>> = galleryGroups,
  themes: readonly string[] = themeNames,
  budget: BrowserBudget = browserBudget,
): BrowserJob[] {
  const jobs: BrowserJob[] = [];
  const names = Object.keys(groups);
  for (const [engine, combinations] of Object.entries(budget.combinations)) {
    const whole: GalleryUnit[] = [];
    const bins: GalleryUnit[] = [];
    for (const [group, members] of Object.entries(groups)) {
      const cost = members.length * combinations * budget.secondsPerCombination;
      if (cost <= budget.cap) {
        whole.push({ groups: [group], cost });
        continue;
      }
      const perTheme = cost / themes.length;
      if (combinations < themes.length * 2 || perTheme > budget.cap) {
        throw new Error(
          `browser · ${engine} · ${group} costs ${Math.round(cost)}s, over the cap of ${budget.cap}s` +
            ` even by theme. Split the group into two groups (specs/ci.md §6).`,
        );
      }
      // A part names one set of groups and themes, so a group's theme runs in a part of its own.
      for (const theme of themes) bins.push({ groups: [group], themes: [theme], cost: perTheme });
    }
    const packed: GalleryUnit[] = [];
    for (const unit of [...whole].sort((a, b) => b.cost - a.cost)) {
      const fits = packed.find((bin) => bin.cost + unit.cost <= budget.cap);
      if (fits) {
        fits.groups.push(...unit.groups);
        fits.cost += unit.cost;
      } else {
        packed.push({ groups: [...unit.groups], cost: unit.cost });
      }
    }
    for (const bin of packed) bin.groups.sort((a, b) => names.indexOf(a) - names.indexOf(b));
    bins.unshift(...packed);

    const parts = Math.max(budget.componentParts[engine] ?? 1, bins.length);
    for (let index = 0; index < parts; index++) {
      const bin = bins[index];
      const all = bin && !bin.themes && bin.groups.length === names.length;
      const label = !bin
        ? ''
        : all
          ? ' · all groups'
          : ` · ${bin.groups.join(', ')}${bin.themes ? ` · ${bin.themes.join(', ')}` : ''}`;
      jobs.push({
        name: `${engine} ${index + 1}/${parts}${label}`,
        engine,
        part: `${index + 1}/${parts}`,
        groups: bin?.groups.join(',') ?? '',
        themes: bin?.themes?.join(',') ?? '',
      });
    }
  }
  return jobs;
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

/** Whether a change touches only prose and repository settings, so only `static` runs (specs/ci.md §7). */
export function onlyProse(files: readonly string[]): boolean {
  return (
    files.length > 0 &&
    files.every(
      (file) =>
        file.startsWith('specs/') ||
        (file.endsWith('.md') && !file.startsWith('apps/storybook/')) ||
        file === '.github/dependabot.yml',
    )
  );
}

/** The files a pull request changes. CI checks out its merge commit, whose first parent is the base. */
function changedFiles(): string[] {
  return execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

/** The target duration of each job family, in minutes (specs/ci.md §9). */
export const targetMinutes: Record<string, number> = {
  plan: 1,
  static: 2,
  integration: 3,
  smoke: 3,
  browser: 4,
  visual: 4,
};

export interface JobTiming {
  name: string;
  started_at: string | null;
  completed_at: string | null;
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`;

/** A Markdown table of the slowest jobs against their targets. */
export function budgetReport(jobs: readonly JobTiming[], limit = 10): string {
  const rows = jobs
    .flatMap(({ name, started_at, completed_at }) => {
      const target = targetMinutes[name.split(/[\s(/]/)[0] ?? ''];
      if (!target || !started_at || !completed_at) return [];
      const seconds = (Date.parse(completed_at) - Date.parse(started_at)) / 1000;
      return [{ name, seconds, target }];
    })
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit);
  const lines = rows.map(({ name, seconds, target }) => {
    const share = Math.round((seconds / (target * 60)) * 100);
    return `| ${name} | ${clock(seconds)} | ${target}m | ${share}%${share > 100 ? ' (over)' : ''} |`;
  });
  return ['| Job | Took | Target | Of target |', '| --- | --- | --- | --- |', ...lines].join('\n');
}

/** The jobs of the last successful CI run on `main`, from the GitHub API. */
async function lastRunOnMain(): Promise<{ url: string; jobs: JobTiming[] } | undefined> {
  const api = process.env['GITHUB_API_URL'] ?? 'https://api.github.com';
  const repository = process.env['GITHUB_REPOSITORY'];
  const headers = {
    authorization: `Bearer ${process.env['GITHUB_TOKEN']}`,
    accept: 'application/vnd.github+json',
  };
  const get = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${api}/repos/${repository}/${path}`, { headers });
    if (!response.ok) throw new Error(`GET ${path}: ${response.status}`);
    return (await response.json()) as T;
  };
  const { workflow_runs: runs } = await get<{
    workflow_runs: Array<{ id: number; html_url: string }>;
  }>('actions/workflows/ci.yml/runs?branch=main&status=success&per_page=1');
  const run = runs[0];
  if (!run) return undefined;
  const { jobs } = await get<{ jobs: JobTiming[] }>(`actions/runs/${run.id}/jobs?per_page=100`);
  return { url: run.html_url, jobs };
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
  const browser = planBrowser();
  // A push to `main` always runs everything; a pull request of prose runs `static` alone.
  const prose = process.env['GITHUB_EVENT_NAME'] === 'pull_request' && onlyProse(changedFiles());
  const output = process.env['GITHUB_OUTPUT'];
  if (output) {
    appendFileSync(
      output,
      `visual=${JSON.stringify(visual)}\nsmoke=${JSON.stringify(smoke)}\n` +
        `browser=${JSON.stringify(browser)}\nfull=${!prose}\n`,
    );
  } else {
    console.log(JSON.stringify({ visual, smoke, browser, full: !prose }, null, 2));
  }
  const summary = process.env['GITHUB_STEP_SUMMARY'];
  if (summary) {
    const rows = visual.map((job) => `| ${job.name} |`).join('\n');
    const browserRows = browser.map((job) => `| ${job.name} |`).join('\n');
    appendFileSync(
      summary,
      (prose ? 'This change is prose only, so only `static` runs.\n\n' : '') +
        `### Browser jobs\n\n| Job |\n| --- |\n${browserRows}\n\n` +
        `### Visual jobs\n\n| Job |\n| --- |\n${rows}\n\n` +
        `### Smoke\n\n${entries} workbench entries in ${smoke.length} part(s).\n`,
    );
    if (process.env['GITHUB_TOKEN']) {
      // The report is information, not a gate, so a failed request only notes itself.
      let report: string;
      try {
        const last = await lastRunOnMain();
        report = last
          ? `The slowest jobs of [the last run on main](${last.url}):\n\n${budgetReport(last.jobs)}`
          : 'No successful run on main yet.';
      } catch (error) {
        report = `Unavailable: ${(error as Error).message}`;
      }
      appendFileSync(summary, `\n### Budgets\n\n${report}\n`);
    }
  }
}
