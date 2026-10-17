import { globSync } from 'node:fs';
import { parseSelection } from '../test/browser/fixtures/groups.ts';

// Which browser tests one CI part runs (specs/ci.md §5.3), for the Vitest configs of core and locales.
//   PUNK_BROWSER_PART=<n>/<total>   the component tests of every total-th family, from the n-th
//   PUNK_GALLERY_GROUPS, _THEMES    what the gallery suites render; in a part, none when both are empty
// Without PUNK_BROWSER_PART every file runs, and the gallery suites render the selection, or all.

export interface BrowserRun {
  include: string[];
  provide: { galleryGroups: string[] | null; galleryThemes: string[] | null };
  passWithNoTests: boolean;
}

/** A component's tests are one family; any other file is a family of its own. */
export function familyOf(file: string): string {
  const parts = file.split('/');
  if (parts[0] === 'src' && parts[1] === 'components') return parts.slice(0, 3).join('/');
  if (parts[0] === 'src') return parts.slice(0, -1).join('/');
  return file;
}

export function browserRun(
  root: string,
  include: string[],
  gallerySuites: readonly string[],
  env: Record<string, string | undefined> = process.env,
): BrowserRun {
  const selection = parseSelection(env['PUNK_GALLERY_GROUPS'], env['PUNK_GALLERY_THEMES']);
  const provide = {
    galleryGroups: selection.groups ? [...selection.groups] : null,
    galleryThemes: selection.themes ? [...selection.themes] : null,
  };
  const partSpec = env['PUNK_BROWSER_PART'];
  if (!partSpec) return { include, provide, passWithNoTests: false };

  const match = /^(\d+)\/(\d+)$/.exec(partSpec);
  const part = Number(match?.[1]);
  const parts = Number(match?.[2]);
  if (!match || part < 1 || part > parts) {
    throw new Error(
      `PUNK_BROWSER_PART must be <n>/<total>, with n from 1 to total; got "${partSpec}"`,
    );
  }
  const files = globSync(include, { cwd: root }).sort();
  const components = files.filter((file) => !gallerySuites.includes(file));
  const families = [...new Set(components.map(familyOf))].sort();
  const mine = new Set(families.filter((_, index) => index % parts === part - 1));
  const chosen = components.filter((file) => mine.has(familyOf(file)));
  if (selection.groups || selection.themes) {
    chosen.push(...files.filter((file) => gallerySuites.includes(file)));
  }
  // A part may hold no file of a package, such as a part of core's families in the locales package.
  return { include: chosen, provide, passWithNoTests: true };
}
