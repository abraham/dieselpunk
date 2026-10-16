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
