import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serves the output of build-visual.ts. Plain Node only, so it also runs inside the Playwright image.

const root = fileURLToPath(new URL('../test-results/visual-site', import.meta.url));
const port = Number(process.argv[2] ?? 4173);
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const file = join(root, new URL(request.url ?? '/', 'http://localhost').pathname);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
}).listen(port, () => console.log(`Serving the visual matrix on http://localhost:${port}`));
