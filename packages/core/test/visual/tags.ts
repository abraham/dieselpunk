import { defaultThemeName } from '../../src/tokens/themes.ts';
import type { GalleryGroup } from '../browser/fixtures/groups.ts';

// The tags CI selects visual tests by (specs/ci.md §5.2). scripts/ci-matrix.ts builds its --grep
// from the same functions.

export const groupTag = (group: string) => `@group:${group}`;
export const themeTag = (theme: string) => `@theme:${theme}`;

/** The tags of a test that renders `group` in `theme`. */
export const at = (group: GalleryGroup, theme: string = defaultThemeName) => [
  groupTag(group),
  themeTag(theme),
];
