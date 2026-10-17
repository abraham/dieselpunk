import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

// A static file server for built pages: the visual matrix, the consumer and framework pages, and
// the workbench. Plain Node only, so it also runs inside the Playwright image.

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Serves the files under `root`, and `index.html` for a folder. Port 0 picks a free port. */
export async function serveStatic(
  root: string,
  port = 0,
): Promise<{ server: Server; port: number }> {
  const base = resolve(root);
  const server = createServer((request, response) => {
    let file: string;
    try {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      file = join(base, decodeURIComponent(path));
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (file !== base && !file.startsWith(base + sep)) {
      response.writeHead(404).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(port, done));
  return { server, port: (server.address() as { port: number }).port };
}
