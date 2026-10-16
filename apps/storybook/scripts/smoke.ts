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
