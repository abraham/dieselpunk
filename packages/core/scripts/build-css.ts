import { mkdir, writeFile } from 'node:fs/promises';
import { renderSurfacesCss, renderThemesCss, renderTokensCss } from './render-css.ts';

/** `outDir` must be a directory URL (trailing slash). */
export async function buildCss(outDir: URL): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(new URL('tokens.css', outDir), renderTokensCss());
  await writeFile(new URL('themes.css', outDir), renderThemesCss());
  await writeFile(new URL('surfaces.css', outDir), renderSurfacesCss());
}

if (import.meta.main) {
  const outDir = new URL('../dist/css/', import.meta.url);
  await buildCss(outDir);
  console.log(`Wrote tokens.css, themes.css, and surfaces.css to ${outDir.pathname}`);
}
