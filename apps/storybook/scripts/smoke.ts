import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Loads every story and docs page in the built workbench and fails on a render error or on any
// console warning or error. Run after `npm run build`. See SPEC-PHASE-1.md §12.8.

const root = fileURLToPath(new URL('../dist', import.meta.url));
if (!existsSync(join(root, 'index.json'))) {
  console.error('dist/index.json is missing. Run `npm run build` first.');
  process.exit(1);
}

interface Entry {
  id: string;
  type: 'story' | 'docs';
}
const { entries } = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')) as {
  entries: Record<string, Entry>;
};

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const server = createServer((request, response) => {
  const file = join(root, new URL(request.url ?? '/', 'http://localhost').pathname);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
}).listen(0);
const port = (server.address() as { port: number }).port;

// Lit announces dev mode once per page. The workbench builds with the development condition on
// purpose (so misuse warnings show), which makes this one expected.
const expected = [/Lit is in dev mode/];

const browser = await chromium.launch();
const failures: string[] = [];

async function openStory(id: string, width: number, height = 800) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`http://localhost:${port}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector('body.sb-show-main', { timeout: 15000 });
  await page.waitForTimeout(500);
  return page;
}

// Each framework guide shows its fixture app's source, which a failed `?raw` import would leave out.
async function checkFrameworkGuides(): Promise<void> {
  const guides = { react: 'createRoot', vue: 'createApp', svelte: 'mount(' };
  for (const [name, marker] of Object.entries(guides)) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    await page.goto(`http://localhost:${port}/iframe.html?id=guides-${name}--docs&viewMode=docs`);
    await page.waitForSelector('body.sb-show-main', { timeout: 15000 });
    await page.waitForTimeout(500);
    const text = String(
      await page.evaluate("document.querySelector('.sbdocs')?.textContent ?? ''"),
    );
    if (!text.includes(marker) || !text.includes('punk-text-field')) {
      failures.push(`guides-${name}--docs does not show the fixture app's code`);
    }
    await page.close();
  }
}

// The examples of the Responsive layouts guide must fit at 375px and at 187px, which is a 375px
// window at 200% zoom (WCAG 1.4.10). This runs in place of loading them in the gallery.
async function checkResponsiveExamples(): Promise<void> {
  const ids = Object.values(entries)
    .filter((entry) => entry.type === 'story' && entry.id.startsWith('guides-responsive-layouts--'))
    .map((entry) => entry.id);
  if (ids.length === 0) failures.push('the Responsive layouts examples are missing');
  for (const id of ids) {
    for (const width of [375, 187]) {
      const page = await openStory(id, width);
      const extra = Number(
        await page.evaluate(
          'document.documentElement.scrollWidth - document.documentElement.clientWidth',
        ),
      );
      if (extra > 1) failures.push(`${id} scrolls sideways by ${extra}px at ${width}px`);
      await page.close();
    }
  }
}

// The Application shell example works with the keyboard alone: tabs, a dialog that gives focus
// back, a menu, and the live form.
async function checkApplicationShell(): Promise<void> {
  const page = await openStory('overview--application-shell', 1100, 1000);
  const problems: string[] = [];
  // The host that has focus, since the focus inside a button is in its shadow tree.
  const active = async () =>
    String(await page.evaluate("(document.activeElement?.textContent ?? '').trim()")).trim();

  await page.getByRole('tab', { name: 'Production' }).focus();
  await page.keyboard.press('ArrowRight');
  const modules = await page.getByRole('tab', { name: 'Modules' }).getAttribute('aria-selected');
  if (modules !== 'true') problems.push(`an arrow key in the tabs left Modules ${modules}`);
  const shown = await page.locator('[id$="-production"]').isVisible();
  if (shown || !(await page.locator('[id$="-modules"]').isVisible())) {
    problems.push('the tabs left the Production panel showing, or the Modules panel hidden');
  }
  await page.keyboard.press('ArrowRight');
  const live = await page.locator('form output').textContent();
  if (!live?.includes('name = Assembler 03')) problems.push(`the live form shows "${live}"`);

  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  await stop.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: 'Discard the run?' });
  if (!(await dialog.isVisible())) problems.push('Enter on Stop did not open the dialog');
  await page.keyboard.press('Escape');
  if (await dialog.isVisible()) problems.push('Escape did not close the dialog');
  if ((await active()) !== 'Stop')
    problems.push(`focus returned to "${await active()}" after the dialog`);

  await page.getByRole('button', { name: 'Actions', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  if ((await active()) !== 'Copy recipe') problems.push(`the menu focused "${await active()}"`);
  await page.keyboard.press('Escape');
  if ((await active()) !== 'Actions')
    problems.push(`focus returned to "${await active()}" after the menu`);

  if (problems.length > 0) failures.push(`overview--application-shell: ${problems.join(' | ')}`);
  await page.close();
}

// SPEC-PHASE-4 §12: every example fits at 375px and at 187px, as the responsive ones do.
async function checkExamples(): Promise<void> {
  const ids = Object.values(entries)
    .filter((entry) => entry.type === 'story' && entry.id.startsWith('examples-'))
    .map((entry) => entry.id);
  if (ids.length !== 3) failures.push(`expected 3 examples, found ${ids.length}`);
  for (const id of ids) {
    for (const width of [375, 187]) {
      const page = await openStory(id, width, 900);
      const extra = Number(
        await page.evaluate(
          'document.documentElement.scrollWidth - document.documentElement.clientWidth',
        ),
      );
      if (extra > 1) failures.push(`${id} scrolls sideways by ${extra}px at ${width}px`);
      await page.close();
    }
  }
}

// The element that has focus, as its tag and `value`, through shadow roots.
const focused = `(() => {
  const host = document.activeElement;
  return host ? host.localName + ':' + (host.getAttribute('value') ?? host.id ?? '') : 'none';
})()`;

// The dashboard updates once a second, can be paused from a switch that is on screen, and never
// moves focus or announces (WCAG 2.2.2).
async function checkDashboard(): Promise<void> {
  const page = await openStory('examples-production-dashboard--production-dashboard', 1100, 1000);
  const problems: string[] = [];
  const ticks = async () =>
    Number(await page.evaluate("document.querySelector('[data-ticks]')?.dataset.ticks ?? '-1'"));
  const paused = page.getByText('Pause updates');
  if (!(await paused.isVisible())) problems.push('Pause updates is not on screen');
  const toggle = page.locator('punk-switch');
  await toggle.focus();
  const before = await ticks();
  await page.waitForTimeout(2500);
  const running = (await ticks()) - before;
  if (running < 2) problems.push(`only ${running} updates in 2.5 seconds`);
  if (!String(await page.evaluate(focused)).startsWith('punk-switch')) {
    problems.push(`an update moved focus to ${await page.evaluate(focused)}`);
  }
  const announcing = Number(
    await page.evaluate(
      "document.querySelectorAll('punk-production-stat[announce], punk-production-stat[role], [aria-live]').length",
    ),
  );
  if (announcing > 0) problems.push(`${announcing} elements announce`);
  const first = String(
    await page.evaluate("document.querySelector('punk-production-stat').shadowRoot.textContent"),
  );

  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const stopped = await ticks();
  await page.waitForTimeout(2500);
  if ((await ticks()) !== stopped) problems.push('Pause updates did not stop the timer');
  if ((await page.evaluate("document.querySelector('[data-ticks]').dataset.paused")) !== 'true') {
    problems.push('the story does not say that it is paused');
  }
  await page.keyboard.press('Space');
  await page.waitForTimeout(2500);
  if ((await ticks()) <= stopped) problems.push('turning Pause updates off did not resume');
  if (first === '') problems.push('the first stat has no text');
  if (problems.length > 0) failures.push(`examples-production-dashboard: ${problems.join(' | ')}`);
  await page.close();
}

// Removing a connection asks first, moves focus to the next row's button, or to the heading after
// the last row, and offers Undo.
async function checkLogistics(): Promise<void> {
  const page = await openStory('examples-logistics-network--logistics-network', 1100, 1200);
  const problems: string[] = [];
  const rows = () => page.locator('punk-connection-row');
  const first = Number(await rows().count());
  if (first !== 12) problems.push(`${first} rows, expected 12`);
  const settle = () => page.waitForTimeout(400);

  await rows().first().locator('[part="remove-button"]').click();
  const dialog = page.getByRole('alertdialog', { name: 'Remove this connection?' });
  if (!(await dialog.isVisible())) problems.push('a removal did not ask first');
  await page.keyboard.press('Escape');
  await settle();
  if ((await rows().count()) !== 12) problems.push('Escape removed the row');

  await rows().first().locator('[part="remove-button"]').click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await settle();
  if ((await rows().count()) !== 11) problems.push('Remove did not remove the row');
  if (String(await page.evaluate(focused)) !== 'punk-connection-row:c2') {
    problems.push(`after a removal focus is on ${await page.evaluate(focused)}, not the next row`);
  }
  await page.getByRole('button', { name: 'Undo' }).click();
  await settle();
  if ((await rows().count()) !== 12) problems.push('Undo did not put the row back');
  if (String(await page.evaluate(focused)) !== 'punk-connection-row:c1') {
    problems.push(`after Undo focus is on ${await page.evaluate(focused)}`);
  }

  // Filtered to the blocked rows, removing the last one sends focus to the heading.
  await page.locator('punk-select select').selectOption('blocked');
  await settle();
  if ((await rows().count()) !== 2)
    problems.push(`${await rows().count()} blocked rows, expected 2`);
  await rows().last().locator('[part="remove-button"]').click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await settle();
  if (String(await page.evaluate(focused)) !== 'h3:network-heading') {
    problems.push(
      `after the last row focus is on ${await page.evaluate(focused)}, not the heading`,
    );
  }
  if (problems.length > 0) failures.push(`examples-logistics-network: ${problems.join(' | ')}`);
  await page.close();
}

// A language from the select changes the words, `lang`, and `dir` of the page.
async function checkInterfaceSettings(): Promise<void> {
  const page = await openStory('examples-interface-settings--interface-settings', 1100, 1000);
  const problems: string[] = [];
  const root = (name: string) => page.evaluate(`document.documentElement.${name}`);
  const name = () =>
    page.evaluate(
      "document.querySelector('punk-connection-row').shadowRoot.querySelector('[part=\"remove-button\"]').getAttribute('aria-label')",
    );
  const english = await name();
  if (english !== 'Remove connection: Iron smelter, Assembler')
    problems.push(`English name "${english}"`);
  const language = page.locator('punk-select').first().locator('select');
  for (const [code, dir] of [
    ['ar', 'rtl'],
    ['de', 'ltr'],
    ['ja', 'ltr'],
    ['fr', 'ltr'],
    ['es', 'ltr'],
    ['en', 'ltr'],
  ]) {
    await language.selectOption(code as string);
    await page.waitForFunction(`document.documentElement.lang === '${code}'`, undefined, {
      timeout: 5000,
    });
    await page.waitForTimeout(200);
    if ((await root('dir')) !== dir) problems.push(`${code}: dir is ${await root('dir')}`);
    const label = await name();
    if (code === 'en' ? label !== english : label === english)
      problems.push(`${code}: the button is named "${label}"`);
  }
  if (problems.length > 0) failures.push(`examples-interface-settings: ${problems.join(' | ')}`);
  await page.close();
}

// The Localization guide lists every message of the XLIFF, with its English and description.
async function checkLocalizationGuide(): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  await page.goto(
    `http://localhost:${port}/iframe.html?id=guides-localization--docs&viewMode=docs`,
  );
  await page.waitForSelector('body.sb-show-main', { timeout: 15000 });
  await page.waitForTimeout(500);
  const rows = Number(
    await page.evaluate("document.querySelectorAll('.sbdocs table tbody tr').length"),
  );
  const text = String(await page.evaluate("document.querySelector('.sbdocs')?.textContent ?? ''"));
  if (rows < 26)
    failures.push(`guides-localization--docs lists ${rows} messages, expected at least 26`);
  for (const id of ['removeConnection', 'statNoValue', 'connectionBoth']) {
    if (!text.includes(id)) failures.push(`guides-localization--docs does not list ${id}`);
  }
  await page.close();
}

try {
  for (const entry of Object.values(entries)) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const messages: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (
        ['error', 'warning'].includes(message.type()) &&
        !expected.some((rule) => rule.test(text))
      ) {
        messages.push(`${message.type()}: ${text.slice(0, 200)}`);
      }
    });
    page.on('pageerror', (error) => messages.push(`pageerror: ${error.message.slice(0, 200)}`));
    const view = entry.type === 'docs' ? 'docs' : 'story';
    await page.goto(`http://localhost:${port}/iframe.html?id=${entry.id}&viewMode=${view}`);
    // Storybook sets this class on <body> when a story fails to render.
    await page.waitForSelector('body.sb-show-main, body.sb-show-errordisplay', { timeout: 15000 });
    await page.waitForTimeout(500);
    const error = await page.evaluate(
      `document.body.classList.contains('sb-show-errordisplay')
        ? document.querySelector('#error-message')?.textContent ?? 'render error'
        : ''`,
    );
    if (error) messages.unshift(`render error: ${String(error).slice(0, 200)}`);
    if (messages.length > 0) failures.push(`${entry.id} (${entry.type}): ${messages.join(' | ')}`);
    await page.close();
  }
  await checkResponsiveExamples();
  await checkApplicationShell();
  await checkExamples();
  await checkDashboard();
  await checkLogistics();
  await checkInterfaceSettings();
  await checkLocalizationGuide();
  await checkFrameworkGuides();
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error(
    `Story smoke test failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(`Story smoke test OK: ${Object.keys(entries).length} entries rendered without errors`);
