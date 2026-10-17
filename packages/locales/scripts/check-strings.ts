import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { messageCallProblems } from './source-check.ts';
import { parseXliff } from '@dieselpunk/testing/xliff';
import { messageProblems } from './messages.ts';

/**
 * Runs `lit-localize extract` and fails if it would change any committed XLIFF file, or if a
 * message has no explicit id or no description. The files are put back as they were, so the check
 * changes nothing; `npm run extract` is what updates them.
 */
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const coreSrc = fileURLToPath(new URL('../../core/src/', import.meta.url));
const xliffDir = `${packageRoot}xliff/`;
const tool = fileURLToPath(import.meta.resolve('@lit/localize-tools/bin/lit-localize.js'));

const read = (): Map<string, string> =>
  new Map(
    existsSync(xliffDir)
      ? readdirSync(xliffDir).map((name) => [name, readFileSync(`${xliffDir}${name}`, 'utf8')])
      : [],
  );

const before = read();
const run = spawnSync(process.execPath, [tool, 'extract'], { cwd: packageRoot, encoding: 'utf8' });
const after = read();

const stale: string[] = [];
for (const name of new Set([...before.keys(), ...after.keys()])) {
  if (before.get(name) !== after.get(name)) stale.push(name);
}

// Leave the files as they were found.
for (const name of after.keys()) if (!before.has(name)) rmSync(`${xliffDir}${name}`);
for (const [name, text] of before) writeFileSync(`${xliffDir}${name}`, text);

const sources = readdirSync(coreSrc, { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => ({ path: `core/src/${name}`, text: readFileSync(`${coreSrc}${name}`, 'utf8') }));

const problems: string[] = messageCallProblems(sources);
if (run.status !== 0) problems.push(`lit-localize extract failed:\n${run.stdout}${run.stderr}`);
if (stale.length > 0) {
  problems.push(
    `The XLIFF is out of date (${stale.join(', ')}). Run \`npm run extract\` in packages/locales.`,
  );
}
const source = [...after.values()][0];
const units = source === undefined ? [] : parseXliff(source).units;
if (units.length === 0) problems.push('There are no messages: is the XLIFF missing?');
problems.push(...messageProblems(units));

if (problems.length > 0) {
  console.error(`check:strings failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Strings OK: ${units.length} messages, XLIFF up to date`);
