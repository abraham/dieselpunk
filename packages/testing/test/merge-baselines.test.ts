import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { mergeBaselines, themeOfBaseline } from '../src/ci.ts';

// The merge of re-rendered baselines into the committed ones (specs/ci.md §8).

const themes = ['steel', 'steel-light', 'high-contrast'];
const themeOf = (file: string) => themeOfBaseline(file, themes, 'steel');

test('a baseline belongs to the longest theme its name contains', () => {
  assert.equal(themeOf('steel-compact-desktop-100-short.png'), 'steel');
  assert.equal(themeOf('steel-light-low-narrow-200-rtl.png'), 'steel-light');
  assert.equal(themeOf('dialog-steel-light-compact-x.png'), 'steel-light');
  assert.equal(themeOf('dialog-high-contrast-compact-x.png'), 'high-contrast');
});

test('a capture named for no theme belongs to the fallback theme', () => {
  assert.equal(themeOfBaseline('interaction-button-hover.png', themes, 'brass'), 'brass');
});

const root = mkdtempSync(join(tmpdir(), 'punk-merge-'));
after(() => rmSync(root, { recursive: true, force: true }));

function tree(name: string, files: Record<string, string>): string {
  const dir = join(root, name);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}
const read = (dir: string, path: string) =>
  existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null;

const [dark = '', light = ''] = themes;

test('a selection replaces its own baselines and keeps the rest', () => {
  const committed = tree('committed', {
    [`chromium/shell/${dark}-compact-a.png`]: 'old',
    [`chromium/shell/${dark}-compact-removed.png`]: 'old',
    [`chromium/shell/${light}-compact-a.png`]: 'old',
    [`chromium/forms/${dark}-compact-a.png`]: 'old',
  });
  const rendered = tree('rendered', { [`chromium/shell/${dark}-compact-a.png`]: 'new' });
  mergeBaselines(committed, rendered, { groups: ['shell'], themes: [dark] }, themeOf);
  assert.equal(read(committed, `chromium/shell/${dark}-compact-a.png`), 'new');
  assert.equal(read(committed, `chromium/shell/${dark}-compact-removed.png`), null);
  assert.equal(read(committed, `chromium/shell/${light}-compact-a.png`), 'old');
  assert.equal(read(committed, `chromium/forms/${dark}-compact-a.png`), 'old');
});

test('no selection replaces every baseline', () => {
  const committed = tree('everything', { 'firefox/attic/x.png': 'old' });
  const rendered = tree('everything-rendered', { 'firefox/shell/y.png': 'new' });
  mergeBaselines(committed, rendered, {}, themeOf);
  assert.equal(read(committed, 'firefox/attic/x.png'), null);
  assert.equal(read(committed, 'firefox/shell/y.png'), 'new');
});

test('nothing rendered fails the merge', () => {
  assert.throws(
    () => mergeBaselines(tree('kept', {}), join(root, 'missing'), {}, themeOf),
    /no rendered/,
  );
});
