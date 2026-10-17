import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  browserBudgetFor,
  budgetReport,
  countTests,
  onlyProse,
  planBrowser,
  planSmoke,
  planVisual,
  visualBudget,
} from '@dieselpunk/testing/ci';
import type { JobTiming, ReportSuite } from '@dieselpunk/testing/ci';
import { themeNames } from '../packages/core/src/tokens/themes.ts';
import {
  galleryGroups,
  groupNames,
  parseSelection,
} from '../packages/core/test/browser/fixtures/groups.ts';

// Writes the CI matrices as outputs of the `plan` job (specs/ci.md §6), from core's gallery groups
// and themes, its visual tests, and the workbench's entries.

/** The number of workbench entries, from Storybook's index, which needs no build. */
function countWorkbenchEntries(): number {
  const workbench = fileURLToPath(new URL('../packages/workbench/', import.meta.url));
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

/** The files a pull request changes. CI checks out its merge commit, whose first parent is the base. */
function changedFiles(): string[] {
  return execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
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

function listVisualTests() {
  const core = fileURLToPath(new URL('../packages/core/', import.meta.url));
  const report = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
    cwd: core,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return countTests(JSON.parse(report) as { suites: ReportSuite[] }, groupNames, themeNames);
}

// The baseline workflow renders a subset (specs/ci.md §8); CI renders everything.
const selection = parseSelection(
  process.env['PUNK_GALLERY_GROUPS'],
  process.env['PUNK_GALLERY_THEMES'],
);
const visual = planVisual(listVisualTests(), groupNames, visualBudget, selection);
const entries = countWorkbenchEntries();
const smoke = planSmoke(entries);
const browser = planBrowser(galleryGroups, themeNames, browserBudgetFor(themeNames.length));
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
