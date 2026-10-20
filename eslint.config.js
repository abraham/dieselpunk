import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const repoRoot = dirname(fileURLToPath(import.meta.url));

/** The workspace a file belongs to, such as `packages/core`, or `''` for the repository root. */
function workspaceOf(file) {
  const [area, name] = relative(repoRoot, file).split(sep);
  return area === 'packages' && name ? `${area}/${name}` : '';
}

const isPrivate = (workspace) =>
  Boolean(JSON.parse(readFileSync(join(repoRoot, workspace, 'package.json'), 'utf8')).private);

// specs/testing.md §10: a workspace imports another only by package name, and a published
// package's source never imports the testing package.
const workspaceImports = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      leaves: 'This import leaves {{workspace}}. Import the other workspace by its package name.',
      testing: 'Published source must not import @dieselpunk/testing.',
    },
  },
  create(context) {
    const file = context.filename;
    const workspace = workspaceOf(file);
    const [, , folder] = relative(repoRoot, file).split(sep);
    const published = workspace !== '' && !isPrivate(workspace);
    const source = published && folder === 'src' && !file.endsWith('.test.ts');
    const check = (node) => {
      const specifier = node?.type === 'Literal' ? node.value : undefined;
      if (typeof specifier !== 'string') return;
      if (source && /^@dieselpunk\/testing(\/|$)/.test(specifier)) {
        context.report({ node, messageId: 'testing' });
      }
      if (workspace && specifier.startsWith('.')) {
        const target = resolve(dirname(file), specifier.split('?')[0]);
        if (workspaceOf(target) !== workspace) {
          context.report({ node, messageId: 'leaves', data: { workspace } });
        }
      }
    };
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
};

// specs/security.md §4.2: a URL attribute bound in a template goes through `safeUrl()`.
const urlAttribute =
  /(?:^|\s)\.?(?:href|src|srcset|action|formaction|xlink:href|poster|ping)=["']?$/i;

const urlBindings = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      unguarded: 'Bind a URL attribute through safeUrl() (specs/security.md §4.2).',
    },
  },
  create(context) {
    const isGuard = (node) =>
      node?.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'safeUrl';
    // A `const` whose initializer is `safeUrl(…)` is guarded too.
    const isGuardedConst = (node) => {
      if (node.type !== 'Identifier') return false;
      for (let scope = context.sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(node.name);
        if (!variable) continue;
        const [definition] = variable.defs;
        return (
          variable.defs.length === 1 &&
          definition.type === 'Variable' &&
          definition.parent.kind === 'const' &&
          isGuard(definition.node.init)
        );
      }
      return false;
    };
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== 'Identifier' || !['html', 'svg'].includes(node.tag.name)) return;
        node.quasi.expressions.forEach((expression, index) => {
          if (!urlAttribute.test(node.quasi.quasis[index].value.raw)) return;
          if (!isGuard(expression) && !isGuardedConst(expression)) {
            context.report({ node: expression, messageId: 'unguarded' });
          }
        });
      },
    };
  },
};

// specs/security.md §4.1 and §4.4: shipped source has no markup or script sinks, and makes no
// requests, reads no storage, and posts no messages.
const shippedSource = ['packages/core/src/**/*.ts', 'packages/locales/src/**/*.ts'];
const sink = 'is a markup or script sink (specs/security.md §4.1).';
const outward = 'reaches outside the page (specs/security.md §4.4).';

const sinkImports = [
  { name: 'lit/directives/unsafe-html.js', message: `unsafeHTML ${sink}` },
  { name: 'lit/directives/unsafe-svg.js', message: `unsafeSVG ${sink}` },
  { name: 'lit/directives/unsafe-mathml.js', message: `unsafeMathML ${sink}` },
  { name: 'lit/static-html.js', importNames: ['unsafeStatic'], message: `unsafeStatic ${sink}` },
];

const unsafeCssMessage =
  'unsafeCSS takes only constants, in src/styles/ or src/tokens/ (specs/security.md §4.1).';
const unsafeCssImports = ['lit', 'lit-element', '@lit/reactive-element'].map((name) => ({
  name,
  importNames: ['unsafeCSS'],
  message: unsafeCssMessage,
}));

const shippedRules = {
  'no-eval': 'error',
  'no-new-func': 'error',
  'no-restricted-imports': ['error', { paths: [...sinkImports, ...unsafeCssImports] }],
  'no-restricted-properties': [
    'error',
    ...[
      'innerHTML',
      'outerHTML',
      'insertAdjacentHTML',
      'setHTMLUnsafe',
      'createContextualFragment',
    ].map((property) => ({ property, message: `${property} ${sink}` })),
    ...['write', 'writeln'].map((property) => ({
      object: 'document',
      property,
      message: `document.${property} ${sink}`,
    })),
    { object: 'document', property: 'cookie', message: `document.cookie ${outward}` },
    { object: 'navigator', property: 'sendBeacon', message: `navigator.sendBeacon ${outward}` },
    { property: 'postMessage', message: `postMessage ${outward}` },
    ...['window', 'globalThis', 'self'].flatMap((object) =>
      ['fetch', 'localStorage', 'sessionStorage', 'indexedDB'].map((property) => ({
        object,
        property,
        message: `${property} ${outward}`,
      })),
    ),
  ],
  'no-restricted-globals': [
    'error',
    ...[
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'EventSource',
      'localStorage',
      'sessionStorage',
      'indexedDB',
    ].map((name) => ({ name, message: `${name} ${outward}` })),
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "ImportExpression[source.type!='Literal'], ImportExpression[source.value=/^[^.]/]",
      message:
        "A dynamic import loads only the package's own modules, by a literal relative path (specs/security.md §4.4).",
    },
    {
      // `no-implied-eval` needs browser globals or type information to see these.
      selector:
        'CallExpression[callee.name=/^set(Timeout|Interval)$/] > :matches(Literal, TemplateLiteral).arguments:first-child, CallExpression[callee.property.name=/^set(Timeout|Interval)$/] > :matches(Literal, TemplateLiteral).arguments:first-child',
      message: `A string passed to setTimeout or setInterval ${sink}`,
    },
    {
      selector: 'Decorator',
      message:
        'Declare reactive properties in `static properties`; a decorator adds a helper to every module (specs/component-model.md).',
    },
  ],
  'local/url-bindings': 'error',
};

export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/node_modules/',
    '**/test-results/',
    '**/.vitest/',
    '**/generated/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: {
      local: { rules: { 'workspace-imports': workspaceImports, 'url-bindings': urlBindings } },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // A controller adds itself to its host in its constructor, so a field that only creates it
      // (`#localeWatcher`) is never read.
      'no-unused-private-class-members': 'off',
      'local/workspace-imports': 'error',
    },
  },
  {
    files: shippedSource,
    ignores: ['**/*.test.ts'],
    rules: shippedRules,
  },
  {
    // The styles and tokens build CSS from the library's own constants.
    files: ['packages/core/src/styles/**/*.ts', 'packages/core/src/tokens/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: sinkImports }] },
  },
  {
    // A consumer's unit tests in happy-dom; the guide shows these files, so globals live here.
    files: ['packages/core/test/package/node-test/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        HTMLElement: 'readonly',
        HTMLTableSectionElement: 'readonly',
      },
    },
  },
);
