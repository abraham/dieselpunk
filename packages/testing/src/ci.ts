import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { groupTag, themeTag } from './playwright.ts';

// How CI splits the suites into jobs (specs/ci.md §6), detects prose-only changes (§7), merges
// re-rendered baselines (§8), and reports its budgets (§9). The caller passes the groups and themes.

/** The gallery groups and themes to render; all of either when absent. */
export interface Selection {
  groups?: readonly string[];
  themes?: readonly string[];
}

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

export interface ReportSuite {
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

/**
 * Counts the tests of a `playwright test --list --reporter=json` report by project, group, and
 * theme. Every test needs one known group tag and one known theme tag.
 */
export function countTests(
  report: { suites: ReportSuite[] },
  groups: readonly string[],
  themes: readonly string[],
): Count[] {
  const counts = new Map<string, Count>();
  const problems: string[] = [];
  const visit = (suite: ReportSuite, path: string[]) => {
    for (const spec of suite.specs ?? []) {
      const tags = spec.tags.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`));
      const groupTags = tags.filter((tag) => tag.startsWith(groupTag('')));
      const themeTags = tags.filter((tag) => tag.startsWith(themeTag('')));
      const title = [...path, spec.title].join(' › ');
      const group = groupTags[0]?.slice(groupTag('').length);
      const theme = themeTags[0]?.slice(themeTag('').length);
      if (groupTags.length !== 1 || themeTags.length !== 1 || !group || !theme) {
        problems.push(`${title}: needs one group tag and one theme tag, has ${tags.join(' ')}`);
        continue;
      }
      if (!groups.includes(group)) problems.push(`${title}: unknown group "${group}"`);
      if (!themes.includes(theme)) problems.push(`${title}: unknown theme "${theme}"`);
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
 * cap. With a selection, only those groups and themes are planned. Jobs list groups in `order`.
 */
export function planVisual(
  all: readonly Count[],
  order: readonly string[],
  budget: Budget = visualBudget,
  selection: Selection = {},
): VisualJob[] {
  const counts = all.filter(
    (count) =>
      (!selection.groups || selection.groups.includes(count.group)) &&
      (!selection.themes || selection.themes.includes(count.theme)),
  );
  const projects = [...new Set(counts.map((count) => count.project))];
  const rank = (group: string) => order.indexOf(group);
  const jobs: VisualJob[] = [];

  for (const project of projects) {
    const weight = budget.weights[project];
    if (weight === undefined) throw new Error(`No weight for the visual project "${project}"`);
    const mine = counts.filter((count) => count.project === project);
    const groups = [...new Set(mine.map((count) => count.group))].sort((a, b) => rank(a) - rank(b));

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
      for (const bin of bins) bin.sort((a, b) => rank(a.group) - rank(b.group));
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
/** The budget of the browser jobs when Chromium renders `themes` themes in two densities. */
export const browserBudgetFor = (themes: number): BrowserBudget => ({
  cap: 100,
  secondsPerCombination: 0.35,
  combinations: { chromium: themes * 2, firefox: 2, webkit: 2 },
  componentParts: { chromium: 1, firefox: 1, webkit: 1 },
});

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
  groups: Readonly<Record<string, readonly string[]>>,
  themes: readonly string[],
  budget: BrowserBudget = browserBudgetFor(themes.length),
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

/** The theme a baseline renders, from its file name. A capture named for no theme uses `fallback`. */
export function themeOfBaseline(file: string, themes: readonly string[], fallback: string): string {
  const longestFirst = [...themes].sort((a, b) => b.length - a.length);
  const found = longestFirst.find(
    (theme) => file.startsWith(`${theme}-`) || file.includes(`-${theme}-`),
  );
  return found ?? fallback;
}

/**
 * Replaces the selected baselines in `baselines` (project/group/file) with those in `rendered`. The
 * selected ones are deleted first, so baselines of removed tests do not linger. `themeOf` reads a
 * baseline's theme from its file name.
 */
export function mergeBaselines(
  baselines: string,
  rendered: string,
  selection: Selection,
  themeOf: (file: string) => string,
): number {
  if (!existsSync(rendered) || readdirSync(rendered).length === 0) {
    throw new Error(`${rendered} holds no rendered baselines`);
  }
  let removed = 0;
  if (!selection.groups && !selection.themes) {
    rmSync(baselines, { recursive: true, force: true });
  } else if (existsSync(baselines)) {
    for (const project of readdirSync(baselines)) {
      for (const group of readdirSync(join(baselines, project))) {
        if (selection.groups && !selection.groups.includes(group)) continue;
        for (const file of readdirSync(join(baselines, project, group))) {
          if (selection.themes && !selection.themes.includes(themeOf(file))) continue;
          rmSync(join(baselines, project, group, file));
          removed++;
        }
      }
    }
  }
  cpSync(rendered, baselines, { recursive: true });
  return removed;
}
