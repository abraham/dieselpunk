import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { arch } from 'node:os';
import { basename, join, relative } from 'node:path';
import { build } from 'esbuild';

// Runs a package's Playwright visual tests on the Linux image that baselines come from
// (specs/testing.md §6). On Linux (CI, inside the Playwright image) Playwright runs directly.
// Elsewhere it runs in Docker, with the repository mounted.

export type VisualMode = 'check' | 'update' | 'selftest';

export interface VisualRun {
  /** The folder of the package's playwright.config.ts. */
  packageDir: string;
  /** The repository root, mounted into the container. */
  repoDir: string;
  /** The committed baselines, which `check` needs. */
  baselinesDir: string;
  /** Builds the page the tests open. Runs on the host, since esbuild's binary is platform-specific. */
  buildPage: () => Promise<void>;
  /** Arguments passed on to `playwright test`. */
  extra: string[];
}

/** Runs the tests in `mode`, and returns the exit code. */
export async function runVisual(mode: VisualMode, run: VisualRun): Promise<number> {
  const { packageDir, repoDir, baselinesDir, extra } = run;
  const { version } = JSON.parse(
    readFileSync(join(repoDir, 'node_modules/@playwright/test/package.json'), 'utf8'),
  ) as { version: string };
  const image = `mcr.microsoft.com/playwright:v${version}-noble`;

  if (!existsSync(join(repoDir, 'node_modules/.bin/playwright'))) {
    console.error('Dependencies are not installed. Run `npm ci` first.');
    return 1;
  }

  // Committed baselines are written by CI, on the same image and architecture it checks with. A
  // local container on Apple Silicon is arm64, and emulating amd64 there crashes Chromium, so a
  // local "update" would commit baselines CI cannot reproduce.
  if (mode === 'update' && !process.env['CI'] && !process.env['PUNK_VISUAL_FORCE_UPDATE']) {
    console.error(
      'Baselines are written by CI. Run the "Update visual baselines" workflow and commit its artifact.\n' +
        'Set PUNK_VISUAL_FORCE_UPDATE=1 to override, for example on a Linux amd64 machine.',
    );
    return 1;
  }

  await run.buildPage();

  if (mode === 'check' && !existsSync(baselinesDir)) {
    console.error(
      'There are no committed baselines. Run the "Update visual baselines" workflow, download its\n' +
        `artifact, and commit it to ${relative(repoDir, baselinesDir)}.`,
    );
    return 1;
  }

  const playwright = (args: string[], snapshots?: string): number => {
    const command = ['playwright', 'test', ...args, ...extra];
    const env = { ...process.env, ...(snapshots ? { PUNK_VISUAL_SNAPSHOTS: snapshots } : {}) };
    if (process.platform === 'linux') {
      return spawnSync('npx', command, { cwd: packageDir, stdio: 'inherit', env }).status ?? 1;
    }
    try {
      execFileSync('docker', ['info'], { stdio: 'ignore' });
    } catch {
      console.error(
        `Docker is not running. Visual tests must render on ${image}, so this needs Docker.`,
      );
      return 1;
    }
    const forwarded = snapshots ? ['-e', `PUNK_VISUAL_SNAPSHOTS=${snapshots}`] : [];
    const workdir = `/work/${relative(repoDir, packageDir)}`;
    const dockerArgs = ['run', '--rm', '--ipc=host', '-v', `${repoDir}:/work`, '-w', workdir];
    return (
      spawnSync('docker', [...dockerArgs, ...forwarded, image, 'npx', ...command], {
        cwd: packageDir,
        stdio: 'inherit',
      }).status ?? 1
    );
  };

  if (mode === 'selftest') {
    // The first run writes fresh baselines to a scratch folder; the second must reproduce them.
    const scratch = 'test-results/visual-selftest';
    rmSync(join(packageDir, scratch), { recursive: true, force: true });
    const where = process.platform === 'linux' ? 'this machine' : `Docker, ${arch()}`;
    console.log(`Self-test on ${image} (${where})`);
    const first = playwright(['--update-snapshots'], scratch);
    if (first !== 0) return first;
    return playwright([], scratch);
  }

  console.log(`Rendering on ${image}`);
  return playwright(mode === 'update' ? ['--update-snapshots'] : []);
}

export interface Page {
  /** The page's script. */
  entry: string;
  /** The page's HTML, copied beside the script under its own name. */
  html: string;
  outDir: string;
  /** Import aliases, such as a source flag in place of a built one. */
  alias?: Record<string, string>;
}

/** Bundles a test page into static files, with its fonts as assets. */
export async function bundlePage(page: Page): Promise<void> {
  rmSync(page.outDir, { recursive: true, force: true });
  mkdirSync(page.outDir, { recursive: true });
  await build({
    entryPoints: [page.entry],
    bundle: true,
    format: 'esm',
    outdir: page.outDir,
    logLevel: 'warning',
    alias: page.alias ?? {},
    // A package's `sideEffects` describes its dist/, so bundling sources must keep every import.
    ignoreAnnotations: true,
    loader: { '.woff': 'file', '.woff2': 'file' },
    assetNames: 'assets/[name]-[hash]',
  });
  cpSync(page.html, join(page.outDir, basename(page.html)));
}
