export default {
  globs: [
    'src/components/*/*.ts',
    'src/internal/punk-element.ts',
    'src/internal/button-base.ts',
    'src/internal/selectable-base.ts',
  ],
  exclude: [
    '**/*.test.ts',
    '**/*.styles.ts',
    'src/components/*/index.ts',
    'src/components/*/register.ts',
  ],
  litelement: true,
  outdir: '.',
};
