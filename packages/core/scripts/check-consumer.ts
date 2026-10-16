import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Installs the packed tarball into throwaway projects, the way a consumer would, then type-checks
// the fixture under the oldest and newest supported TypeScript and runs it in a browser.
// Run after `npm run build`. Rules are in SPEC-PHASE-1.md sections 5.1 and 13.3.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(packageDir, 'test/package');
const rootPackage = JSON.parse(readFileSync(join(packageDir, '../../package.json'), 'utf8')) as {
  devDependencies: Record<string, string>;
};
const OLDEST_TYPESCRIPT = '5.0.4';
const NEWEST_TYPESCRIPT = rootPackage.devDependencies['typescript'] ?? '~6.0.3';

if (!existsSync(join(packageDir, 'dist'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

interface Report {
  defined: string[];
  upgraded: boolean;
  canvas: string;
  ready: string | null;
  valuenow: string | null;
  name: string | null;
  gridRole: string | null;
  itemRole: string | null;
  changed: string[] | null;
  toggled: boolean | null;
  tabbed: string | null;
  closed: string | null;
  menuClosed: string | null;
  dismissed: string | null;
  toastSlot: string | null;
}

// What each page registers: the plain page imports panel and button; the TypeScript page imports
// the icon button, which brings the tooltip, the progress bar, and the inventory components.
const expectedTags: Record<string, string[]> = {
  plain: ['punk-button', 'punk-panel'],
  app: [
    'punk-accordion',
    'punk-accordion-item',
    'punk-cluster',
    'punk-dialog',
    'punk-icon-button',
    'punk-item-stack',
    'punk-meter',
    'punk-popover',
    'punk-progress-bar',
    'punk-recipe',
    'punk-slot',
    'punk-slot-grid',
    'punk-stack',
    'punk-status-light',
    'punk-tab',
    'punk-tabs',
    'punk-toast',
    'punk-toast-stack',
    'punk-toolbar',
    'punk-tooltip',
    'punk-window',
  ],
};

const run = (command: string, args: string[], cwd: string): string =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const work = mkdtempSync(join(tmpdir(), 'punk-consumer-'));
const problems: string[] = [];

function install(project: string, tarball: string, typescript: string): void {
  mkdirSync(project, { recursive: true });
  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify({
      name: 'consumer',
      private: true,
      type: 'module',
      dependencies: { '@dieselpunk/core': `file:${tarball}` },
      devDependencies: { typescript },
    }),
  );
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], project);
  cpSync(join(fixtureDir, 'src'), join(project, 'src'), { recursive: true });
  cpSync(join(fixtureDir, 'tsconfig.json'), join(project, 'tsconfig.json'));
}

function typecheck(project: string, label: string): void {
  const version = run('npx', ['tsc', '-v'], project).trim();
  try {
    run('npx', ['tsc', '-p', 'tsconfig.json'], project);
    console.log(`  ${label}: ${version} type-checks the consumer`);
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? String(error);
    problems.push(`${label} (${version}) failed to type-check:\n${output.trim()}`);
  }
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

async function probeScript(): Promise<string> {
  const result = await build({
    entryPoints: [join(fixtureDir, 'probe.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    logLevel: 'silent',
  });
  return result.outputFiles.map((file) => file.text).join('\n');
}

async function checkPages(outDir: string): Promise<void> {
  const probe = await probeScript();
  const server = createServer((request, response) => {
    const file = join(outDir, new URL(request.url ?? '/', 'http://localhost').pathname);
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'text/plain' });
    response.end(readFileSync(file));
  }).listen(0);
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch();
  try {
    for (const page of ['plain', 'app']) {
      const tab = await browser.newPage();
      const messages: string[] = [];
      tab.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) messages.push(message.text());
      });
      tab.on('pageerror', (error) => messages.push(error.message));
      await tab.goto(`http://localhost:${port}/${page}.html`);
      await tab.waitForTimeout(500);
      await tab.addScriptTag({ content: probe });
      const report = (await tab.evaluate('window.probeConsumer()')) as Report;

      const expected = expectedTags[page] ?? [];
      if (JSON.stringify([...report.defined].sort()) !== JSON.stringify(expected)) {
        problems.push(`${page}.html defines [${report.defined}], expected [${expected}]`);
      }
      if (page === 'plain') {
        if (!report.upgraded) problems.push('plain.html: the elements were not upgraded');
        if (!report.canvas) problems.push('plain.html: tokens.css did not apply');
      } else {
        if (report.ready !== 'ready') problems.push('app.html: the consumer module did not run');
        if (report.valuenow !== '64') {
          problems.push(`app.html: progress bar valuenow is ${report.valuenow}`);
        }
        if (!report.name) problems.push('app.html: the icon button has no accessible name');
        if (report.gridRole !== 'listbox' || report.itemRole !== 'option') {
          problems.push(
            `app.html: the grid is ${report.gridRole} with ${report.itemRole} items, expected listbox and option`,
          );
        }
        if (JSON.stringify(report.changed) !== '["engine"]') {
          problems.push(`app.html: clicking a slot reported ${JSON.stringify(report.changed)}`);
        }
        if (report.toggled !== true) {
          problems.push(`app.html: clicking a heading reported ${report.toggled}`);
        }
        if (report.tabbed !== 'outputs') {
          problems.push(`app.html: clicking a tab reported ${report.tabbed}`);
        }
        if (report.closed !== 'method:done') {
          problems.push(`app.html: closing a dialog reported ${report.closed}`);
        }
        if (report.menuClosed !== 'method') {
          problems.push(`app.html: closing a popover reported ${report.menuClosed}`);
        }
        if (report.dismissed !== 'method' || report.toastSlot !== 'assertive') {
          problems.push(
            `app.html: a toast was placed in ${report.toastSlot} and dismissed for ${report.dismissed}`,
          );
        }
      }
      if (messages.length > 0) problems.push(`${page}.html logged: ${messages.join(' | ')}`);
      await tab.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

try {
  const [packed] = JSON.parse(
    run('npm', ['pack', '--json', '--pack-destination', work], packageDir),
  ) as Array<{ filename: string }>;
  const tarball = join(work, packed?.filename ?? '');

  console.log('Type-checking the consumer:');
  const oldest = join(work, 'oldest');
  const newest = join(work, 'newest');
  install(oldest, tarball, OLDEST_TYPESCRIPT);
  typecheck(oldest, `TypeScript ${OLDEST_TYPESCRIPT}`);
  install(newest, tarball, NEWEST_TYPESCRIPT);
  typecheck(newest, `TypeScript ${NEWEST_TYPESCRIPT}`);

  console.log('Bundling and running the consumer in a browser:');
  const outDir = join(work, 'out');
  await build({
    absWorkingDir: newest,
    entryPoints: { plain: 'src/plain.js', app: 'src/app.ts' },
    bundle: true,
    format: 'esm',
    outdir: outDir,
    logLevel: 'silent',
  });
  cpSync(join(fixtureDir, 'plain.html'), join(outDir, 'plain.html'));
  cpSync(join(fixtureDir, 'app.html'), join(outDir, 'app.html'));
  await checkPages(outDir);
} catch (error) {
  problems.push(String((error as { stderr?: string }).stderr ?? error));
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(
    `Consumer check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
  );
  process.exit(1);
}
console.log('Consumer OK: plain HTML and TypeScript fixtures work from the packed package');
