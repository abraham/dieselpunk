import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { serveStatic } from '@dieselpunk/testing/server';
import { categoryTags } from '../src/lib/categories.ts';
import { reflowWidths } from '../src/lib/viewports.ts';

// Loads every story and docs page in the built workbench and fails on a render error or on any
// console warning or error. Run after `npm run build`. See specs/workbench.md §5.
// PUNK_SMOKE_PART=<n>/<total> checks every total-th entry, from the n-th; the real-input steps run
// in the first part only (specs/ci.md §5.4).

const partSpec = process.env['PUNK_SMOKE_PART'] ?? '1/1';
const partMatch = /^(\d+)\/(\d+)$/.exec(partSpec);
const part = Number(partMatch?.[1]);
const parts = Number(partMatch?.[2]);
if (!partMatch || part < 1 || part > parts) {
  console.error(`PUNK_SMOKE_PART must be <n>/<total>, with n from 1 to total; got "${partSpec}".`);
  process.exit(2);
}

const root = fileURLToPath(new URL('../dist', import.meta.url));
if (!existsSync(join(root, 'index.json'))) {
  console.error('dist/index.json is missing. Run `npm run build` first.');
  process.exit(1);
}

interface Entry {
  id: string;
  type: 'story' | 'docs';
  tags?: string[];
}
const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')) as {
  entries: Record<string, Entry>;
};
// The interaction stories run their flows under `test:stories` (specs/workbench.md §5).
const entries = Object.fromEntries(
  Object.entries(index.entries).filter(([, entry]) => !entry.tags?.includes('flow')),
);

const { server, port } = await serveStatic(root);

// Lit announces dev mode once per page. The workbench builds with the development condition on
// purpose (so misuse warnings show), which makes this one expected.
const expected = [/Lit is in dev mode/];

const browser = await chromium.launch();
const failures: string[] = [];

// Records Storybook's render events as the preview's channel is installed, so none is missed.
const renderSignal = `(() => {
  const state = (window.__punkSmoke = { done: false, error: '' });
  const describe = (value) =>
    String(value?.message ?? value?.description ?? value?.title ?? value ?? 'render error');
  let channel;
  Object.defineProperty(globalThis, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => channel,
    set(next) {
      channel = next;
      if (!next) return;
      for (const name of ['storyRendered', 'docsRendered']) {
        next.on(name, () => (state.done = true));
      }
      for (const name of ['storyErrored', 'storyThrewException', 'storyMissing']) {
        next.on(name, (value) => Object.assign(state, { done: true, error: describe(value) }));
      }
    },
  });
})()`;

async function load(page: Page, id: string, view: 'story' | 'docs'): Promise<string> {
  await page.goto(`http://localhost:${port}/iframe.html?id=${id}&viewMode=${view}`);
  await page.waitForFunction('window.__punkSmoke?.done', undefined, { timeout: 15000 });
  // Two frames let the components finish the updates the render started.
  await page.evaluate(
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
  );
  // Storybook sets this class on <body> when a story fails to render.
  return String(
    await page.evaluate(
      `window.__punkSmoke.error ||
        (document.body.classList.contains('sb-show-errordisplay')
          ? document.querySelector('#error-message')?.textContent ?? 'render error'
          : '')`,
    ),
  );
}

async function open(id: string, view: 'story' | 'docs', width: number, height = 800) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(renderSignal);
  const error = await load(page, id, view);
  if (error) failures.push(`${id}: render error: ${error.slice(0, 200)}`);
  return page;
}

const openStory = (id: string, width: number, height = 800) => open(id, 'story', width, height);
const openDocs = (id: string) => open(id, 'docs', 1100);

/** Renders one entry and fails on a render error or an unexpected console message. */
async function checkEntry(entry: Entry): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  await page.addInitScript(renderSignal);
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
  try {
    const error = await load(page, entry.id, entry.type === 'docs' ? 'docs' : 'story');
    if (error) messages.unshift(`render error: ${error.slice(0, 200)}`);
    // A pipe table whose rows do not match its header renders as a paragraph of pipes.
    const brokenTable =
      entry.type === 'docs' &&
      (await page.evaluate(
        "[...document.querySelectorAll('.sbdocs p')].some((p) => /\\|\\s*:?-{3,}:?\\s*\\|/.test(p.textContent ?? ''))",
      ));
    if (brokenTable) messages.push('a Markdown table renders as text');
  } catch (error) {
    messages.unshift(`did not render: ${String(error).split('\n')[0]}`);
  }
  if (messages.length > 0) failures.push(`${entry.id} (${entry.type}): ${messages.join(' | ')}`);
  await page.close();
}

// Each framework guide, and the Integration guide's page without a build step, shows its fixture's
// source, which a failed `?raw` import would leave out.
async function checkFrameworkGuides(): Promise<void> {
  const guides = {
    react: 'createRoot',
    vue: 'createApp',
    svelte: 'mount(',
    integration: 'importmap',
  };
  for (const [name, marker] of Object.entries(guides)) {
    const page = await openDocs(`guides-${name}--docs`);
    // The code blocks are highlighted after the docs report they rendered.
    const shown = await page
      .waitForFunction(
        `['${marker}', 'punk-text-field'].every((word) =>
          document.querySelector('.sbdocs')?.textContent?.includes(word))`,
        undefined,
        { timeout: 5000 },
      )
      .then(
        () => true,
        () => false,
      );
    if (!shown) failures.push(`guides-${name}--docs does not show its fixture's code`);
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
    for (const width of reflowWidths) {
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

// Escape closes the Stop dialog and the Actions menu, and focus goes back to the button that opened
// each. These need real keys; the rest of the flow is an interaction story (specs/workbench.md §5).
async function checkApplicationShell(): Promise<void> {
  const page = await openStory('overview--application-shell', 1100, 1000);
  const problems: string[] = [];
  // The host that has focus, since the focus inside a button is in its shadow tree.
  const active = async () =>
    String(await page.evaluate("(document.activeElement?.textContent ?? '').trim()")).trim();

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

// specs/workbench.md §5: every example, and the overview, fits at 375px and at 187px, as the responsive
// ones do.
async function checkExamples(): Promise<void> {
  const stories = (prefix: string) =>
    Object.values(entries)
      .filter((entry) => entry.type === 'story' && entry.id.startsWith(prefix))
      .map((entry) => entry.id);
  const examples = stories('examples-');
  if (examples.length !== 3) failures.push(`expected 3 examples, found ${examples.length}`);
  // The two overview stories are the first screen, and are held to the same widths.
  for (const id of [...examples, ...stories('overview--')]) {
    for (const width of reflowWidths) {
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

// Escape on the removal dialog keeps the row and gives focus back to its remove button. The rest of
// the flow is an interaction story (specs/workbench.md §5).
async function checkLogistics(): Promise<void> {
  const page = await openStory('examples-logistics-network--logistics-network', 1100, 1200);
  const problems: string[] = [];
  const rows = () => page.locator('punk-connection-row');

  await rows().first().locator('[part="remove-button"]').click();
  const dialog = page.getByRole('alertdialog', { name: 'Remove this connection?' });
  if (!(await dialog.isVisible())) problems.push('a removal did not ask first');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (await dialog.isVisible()) problems.push('Escape did not close the dialog');
  if ((await rows().count()) !== 12) problems.push('Escape removed the row');
  if (String(await page.evaluate(focused)) !== 'punk-connection-row:c1') {
    problems.push(`after Escape focus is on ${await page.evaluate(focused)}, not the row`);
  }
  if (problems.length > 0) failures.push(`examples-logistics-network: ${problems.join(' | ')}`);
  await page.close();
}

// The Language toolbar's locale is in place before a story renders: lang, dir, and the words.
async function checkLanguageToolbar(): Promise<void> {
  const id = 'examples-interface-settings--interface-settings';
  const page = await openStory(`${id}&globals=locale:ar`, 1100, 1000);
  const shown = await page.evaluate(`(() => {
    const row = document.querySelector('punk-connection-row');
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      readout: document.querySelector('[data-readout]')?.textContent,
      chosen: document.querySelector('punk-select')?.value,
      name: row?.shadowRoot?.querySelector('[part="remove-button"]')?.getAttribute('aria-label'),
    };
  })()`);
  const { lang, dir, readout, chosen, name } = shown as Record<string, string | undefined>;
  const problems: string[] = [];
  if (lang !== 'ar' || dir !== 'rtl') problems.push(`the page is lang=${lang} dir=${dir}`);
  if (!readout?.includes('lang="ar"')) problems.push(`the readout shows ${readout}`);
  if (chosen !== 'ar') problems.push(`the language select shows ${chosen}`);
  if (!name || name.startsWith('Remove connection')) problems.push(`the button is named "${name}"`);
  if (problems.length > 0) failures.push(`${id} in Arabic: ${problems.join(' | ')}`);
  await page.close();
}

// The Localization guide lists every message of the XLIFF, with its English and description.
async function checkScreenReaderChecklist(): Promise<void> {
  const page = await openDocs('guides-screen-reader-checklist--docs');
  const text = String(await page.evaluate("document.querySelector('.sbdocs')?.textContent ?? ''"));
  const results = Number(
    await page.evaluate(
      "document.querySelectorAll('.sbdocs table')[0]?.querySelectorAll('tbody tr').length ?? 0",
    ),
  );
  if (results !== 8)
    failures.push(`guides-screen-reader-checklist--docs has ${results} result rows, expected 8`);
  for (const name of ['NVDA', 'VoiceOver', 'TalkBack', 'Run record']) {
    if (!text.includes(name))
      failures.push(`guides-screen-reader-checklist--docs does not mention ${name}`);
  }
  await page.close();
}

async function checkLocalizationGuide(): Promise<void> {
  const page = await openDocs('guides-localization--docs');
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

// Markdown tables need GitHub-flavored Markdown in the MDX compiler; without it they render as text.
async function checkMarkdownTables(): Promise<void> {
  for (const name of ['forms', 'integration', 'performance', 'accessibility-and-layout']) {
    const page = await openDocs(`guides-${name}--docs`);
    const tables = Number(await page.evaluate("document.querySelectorAll('.sbdocs table').length"));
    if (tables === 0) failures.push(`guides-${name}--docs renders its Markdown tables as text`);
    await page.close();
  }
}

// Each component page is in exactly one sidebar category (specs/workbench.md §3).
function checkCategoryTags(): void {
  const known = new Set<string>(categoryTags);
  for (const entry of Object.values(entries)) {
    if (!entry.id.startsWith('components-')) continue;
    const tags = (entry.tags ?? []).filter((tag) => known.has(tag));
    if (tags.length !== 1) failures.push(`${entry.id} has category tags [${tags.join(', ')}]`);
  }
}

// Sorted, so that a part is the same set of entries on every run.
const mine = Object.values(entries)
  .sort((a, b) => a.id.localeCompare(b.id))
  .filter((_, index) => index % parts === part - 1);
const pool = 4;

try {
  const queue = [...mine];
  await Promise.all(
    Array.from({ length: pool }, async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) await checkEntry(entry);
    }),
  );
  // The real-input steps drive focus, so they run one at a time, after the pool.
  if (part === 1) {
    await checkResponsiveExamples();
    await checkApplicationShell();
    await checkExamples();
    await checkLogistics();
    await checkLanguageToolbar();
    checkCategoryTags();
    await checkLocalizationGuide();
    await checkScreenReaderChecklist();
    await checkFrameworkGuides();
    await checkMarkdownTables();
  }
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
console.log(
  `Story smoke test OK: ${mine.length} of ${Object.keys(entries).length} entries rendered without errors` +
    (parts > 1 ? ` (part ${part} of ${parts})` : ''),
);
