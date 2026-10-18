import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { installProject, pack, run, watchPage } from '@dieselpunk/testing/consumer';
import { serveStatic } from '@dieselpunk/testing/server';

// Installs the packed tarball into throwaway projects, the way a consumer would, then type-checks
// the fixture under the oldest and newest supported TypeScript and runs it in a browser.
// Run after `npm run build`. Rules are in specs/testing.md §8.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(packageDir, 'test/package');
const rootPackage = JSON.parse(readFileSync(join(packageDir, '../../package.json'), 'utf8')) as {
  devDependencies: Record<string, string>;
};
const corePackage = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
};
const localesDir = join(packageDir, '../locales');
const OLDEST_TYPESCRIPT = '5.0.4';
const NEWEST_TYPESCRIPT = rootPackage.devDependencies['typescript'] ?? '~6.0.3';
// The latest releases of the Lit SSR majors that match core's Lit 3 (specs/ssr.md §1).
const LIT_SSR = '^4.1.0';
const LIT_SSR_CLIENT = '^1.1.8';

if (!existsSync(join(packageDir, 'dist')) || !existsSync(join(localesDir, 'dist'))) {
  console.error('dist/ is missing in core or in locales. Run `npm run build` first.');
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
  agree: string | null;
  speed: string | null;
  callsign: string | null;
  thrust: string | null;
  squadron: string | null;
}

// What each page registers: the plain page imports panel and button; the TypeScript page imports
// the icon button, which brings the tooltip, the progress bar, and the inventory components.
const expectedTags: Record<string, string[]> = {
  plain: ['punk-button', 'punk-panel'],
  app: [
    'punk-accordion',
    'punk-accordion-item',
    'punk-checkbox',
    'punk-cluster',
    'punk-dialog',
    'punk-icon-button',
    'punk-item-stack',
    'punk-meter',
    'punk-number-field',
    'punk-popover',
    'punk-progress-bar',
    'punk-recipe',
    'punk-select',
    'punk-slider',
    'punk-slot',
    'punk-slot-grid',
    'punk-stack',
    'punk-status-light',
    'punk-switch',
    'punk-tab',
    'punk-tabs',
    'punk-text-field',
    'punk-toast',
    'punk-toast-stack',
    'punk-toolbar',
    'punk-tooltip',
    'punk-window',
  ],
};

// Every tag of the library, so a page that registers one it did not ask for is told.
const allTags = [
  ...new Set([
    ...expectedTags['app']!,
    'punk-button',
    'punk-panel',
    'punk-divider',
    'punk-connection-row',
    'punk-production-stat',
  ]),
];

const work = mkdtempSync(join(tmpdir(), 'punk-consumer-'));
const problems: string[] = [];

function install(
  project: string,
  tarballs: { core: string; locales: string },
  typescript: string,
): void {
  installProject(
    project,
    {
      '@dieselpunk/core': `file:${tarballs.core}`,
      '@dieselpunk/locales': `file:${tarballs.locales}`,
      // The consumer's own copy, which core and the translations must share (§13.7).
      '@lit/localize': corePackage.dependencies['@lit/localize'] ?? '',
    },
    { typescript },
  );
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

// specs/product.md §8: the assembler built from the registration entries, driven with real input.
async function checkShell(browser: Browser, port: number): Promise<void> {
  const tab = await browser.newPage();
  const messages = watchPage(tab);
  await tab.goto(`http://localhost:${port}/shell.html`);
  await tab.waitForSelector('html[data-shell="ready"]');
  // This script is type-checked without DOM types, so what runs in the page is a string.
  const attribute = (name: string) =>
    tab.evaluate(`document.documentElement.dataset[${JSON.stringify(name)}] ?? null`) as Promise<
      string | null
    >;

  const expected = [
    'punk-button',
    'punk-item-stack',
    'punk-progress-bar',
    'punk-recipe',
    'punk-slot',
    'punk-slot-grid',
    'punk-switch',
    'punk-tab',
    'punk-tabs',
    'punk-window',
  ];
  const tags = [
    ...expected,
    'punk-dialog',
    'punk-popover',
    'punk-toast',
    'punk-toolbar',
    'punk-tooltip',
  ];
  const defined = (await tab.evaluate(
    `${JSON.stringify(tags)}.filter((tag) => customElements.get(tag) !== undefined)`,
  )) as string[];
  if (JSON.stringify([...defined].sort()) !== JSON.stringify(expected)) {
    problems.push(`shell.html defines [${defined}], expected [${expected}]`);
  }

  const assembler = tab.getByRole('dialog', { name: 'Assembler 03' });
  if (!(await assembler.isVisible())) problems.push('shell.html: the window is not open and named');
  if ((await attribute('events'))?.split(' ')[0] !== 'open') {
    problems.push(`shell.html: the window opened with ${await attribute('events')}`);
  }
  if (!(await tab.getByRole('progressbar', { name: 'Crafting precision gear' }).isVisible())) {
    problems.push('shell.html: the progress bar is not shown and named');
  }

  await tab.getByRole('tab', { name: 'Modules' }).click();
  const production = await tab.locator('#production').isVisible();
  const modules = await tab.locator('#modules').isVisible();
  if (production || !modules) {
    problems.push(
      `shell.html: after a tab switch production is ${production} and modules is ${modules}`,
    );
  }

  await tab.getByRole('tab', { name: 'Production' }).click();
  await tab.getByRole('option', { name: /Speed module/ }).click();
  if (!(await attribute('events'))?.includes('select:speed')) {
    problems.push(`shell.html: clicking an item reported ${await attribute('events')}`);
  }

  await tab.getByRole('tab', { name: 'Modules' }).click();
  await tab.getByRole('switch', { name: 'Overclock' }).click();
  await tab.getByRole('button', { name: 'Apply' }).click();
  const submitted = await attribute('submitted');
  if (submitted !== JSON.stringify([['overclock', 'on']])) {
    problems.push(`shell.html: the form submitted ${submitted}`);
  }

  await tab.keyboard.press('Escape');
  if (!(await attribute('events'))?.includes('close:escape') || (await assembler.isVisible())) {
    problems.push('shell.html: Escape did not close the window');
  }
  if (messages.length > 0) problems.push(`shell.html logged: ${messages.join(' | ')}`);
  await tab.close();
}

// specs/testing.md §8: a production view from the registration entries, in the locales of
// `@dieselpunk/locales`, set from the consumer's own Lit Localize.
async function checkProduction(browser: Browser, port: number): Promise<void> {
  const tab = await browser.newPage();
  const messages = watchPage(tab);
  await tab.goto(`http://localhost:${port}/production.html`);
  await tab.waitForSelector('html[data-production="ready"]');
  // This script is type-checked without DOM types, so what runs in the page is a string.
  const read = async (): Promise<Record<string, string | null>> =>
    (await tab.evaluate(`(() => {
      const root = document.documentElement;
      const row = document.querySelector('punk-connection-row');
      const stat = document.querySelector('punk-production-stat');
      return {
        lang: root.lang,
        dir: root.dir,
        remove: row.shadowRoot.querySelector('[part="remove-button"]')?.getAttribute('aria-label') ?? null,
        value: stat.shadowRoot.querySelector('[part="value"]')?.textContent.trim() ?? null,
        formatted: new Intl.NumberFormat(root.lang).format(1234567.89),
        defined: ${JSON.stringify(allTags)}.filter((tag) => customElements.get(tag) !== undefined).sort().join(' '),
      };
    })()`)) as Record<string, string | null>;

  const german = await read();
  const expectedDefined = [
    'punk-connection-row',
    'punk-meter',
    'punk-production-stat',
    'punk-status-light',
    'punk-window',
  ].join(' ');
  if (german['defined'] !== expectedDefined) {
    problems.push(`production.html defines [${german['defined']}], expected [${expectedDefined}]`);
  }
  if (german['lang'] !== 'de' || german['dir'] !== 'ltr') {
    problems.push(
      `production.html: after setLocale('de') lang is ${german['lang']} and dir ${german['dir']}`,
    );
  }
  if (!german['remove']?.startsWith('Verbindung entfernen')) {
    problems.push(`production.html: the remove button is named ${german['remove']} in German`);
  }
  if (german['value'] !== german['formatted']) {
    problems.push(
      `production.html: the stat shows ${german['value']}, and German is ${german['formatted']}`,
    );
  }

  await tab.evaluate(`window.production.setLocale('ar')`);
  await tab.waitForFunction(`document.documentElement.lang === 'ar'`);
  const arabic = await read();
  if (arabic['dir'] !== 'rtl') problems.push(`production.html: dir is ${arabic['dir']} in Arabic`);
  if (arabic['remove'] === german['remove'] || !arabic['remove']?.includes('إزالة')) {
    problems.push(`production.html: the remove button is named ${arabic['remove']} in Arabic`);
  }
  if (arabic['value'] !== arabic['formatted']) {
    problems.push(
      `production.html: the stat shows ${arabic['value']}, and Arabic is ${arabic['formatted']}`,
    );
  }

  await tab.getByRole('button', { name: /^إزالة/ }).click();
  const removed = (await tab.evaluate(`document.documentElement.dataset.removed ?? null`)) as
    string | null;
  if (removed !== 'belt-1:punk-connection-row') {
    problems.push(`production.html: the remove button reported ${removed}`);
  }
  if (messages.length > 0) problems.push(`production.html logged: ${messages.join(' | ')}`);
  await tab.close();
}

async function checkPages(outDir: string): Promise<void> {
  const probe = await probeScript();
  const { server, port } = await serveStatic(outDir);
  const browser = await chromium.launch();
  try {
    await checkShell(browser, port);
    await checkProduction(browser, port);
    for (const page of ['plain', 'app']) {
      const tab = await browser.newPage();
      const messages = watchPage(tab);
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
        if (report.agree !== 'on' || report.speed !== '10') {
          problems.push(
            `app.html: the form submitted agree=${report.agree} and speed=${report.speed}`,
          );
        }
        if (report.callsign !== 'Echo' || report.thrust !== '5' || report.squadron !== 'b') {
          problems.push(
            `app.html: the fields submitted callsign=${report.callsign}, thrust=${report.thrust}, and squadron=${report.squadron}`,
          );
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

// The Integration guide's page without a build step: the installed packages served as they are,
// resolved by an import map.
async function checkImportMap(project: string): Promise<void> {
  cpSync(join(fixtureDir, 'import-map.html'), join(project, 'import-map.html'));
  const { server, port } = await serveStatic(project);
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage();
    const messages = watchPage(tab);
    await tab.goto(`http://localhost:${port}/import-map.html`);
    // The divider loads the warning module, so the page also needs the map's `#dev` entry.
    const expected = ['punk-button', 'punk-divider', 'punk-panel'];
    await tab
      .waitForFunction(
        `${JSON.stringify(expected)}.every((tag) => customElements.get(tag))`,
        undefined,
        { timeout: 5000 },
      )
      .catch(() => undefined);
    const report = (await tab.evaluate(`({
      defined: ${JSON.stringify(allTags)}.filter((tag) => customElements.get(tag) !== undefined),
      upgraded: Boolean(document.querySelector('punk-button')?.shadowRoot),
      canvas: getComputedStyle(document.documentElement).getPropertyValue('--punk-color-canvas').trim(),
    })`)) as { defined: string[]; upgraded: boolean; canvas: string };
    if (JSON.stringify(report.defined.sort()) !== JSON.stringify(expected)) {
      problems.push(`import-map.html defines [${report.defined}], expected [${expected}]`);
    }
    if (!report.upgraded) problems.push('import-map.html: the elements were not upgraded');
    if (!report.canvas) problems.push('import-map.html: tokens.css did not apply');
    if (messages.length > 0) problems.push(`import-map.html logged: ${messages.join(' | ')}`);
  } finally {
    await browser.close();
    server.close();
  }
}

// specs/ssr.md Verification: every tag rendered by Lit SSR under Node from the packed package, then
// upgraded in Chromium with and without Lit's hydration support.
async function checkServerRendering(core: string): Promise<void> {
  const project = join(work, 'ssr');
  installProject(project, {
    '@dieselpunk/core': `file:${core}`,
    '@lit-labs/ssr': LIT_SSR,
    '@lit-labs/ssr-client': LIT_SSR_CLIENT,
  });
  cpSync(join(fixtureDir, 'ssr'), join(project, 'ssr'), { recursive: true });
  const outDir = join(project, 'out');
  // The development condition also runs the warnings' code paths on the server.
  const output = run('node', ['--conditions=development', 'ssr/render.js', outDir], project);
  const report = JSON.parse(output.trim().split('\n').at(-1) ?? '{}') as {
    tags: number;
    problems: string[];
  };
  problems.push(...report.problems.map((problem) => `server: ${problem}`));
  console.log(`  rendered ${report.tags} tags on the server`);

  const built = await build({
    absWorkingDir: project,
    entryPoints: {
      'client-plain.bundle': join(outDir, 'client-plain.js'),
      'client-support.bundle': join(outDir, 'client-support.js'),
      'client-hydrate.bundle': join(outDir, 'client-hydrate.js'),
    },
    bundle: true,
    format: 'esm',
    outdir: outDir,
    metafile: true,
    logLevel: 'silent',
  });
  // The hydration support patches the LitElement it imports, which must be the components' own.
  const lits = new Set(
    Object.keys(built.metafile.inputs)
      .map((input) => /^(.*\/?node_modules\/lit-element\/)/.exec(input)?.[1])
      .filter((root): root is string => root !== undefined),
  );
  if (lits.size !== 1) problems.push(`server: the client bundles ${lits.size} copies of Lit`);
  cpSync(join(project, 'ssr/ssr-check.js'), join(outDir, 'ssr-check.js'));

  const { server, port } = await serveStatic(outDir);
  const browser = await chromium.launch();
  try {
    for (const name of ['plain', 'support', 'hydrate']) {
      const tab = await browser.newPage();
      const messages = watchPage(tab);
      await tab.goto(`http://localhost:${port}/${name}.html`);
      await tab.evaluate('window.markServerNodes()');
      await tab.locator('#typed input').fill('Ada');
      await tab.evaluate('window.upgrade()');
      const found = (await tab.evaluate(`window.checkUpgrade(${name === 'hydrate'})`)) as string[];
      problems.push(...found.map((problem) => `${name}.html: ${problem}`));
      if (messages.length > 0) problems.push(`${name}.html logged: ${messages.join(' | ')}`);
      await tab.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

try {
  const tarballs = { core: pack(packageDir, work), locales: pack(localesDir, work) };

  console.log('Rendering on a server and upgrading in a browser:');
  await checkServerRendering(tarballs.core);

  console.log('Type-checking the consumer:');
  const oldest = join(work, 'oldest');
  const newest = join(work, 'newest');
  install(oldest, tarballs, OLDEST_TYPESCRIPT);
  typecheck(oldest, `TypeScript ${OLDEST_TYPESCRIPT}`);
  install(newest, tarballs, NEWEST_TYPESCRIPT);
  typecheck(newest, `TypeScript ${NEWEST_TYPESCRIPT}`);

  console.log('Bundling and running the consumer in a browser:');
  const outDir = join(work, 'out');
  const built = await build({
    absWorkingDir: newest,
    entryPoints: {
      plain: 'src/plain.js',
      app: 'src/app.ts',
      shell: 'src/shell.ts',
      'shell-style': 'src/shell-style.js',
      production: 'src/production.ts',
    },
    bundle: true,
    format: 'esm',
    outdir: outDir,
    metafile: true,
    logLevel: 'silent',
  });
  // Lit Localize holds the active locale as module state, so a second copy would never hear
  // `setLocale`. The consumer, core, and the translations must all resolve one.
  const copies = new Set(
    Object.keys(built.metafile.inputs)
      .map((input) => /^(.*\/?node_modules\/@lit\/localize\/)/.exec(input)?.[1])
      .filter((root): root is string => root !== undefined),
  );
  if (copies.size !== 1) {
    problems.push(`The consumer bundles ${copies.size} copies of @lit/localize: ${[...copies]}`);
  }
  cpSync(join(fixtureDir, 'plain.html'), join(outDir, 'plain.html'));
  cpSync(join(fixtureDir, 'app.html'), join(outDir, 'app.html'));
  cpSync(join(fixtureDir, 'shell.html'), join(outDir, 'shell.html'));
  cpSync(join(fixtureDir, 'production.html'), join(outDir, 'production.html'));
  await checkPages(outDir);
  await checkImportMap(newest);
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
