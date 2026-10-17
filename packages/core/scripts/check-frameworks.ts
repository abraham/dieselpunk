import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScript, parse } from '@vue/compiler-sfc';
import { build } from 'esbuild';
import type { Plugin } from 'esbuild';
import svelteModule from 'esbuild-svelte';
import { chromium } from 'playwright';
import type { Page } from 'playwright';

// specs/testing.md §8: a React, a Vue, and a Svelte app, each built against the package as a
// consumer would use it and driven in Chromium with real input. The apps report what they
// received, and this script compares it with what the input should have produced. The guides show
// these apps' code, so a guide that stops working breaks this check. Run after `npm run build`.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const fixtures = join(packageDir, 'test/frameworks');

if (!existsSync(join(packageDir, 'dist'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// The package's types describe an ES module, and Node gives the plugin function itself.
const sveltePlugin = svelteModule as unknown as (options: object) => Plugin;

const vue: Plugin = {
  name: 'vue-sfc',
  setup(builder) {
    builder.onLoad({ filter: /\.vue$/ }, (args) => {
      // The template is parsed with `parse`, so that is where `punk-` tags are marked as elements.
      const isCustomElement = (tag: string) => tag.startsWith('punk-');
      const { descriptor, errors } = parse(readFileSync(args.path, 'utf8'), {
        filename: args.path,
        templateParseOptions: { isCustomElement },
      });
      if (errors.length > 0) return { errors: errors.map((error) => ({ text: error.message })) };
      const script = compileScript(descriptor, {
        id: 'fixture',
        // Inlining the template, which compiles it, is only done for production.
        isProd: true,
        inlineTemplate: true,
        templateOptions: { compilerOptions: { isCustomElement } },
      });
      return {
        contents: script.content,
        loader: script.lang === 'ts' ? 'ts' : 'js',
        resolveDir: dirname(args.path),
      };
    });
  },
};

interface Framework {
  name: string;
  entry: string;
  plugins: Plugin[];
  conditions?: string[];
}

const frameworks: Framework[] = [
  { name: 'react', entry: 'react/main.tsx', plugins: [] },
  { name: 'vue', entry: 'vue/main.ts', plugins: [vue] },
  {
    name: 'svelte',
    entry: 'svelte/main.ts',
    plugins: [sveltePlugin({ compilerOptions: { css: 'injected' } })],
    conditions: ['svelte', 'browser'],
  },
];

// What the keys and clicks below leave in the app, in every framework.
const expected = {
  callsign: 'Echo',
  restart: true,
  power: 100,
  submitted: [
    ['callsign', 'Echo'],
    ['restart', 'on'],
    ['power', '100'],
  ],
  tab: 'modules',
  dialog: 'action:discard',
  window: 'escape',
};

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const problems: string[] = [];

async function drive(page: Page, name: string): Promise<void> {
  const fail = (message: string) => problems.push(`${name}: ${message}`);
  await page.waitForSelector('#report');

  // Typing reaches the app's state, and the state reaches the page again.
  await page.getByRole('textbox', { name: 'Callsign' }).fill('Echo');
  const greeting = await page.locator('#greeting').textContent();
  if (greeting?.trim() !== 'Hello, Echo') fail(`the greeting is "${greeting}"`);

  const restart = page.getByRole('switch', { name: 'Restart' });
  await restart.focus();
  await page.keyboard.press('Space');

  // The other direction: the app sets the slider through its property.
  await page.getByRole('button', { name: 'Boost' }).click();
  const slider = page.getByRole('slider', { name: 'Power' });
  const boosted = await slider.getAttribute('aria-valuenow');
  if (boosted !== '90') fail(`the app set the slider to 90 and it shows ${boosted}`);
  await slider.focus();
  await page.keyboard.press('End');

  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('tab', { name: 'Modules' }).click();

  await page.getByRole('button', { name: 'Stop machine' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Discard the run?' });
  if (!(await dialog.isVisible())) fail('the dialog did not open');
  await page.getByRole('button', { name: 'Discard' }).click();
  if (await dialog.isVisible()) fail('the dialog did not close');

  await page.keyboard.press('Escape');

  // A framework renders the last event a frame later, so the report is given a moment to settle.
  const wanted = JSON.stringify(expected);
  await page
    .waitForFunction(
      `document.querySelector('#report')?.textContent?.replace(/\\s/g, '') === ${JSON.stringify(wanted)}`,
      undefined,
      { timeout: 3000 },
    )
    .catch(() => undefined);
  const report = (await page.locator('#report').textContent()) ?? '';
  if (report.trim() !== wanted) fail(`the app received ${report.trim()}, expected ${wanted}`);
}

console.log('Type-checking the React app:');
try {
  execFileSync('npx', ['tsc', '-p', join(fixtures, 'react/tsconfig.json')], {
    cwd: packageDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log('  react: the elements and events are typed');
} catch (error) {
  problems.push(`react failed to type-check:\n${(error as { stdout?: string }).stdout ?? error}`);
}

const work = mkdtempSync(join(tmpdir(), 'punk-frameworks-'));
console.log('Building and running each app in a browser:');
try {
  for (const framework of frameworks) {
    const outdir = join(work, framework.name);
    await build({
      entryPoints: { app: join(fixtures, framework.entry) },
      bundle: true,
      format: 'esm',
      outdir,
      jsx: 'automatic',
      conditions: framework.conditions,
      plugins: framework.plugins,
      logLevel: 'silent',
      define: {
        'process.env.NODE_ENV': '"development"',
        __VUE_OPTIONS_API__: 'false',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
      },
    });
    cpSync(join(fixtures, 'index.html'), join(outdir, 'index.html'));

    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://localhost').pathname;
      const file = join(outdir, url === '/' ? 'index.html' : url);
      if (!file.startsWith(outdir) || !existsSync(file)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'text/plain' });
      response.end(readFileSync(file));
    }).listen(0);
    const port = (server.address() as { port: number }).port;
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
      const messages: string[] = [];
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) messages.push(message.text());
      });
      page.on('pageerror', (error) => messages.push(error.message));
      await page.goto(`http://localhost:${port}/`);
      await drive(page, framework.name);
      if (messages.length > 0) problems.push(`${framework.name} logged: ${messages.join(' | ')}`);
      console.log(`  ${framework.name}: driven with real input`);
    } catch (error) {
      problems.push(`${framework.name}: ${String(error).split('\n')[0]}`);
    } finally {
      await browser.close();
      server.close();
    }
  }
} catch (error) {
  problems.push(String((error as { stderr?: string }).stderr ?? error));
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(
    `Framework check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
  );
  process.exit(1);
}
console.log('Framework check OK: React, Vue, and Svelte apps work from the built package');
