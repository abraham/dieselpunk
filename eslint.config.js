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
    plugins: { local: { rules: { 'workspace-imports': workspaceImports } } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // A controller adds itself to its host in its constructor, so a field that only creates it
      // (`#localeWatcher`) is never read.
      'no-unused-private-class-members': 'off',
      'local/workspace-imports': 'error',
    },
  },
);
