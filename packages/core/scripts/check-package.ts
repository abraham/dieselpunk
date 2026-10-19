import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Checks the built package the way a consumer meets it: through `exports`, `sideEffects`, and a bundler.
// Run after `npm run build`. Rules are in specs/package-contract.md §1 and §2.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const repoDir = fileURLToPath(new URL('../../..', import.meta.url));
const distDir = `${packageDir}dist`;
const name = '@dieselpunk/core';

interface PackageJson {
  license: unknown;
  publishConfig?: { access?: unknown };
  sideEffects: string[];
  exports: Record<string, unknown>;
}
const pkg = JSON.parse(readFileSync(`${packageDir}package.json`, 'utf8')) as PackageJson;

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

if (!existsSync(distDir)) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// npm packs only this folder, so it carries a copy of the repository's license (specs/package-contract.md §10).
if (pkg.license !== 'MIT') fail('"license" must be "MIT"');
// A scoped package is private unless it says otherwise.
if (pkg.publishConfig?.access !== 'public') fail('"publishConfig.access" must be "public"');
const license = `${packageDir}LICENSE`;
if (
  !existsSync(license) ||
  readFileSync(license, 'utf8') !== readFileSync(`${repoDir}LICENSE`, 'utf8')
) {
  fail('LICENSE must be a copy of the repository LICENSE');
}

const components = readdirSync(`${distDir}/components`, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// A string only this component's code contains, so a bundle that has it contains the component.
const sentinels: Record<string, string> = {
  panel: '--punk-panel-padding',
  divider: '--punk-divider-gap',
  button: 'icon-start',
  'icon-button': 'tooltip-placement',
  'progress-bar': '--punk-progress-height',
  tooltip: '--punk-tooltip-offset',
  slot: '"punk-slot"',
  'item-stack': 'durability-fill',
  'slot-grid': '--punk-slot-gap',
  recipe: 'can craft ',
  'production-stat': '--punk-stat-value-min',
  'connection-row': 'removeConnection',
  meter: '--punk-meter-length',
  'status-light': 'The text carries the meaning',
  stack: '--punk-stack-gap',
  cluster: '--punk-cluster-gap',
  accordion: '"punk-accordion-item"',
  tabs: '"punk-tab"',
  toolbar: 'data-punk-toolbar-item',
  window: 'punk-move-start',
  dialog: '"data-punk-close"',
  popover: 'data-punk-close-on-activate',
  toast: 'punk-toast-in',
  checkbox: '"mixed"',
  switch: '"switch"',
  slider: '--_thumb',
  'text-field': '-webkit-search-cancel-button',
  'number-field': '-webkit-inner-spin-button',
  // Not `optgroup`, which the combobox reads too.
  select: 'selectedIndex',
  'radio-group': '"punk-radio"',
  textarea: 'field-sizing',
  combobox: 'aria-activedescendant',
  fieldset: 'It has no legend',
  menu: '"punk-menu-item"',
  'toggle-group': 'not `<button>`',
  list: '"punk-list-item"',
  table: 'data-punk-select-all',
  alert: 'part="actions"',
  badge: '"punk-badge"',
  spinner: '"punk-spinner"',
  drawer: 'punk-drawer-in',
  breadcrumb: '"punk-breadcrumb-item"',
  pagination: 'punk-page-change',
  kbd: '"punk-kbd"',
  'description-list': '"punk-description-list"',
  tag: '"punk-tag"',
  steps: 'stepUpcoming',
  'date-field': '"punk-date-field"',
  'time-field': '"punk-time-field"',
  'file-field': 'dropFiles',
  splitter: 'punk-split-change',
  'range-slider': 'rangeMinimum',
  menubar: 'role="menubar"',
  tree: '"punk-tree-item"',
};
// Components whose register entry must also bring these, and no others.
const dependencies: Record<string, string[]> = {
  'icon-button': ['tooltip'],
  menubar: ['menu'],
};

for (const component of components) {
  if (!sentinels[component]) fail(`No tree-shaking sentinel is defined for "${component}"`);
}

/** Every file below `dir`, as paths relative to it. */
function listFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(`${dir}/${entry.name}`, base)
      : [`${dir}/${entry.name}`.slice(base.length + 1)],
  );
}

// 1. Resolution through the exports map. `./*/register.js` must win over `./*`.
const toPath = (url: string) => fileURLToPath(url).slice(packageDir.length);
for (const component of components) {
  const register = toPath(import.meta.resolve(`${name}/${component}/register.js`));
  if (register !== `dist/components/${component}/register.js`) {
    fail(`${name}/${component}/register.js resolves to ${register}`);
  }
  const entry = toPath(import.meta.resolve(`${name}/${component}`));
  if (entry !== `dist/components/${component}/index.js`) {
    fail(`${name}/${component} resolves to ${entry}`);
  }
  if (!existsSync(`${distDir}/components/${component}/index.d.ts`)) {
    fail(`${component} has no index.d.ts, which the "types" condition points at`);
  }
}
for (const target of [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/hydrate.js',
  'dist/hydrate.d.ts',
  'dist/ssr.js',
  'dist/ssr.d.ts',
  'dist/css/tokens.css',
  'dist/css/themes.css',
  'dist/css/surfaces.css',
]) {
  if (!existsSync(`${packageDir}${target}`)) fail(`Missing ${target}`);
}
for (const entry of ['hydrate.js', 'ssr.js']) {
  if (toPath(import.meta.resolve(`${name}/${entry}`)) !== `dist/${entry}`) {
    fail(`${name}/${entry} does not resolve to dist/${entry}`);
  }
}
if (!existsSync(`${packageDir}custom-elements.json`)) fail('Missing custom-elements.json');

// 2. `sideEffects` covers exactly the register entries, the stylesheets, and the hydration entry.
const patterns = pkg.sideEffects.map(
  (pattern) =>
    new RegExp(
      `^${pattern
        .replace(/^\.\//, '')
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]+')}$`,
    ),
);
const distFiles = listFiles(distDir).map((file) => `dist/${file}`);
const flagged = distFiles.filter((file) => patterns.some((pattern) => pattern.test(file)));
const expectedFlagged = distFiles.filter(
  (file) =>
    /^dist\/components\/[^/]+\/register\.js$/.test(file) ||
    /^dist\/css\/[^/]+\.css$/.test(file) ||
    file === 'dist/hydrate.js',
);
for (const file of expectedFlagged.filter((file) => !flagged.includes(file))) {
  fail(`${file} has side effects but "sideEffects" does not list it`);
}
for (const file of flagged.filter((file) => !expectedFlagged.includes(file))) {
  fail(`"sideEffects" lists ${file}, which should be free of side effects`);
}

// 3. Nothing but register entries may register an element.
for (const file of distFiles.filter((file) => file.endsWith('.js'))) {
  if (/\/register\.js$/.test(file) || file === 'dist/utilities/register-element.js') continue;
  // Its script for the page defines `punk-styles` there; importing it registers nothing.
  if (file === 'dist/ssr.js') continue;
  const source = readFileSync(`${packageDir}${file}`, 'utf8');
  if (/customElements\.define|register-element\.js/.test(source)) {
    fail(`${file} registers an element, but only register.js entries may`);
  }
}

// 4. Bundling through the exports map includes only what was imported.
async function bundle(code: string): Promise<string> {
  const result = await build({
    stdin: { contents: code, resolveDir: repoDir, loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    external: ['lit', 'lit/*'],
    conditions: ['browser'],
    logLevel: 'silent',
  });
  return result.outputFiles.map((file) => file.text).join('\n');
}

function expectContains(label: string, output: string, wanted: string[], unwanted: string[]) {
  for (const component of wanted) {
    if (!output.includes(sentinels[component] ?? ''))
      fail(`${label} is missing the ${component} code`);
  }
  for (const component of unwanted) {
    if (output.includes(sentinels[component] ?? '')) fail(`${label} contains ${component} code`);
  }
}

for (const component of components) {
  const wanted = [component, ...(dependencies[component] ?? [])];
  const output = await bundle(`import '${name}/${component}/register.js';`);
  expectContains(
    `A bundle of ${component}/register.js`,
    output,
    wanted,
    components.filter((other) => !wanted.includes(other)),
  );
  if (!output.includes('customElements'))
    fail(`${component}/register.js does not register anything`);
}

const classOnly = await bundle(`import { PunkPanel } from '${name}'; console.log(PunkPanel);`);
expectContains(
  'A bundle that imports only PunkPanel from the package root',
  classOnly,
  ['panel'],
  components.filter((other) => other !== 'panel'),
);
if (/customElements\.define/.test(classOnly)) {
  fail('Importing a class from the package root registers an element');
}

const classEntry = await bundle(
  `import { PunkTooltip } from '${name}/tooltip'; console.log(PunkTooltip);`,
);
if (/customElements\.define/.test(classEntry)) fail('The tooltip class entry registers an element');
expectContains('The tooltip class entry', classEntry, ['tooltip'], ['button', 'panel']);

if (problems.length > 0) {
  console.error(`Package check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`Package OK: ${components.length} components, exports and tree-shaking verified`);
