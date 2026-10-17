import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

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
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // A controller adds itself to its host in its constructor, so a field that only creates it
      // (`#localeWatcher`) is never read.
      'no-unused-private-class-members': 'off',
    },
  },
);
