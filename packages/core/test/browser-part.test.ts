import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { browserRun, familyOf } from '../scripts/browser-part.ts';

// Which files a CI part of the browser tests runs (specs/ci.md §5.3).

const root = mkdtempSync(join(tmpdir(), 'punk-part-'));
after(() => rmSync(root, { recursive: true, force: true }));
for (const file of [
  'src/components/button/button.test.ts',
  'src/components/button/button.registration.test.ts',
  'src/components/slot/slot.test.ts',
  'src/internal/roving.test.ts',
  'test/browser/focus.test.ts',
  'test/browser/a11y.test.ts',
]) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), '');
}
const include = ['src/**/*.test.ts', 'test/browser/**/*.test.ts'];
const gallery = ['test/browser/a11y.test.ts'];

test('a component is one family, and any other file a family of its own', () => {
  assert.equal(
    familyOf('src/components/button/button.registration.test.ts'),
    'src/components/button',
  );
  assert.equal(familyOf('src/internal/roving.test.ts'), 'src/internal');
  assert.equal(familyOf('test/browser/focus.test.ts'), 'test/browser/focus.test.ts');
});

test('without a part every file runs, with the selection passed on', () => {
  const run = browserRun(root, include, gallery, { PUNK_GALLERY_GROUPS: 'shell' });
  assert.deepEqual(run.include, include);
  assert.deepEqual(run.provide, { galleryGroups: ['shell'], galleryThemes: null });
});

test('the parts share out whole families, and only a part with groups runs the gallery suites', () => {
  const first = browserRun(root, include, gallery, {
    PUNK_BROWSER_PART: '1/2',
    PUNK_GALLERY_GROUPS: 'shell',
  });
  const second = browserRun(root, include, gallery, { PUNK_BROWSER_PART: '2/2' });
  assert.deepEqual(first.include, [
    'src/components/button/button.registration.test.ts',
    'src/components/button/button.test.ts',
    'src/internal/roving.test.ts',
    'test/browser/a11y.test.ts',
  ]);
  assert.deepEqual(second.include, [
    'src/components/slot/slot.test.ts',
    'test/browser/focus.test.ts',
  ]);
  assert.equal(second.passWithNoTests, true);
});

test('a malformed part fails', () => {
  assert.throws(
    () => browserRun(root, include, gallery, { PUNK_BROWSER_PART: '3/2' }),
    /<n>\/<total>/,
  );
});
