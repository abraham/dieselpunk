import { fileURLToPath } from 'node:url';
import { mergeBaselines, themeOfBaseline } from '@dieselpunk/testing/ci';
import { defaultThemeName, themeNames } from '../packages/core/src/tokens/themes.ts';
import { parseSelection } from '../packages/core/test/browser/fixtures/groups.ts';

// Merges the baselines the update jobs rendered into core's committed ones (specs/ci.md §8).
//   node scripts/merge-baselines.ts <rendered dir>
// PUNK_GALLERY_GROUPS and PUNK_GALLERY_THEMES name the selection, as for scripts/ci-matrix.ts.

const rendered = process.argv[2];
if (!rendered) {
  console.error('Usage: node scripts/merge-baselines.ts <rendered dir>');
  process.exit(2);
}
const baselines = fileURLToPath(
  new URL('../packages/core/test/visual/__screenshots__', import.meta.url),
);
const selection = parseSelection(
  process.env['PUNK_GALLERY_GROUPS'],
  process.env['PUNK_GALLERY_THEMES'],
);
const removed = mergeBaselines(baselines, rendered, selection, (file) =>
  themeOfBaseline(file, themeNames, defaultThemeName),
);
console.log(
  selection.groups || selection.themes
    ? `Replaced ${removed} baselines with the newly rendered ones.`
    : 'Replaced every baseline with the newly rendered ones.',
);
