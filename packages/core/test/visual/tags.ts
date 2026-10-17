import { groupTag, themeTag } from '@dieselpunk/testing/playwright';
import { defaultThemeName } from '../../src/tokens/themes.ts';
import type { GalleryGroup } from '../browser/fixtures/groups.ts';

// The tags CI selects visual tests by (specs/ci.md §5.2).

/** The tags of a test that renders `group` in `theme`. */
export const at = (group: GalleryGroup, theme: string = defaultThemeName) => [
  groupTag(group),
  themeTag(theme),
];
