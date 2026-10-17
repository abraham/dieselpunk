import { inject } from 'vitest';
import { server } from 'vitest/browser';
import { autoLightThemeName, defaultThemeName, themeNames } from '../../../src/tokens/themes.ts';
import { componentNames } from './gallery.ts';
import type { ComponentName } from './gallery.ts';
import { galleryGroups } from './groups.ts';

// What the gallery suites render in this run (specs/ci.md §5.3): the selected groups and themes, and
// in Firefox and WebKit only the two combinations the visual matrix checks across engines.

const groups = inject('galleryGroups');
const themes = inject('galleryThemes');

// A toast is shown by the toast stack, so it belongs to the overlays.
const extraMembers: Partial<Record<ComponentName, string>> = { toast: 'overlays' };

/** The components of the selected groups, in gallery order. */
export const galleryNames: readonly ComponentName[] = groups
  ? componentNames.filter((name) =>
      groups.some(
        (group) =>
          (galleryGroups[group as keyof typeof galleryGroups] as readonly string[]).includes(
            name,
          ) || extraMembers[name] === group,
      ),
    )
  : componentNames;

const densities = ['compact', 'low'] as const;
export type Density = (typeof densities)[number];

/** Whether the selection renders `theme`. A suite that renders one theme runs where it is selected. */
export const rendersTheme = (theme: string) => !themes || themes.includes(theme);

/** The themes and densities to render, in this engine and selection. */
export const galleryCombinations: ReadonlyArray<{ theme: string; density: Density }> = (
  server.browser === 'chromium'
    ? themeNames.flatMap((theme) => densities.map((density) => ({ theme, density })))
    : [
        { theme: defaultThemeName, density: 'compact' as const },
        { theme: autoLightThemeName, density: 'low' as const },
      ]
).filter(({ theme }) => rendersTheme(theme));
