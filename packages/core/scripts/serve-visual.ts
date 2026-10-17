import { fileURLToPath } from 'node:url';
import { serveStatic } from '@dieselpunk/testing/server';

// Serves the output of build-visual.ts for playwright.config.ts, inside the Playwright image too.

const root = fileURLToPath(new URL('../test-results/visual-site', import.meta.url));
const { port } = await serveStatic(root, Number(process.argv[2] ?? 4173));
console.log(`Serving the visual matrix on http://localhost:${port}`);
