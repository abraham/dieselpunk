import { mkdir, writeFile } from 'node:fs/promises';
import { renderThemesCss, renderTokensCss } from './render-css.ts';

/** `outDir` must be a directory URL (trailing slash). */
export async function buildCss(outDir: URL): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(new URL('tokens.css', outDir), renderTokensCss());
  await writeFile(new URL('themes.css', outDir), renderThemesCss());
}

if (import.meta.main) {
  const outDir = new URL('../dist/css/', import.meta.url);
  await buildCss(outDir);
  console.log(`Wrote tokens.css and themes.css to ${outDir.pathname}`);
}
