import assert from 'node:assert/strict';
import { test } from 'node:test';
import { themeNames } from '../src/tokens/themes.ts';
import { groupNames, parseSelection } from './browser/fixtures/groups.ts';

// The selection CI passes in PUNK_GALLERY_GROUPS and PUNK_GALLERY_THEMES (specs/ci.md §5.3).

test('a selection is read from a list, and unknown names fail', () => {
  assert.deepEqual(parseSelection('', ''), {});
  assert.deepEqual(parseSelection(`${groupNames[0]}, ${groupNames[1]}`, ` ${themeNames[0]} `), {
    groups: [groupNames[0], groupNames[1]],
    themes: [themeNames[0]],
  });
  assert.throws(() => parseSelection('attic'), /Unknown group: attic/);
  assert.throws(() => parseSelection('', 'sepia'), /Unknown theme: sepia/);
});
