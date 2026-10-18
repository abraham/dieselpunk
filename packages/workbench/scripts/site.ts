import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Adds the files the public site serves beside the Storybook build (specs/workbench.md §7):
// the manifest of the documented release, the social image, a sitemap of the docs pages, and robots.txt.
// Run after `npm run build`.

const origin = 'https://dieselpunk.dev';
const root = fileURLToPath(new URL('../dist', import.meta.url));
const index = join(root, 'index.json');
if (!existsSync(index)) {
  console.error('dist/index.json is missing. Run `npm run build` first.');
  process.exit(1);
}

copyFileSync(
  fileURLToPath(import.meta.resolve('@dieselpunk/core/custom-elements.json')),
  join(root, 'custom-elements.json'),
);
copyFileSync(
  fileURLToPath(new URL('../../../screenshot.png', import.meta.url)),
  join(root, 'screenshot.png'),
);

const { entries } = JSON.parse(readFileSync(index, 'utf8')) as {
  entries: Record<string, { id: string; type: 'story' | 'docs' }>;
};
const escape = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const urls = Object.values(entries)
  .filter((entry) => entry.type === 'docs')
  .map((entry) => `  <url><loc>${escape(`${origin}/?path=/docs/${entry.id}`)}</loc></url>`);
writeFileSync(
  join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);
writeFileSync(
  join(root, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
);

console.log(
  `Site files written: custom-elements.json, screenshot.png, sitemap.xml (${urls.length} pages), robots.txt.`,
);
