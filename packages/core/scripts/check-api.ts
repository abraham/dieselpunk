import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describeApi, diffApi, isSame } from './api-snapshot.ts';
import type { ApiSnapshot, Manifest } from './api-snapshot.ts';

/**
 * Compares the public API, as the Custom Elements Manifest and the package's `exports` describe it,
 * with `api.snapshot.json`. Removing or renaming a documented name is a breaking change (SPEC §16),
 * so any difference fails and shows up as a reviewed edit of the snapshot: `--update` writes it.
 */
const root = new URL('../', import.meta.url);
const snapshotPath = new URL('api.snapshot.json', root);
const manifestPath = new URL('custom-elements.json', root);

if (!existsSync(manifestPath)) {
  console.error('check:api needs custom-elements.json: run `npm run build` first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {
  exports: Record<string, unknown>;
};
const current = describeApi(manifest, Object.keys(pkg.exports));
const text = `${JSON.stringify(current, null, 2)}\n`;

if (process.argv.includes('--update')) {
  writeFileSync(snapshotPath, text);
  console.log(`Wrote api.snapshot.json: ${Object.keys(current.elements).length} elements`);
  process.exit(0);
}

if (!existsSync(snapshotPath)) {
  console.error('There is no api.snapshot.json: run `npm run check:api -- --update`.');
  process.exit(1);
}

const committed = JSON.parse(readFileSync(snapshotPath, 'utf8')) as ApiSnapshot;
const difference = diffApi(committed, current);
if (!isSame(difference)) {
  const section = (title: string, lines: string[]) =>
    lines.length > 0 ? `${title}:\n${lines.map((line) => `  ${line}`).join('\n')}\n` : '';
  console.error(
    `The public API changed.\n${section('Removed (a breaking change under SPEC §16)', difference.removed)}` +
      `${section('Changed', difference.changed)}${section('Added', difference.added)}` +
      'If it is intended, run `npm run check:api -- --update` and commit api.snapshot.json.',
  );
  process.exit(1);
}
console.log(`API OK: ${Object.keys(current.elements).length} elements match api.snapshot.json`);
