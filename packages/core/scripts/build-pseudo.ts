import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseXliff } from '../../locales/scripts/xliff.ts';
import { LOCALE, pseudoXliff } from './pseudo.ts';

// Writes the pseudo-locale XLIFF from the source units of the locales package, and runs
// `lit-localize build` on it into test/browser/fixtures/generated/, which is not committed.
// specs/localization.md, Verification.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const outputDir = join(packageDir, 'test/browser/fixtures/generated');
const sourceXliff = join(packageDir, '../locales/xliff/de.xlf');
const tool = fileURLToPath(import.meta.resolve('@lit/localize-tools/bin/lit-localize.js'));

const units = parseXliff(readFileSync(sourceXliff, 'utf8')).units;
if (units.length === 0) throw new Error(`${sourceXliff} has no messages`);

const work = mkdtempSync(join(tmpdir(), 'punk-pseudo-'));
try {
  writeFileSync(join(work, `${LOCALE}.xlf`), pseudoXliff(units));
  writeFileSync(
    join(work, 'lit-localize.json'),
    JSON.stringify({
      sourceLocale: 'en',
      targetLocales: [LOCALE],
      tsConfig: join(packageDir, 'tsconfig.build.json'),
      output: {
        mode: 'runtime',
        outputDir,
        localeCodesModule: join(outputDir, 'locale-codes.ts'),
      },
      interchange: { format: 'xliff', xliffDir: work },
    }),
  );
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  const run = spawnSync(
    process.execPath,
    [tool, 'build', '--config', join(work, 'lit-localize.json')],
    {
      encoding: 'utf8',
    },
  );
  if (run.status !== 0) {
    console.error(`lit-localize build failed:\n${run.stdout}${run.stderr}`);
    process.exit(1);
  }
  console.log(
    `Pseudo-locale ${LOCALE}: ${units.length} messages in test/browser/fixtures/generated/`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
