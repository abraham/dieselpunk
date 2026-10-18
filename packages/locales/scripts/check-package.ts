import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Checks the built package the way a consumer meets it: through `exports`, `sideEffects`, and a
// bundler (specs/localization.md §5). Run after `npm run build`.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const repoDir = fileURLToPath(new URL('../../..', import.meta.url));
const name = '@dieselpunk/locales';

interface PackageJson {
  license: unknown;
  sideEffects: unknown;
  exports: Record<string, { types: string; default: string }>;
}
const pkg = JSON.parse(readFileSync(`${packageDir}package.json`, 'utf8')) as PackageJson;
const config = JSON.parse(readFileSync(`${packageDir}lit-localize.json`, 'utf8')) as {
  targetLocales: string[];
};

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

if (!existsSync(`${packageDir}dist`)) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// npm packs only this folder, so it carries a copy of the repository's license (specs/package-contract.md §10).
if (pkg.license !== 'MIT') fail('"license" must be "MIT"');
const license = `${packageDir}LICENSE`;
if (
  !existsSync(license) ||
  readFileSync(license, 'utf8') !== readFileSync(`${repoDir}LICENSE`, 'utf8')
) {
  fail('LICENSE must be a copy of the repository LICENSE');
}

// 1. Nothing here has an effect when it is imported.
if (pkg.sideEffects !== false) fail('"sideEffects" must be false');

// 2. One entry for each language, the loader, and `document`, and each file is there.
const wanted = ['.', './document', ...config.targetLocales.map((code) => `./${code}`)];
for (const key of wanted) if (!(key in pkg.exports)) fail(`exports has no "${key}"`);
for (const key of Object.keys(pkg.exports)) {
  if (!wanted.includes(key)) fail(`exports has "${key}", which is not an entry of §9.1`);
  for (const target of Object.values(pkg.exports[key] ?? {})) {
    if (!existsSync(`${packageDir}${target}`)) fail(`${key} points at ${target}, which is missing`);
  }
}

// 3. No file registers an element or reaches past Lit Localize, and the entries import nothing else.
const files = readdirSync(`${packageDir}dist`, { recursive: true, encoding: 'utf8' }).filter(
  (file) => file.endsWith('.js'),
);
for (const file of files) {
  const source = readFileSync(`${packageDir}dist/${file}`, 'utf8');
  if (/customElements\.define|register-element/.test(source))
    fail(`dist/${file} registers an element`);
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const specifier = match[1] as string;
    if (!specifier.startsWith('.') && specifier !== '@lit/localize') {
      fail(`dist/${file} imports "${specifier}"`);
    }
  }
}

// 4. A bundler splits the languages, and each entry brings only what it names.
const sentinels: Record<string, string> = {
  de: 'Verbindung entfernen',
  fr: 'Supprimer la connexion',
  es: 'Quitar conexión',
  ja: '接続を削除',
  ar: 'إزالة الاتصال',
};

async function bundle(code: string): Promise<Array<{ path: string; text: string }>> {
  try {
    const result = await build({
      stdin: { contents: code, resolveDir: repoDir, loader: 'js' },
      bundle: true,
      write: false,
      splitting: true,
      format: 'esm',
      outdir: 'out',
      charset: 'utf8',
      external: ['@lit/localize'],
      conditions: ['browser'],
      logLevel: 'silent',
    });
    return result.outputFiles.map((file) => ({ path: file.path, text: file.text }));
  } catch (error) {
    fail(`Bundling \`${code}\` failed: ${(error as Error).message.split('\n')[0]}`);
    return [];
  }
}

const loader = await bundle(`import { loadLocale } from '${name}'; console.log(loadLocale);`);
const entry = loader.find((file) => /stdin/.test(file.path)) ?? loader[0];
if (loader.length < config.targetLocales.length + 1) {
  fail(`A bundle of the loader has ${loader.length} files, and each language should have its own`);
}
for (const [code, sentinel] of Object.entries(sentinels)) {
  if (entry?.text.includes(sentinel))
    fail(`The loader's entry chunk holds the ${code} translations`);
  if (!loader.some((file) => file !== entry && file.text.includes(sentinel))) {
    fail(`No chunk of the loader holds the ${code} translations`);
  }
}

for (const [code, sentinel] of Object.entries(sentinels)) {
  const output = (
    await bundle(`import { templates } from '${name}/${code}'; console.log(templates);`)
  )
    .map((file) => file.text)
    .join('\n');
  if (!output.includes(sentinel)) fail(`A bundle of ${code} is missing its translations`);
  for (const [other, text] of Object.entries(sentinels)) {
    if (other !== code && output.includes(text)) fail(`A bundle of ${code} holds ${other}`);
  }
}

const document = (
  await bundle(
    `import { bindDocumentLocale } from '${name}/document'; console.log(bindDocumentLocale);`,
  )
)
  .map((file) => file.text)
  .join('\n');
for (const [code, sentinel] of Object.entries(sentinels)) {
  if (document.includes(sentinel)) fail(`A bundle of document holds ${code}`);
}
if (/loadLocale|mergeLocaleModules/.test(document)) fail('A bundle of document holds the loader');

if (problems.length > 0) {
  console.error(`Package check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `Package OK: ${wanted.length} entries, ${files.length} files, exports and splitting verified`,
);
