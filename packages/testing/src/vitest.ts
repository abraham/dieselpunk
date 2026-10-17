import { globSync } from 'node:fs';
import { defineBrowserCommand } from '@vitest/browser-playwright';
import type { Selection } from './ci.ts';

export type { Selection };

// The shared parts of the workspaces' Vitest configs: engines, browser commands, pre-bundled
// dependencies, and which files one CI part runs (specs/ci.md §5.3).

const engines = ['chromium', 'firefox', 'webkit'] as const;
export type Engine = (typeof engines)[number];

/** Local runs use Chromium only. CI runs one job per engine and part, each setting PUNK_BROWSERS. */
export function selectedEngines(env: Record<string, string | undefined> = process.env): Engine[] {
  const requested = env['PUNK_BROWSERS'];
  if (!requested) return ['chromium'];
  const names = requested.split(',').map((name) => name.trim());
  const unknown = names.filter((name) => !engines.includes(name as Engine));
  if (unknown.length > 0) {
    throw new Error(`PUNK_BROWSERS has unknown engines: ${unknown.join(', ')}`);
  }
  return names as Engine[];
}

/** Pre-bundled up front, since a cold cache that finds them mid-run reloads and loads Lit twice. */
export const preBundled = [
  'axe-core',
  'lit',
  'lit/decorators.js',
  'lit/directives/class-map.js',
  'lit/directives/if-defined.js',
];

// Tests run in an iframe, and Playwright's page-level emulation applies to it. Firefox applies it a
// couple of frames after the call returns, so each command waits until the frame reports the change.
const setColorScheme = defineBrowserCommand<[scheme: 'light' | 'dark' | null]>(
  async (context, scheme) => {
    await context.page.emulateMedia({ colorScheme: scheme });
    if (scheme) {
      const frame = await context.frame();
      await frame.waitForFunction(
        `matchMedia('(prefers-color-scheme: ${scheme})').matches`,
        undefined,
        { timeout: 5000 },
      );
    }
  },
);

const setForcedColors = defineBrowserCommand<[mode: 'active' | null]>(async (context, mode) => {
  await context.page.emulateMedia({ forcedColors: mode });
  if (mode) {
    const frame = await context.frame();
    await frame.waitForFunction(`matchMedia('(forced-colors: active)').matches`, undefined, {
      timeout: 5000,
    });
  }
});

const setReducedMotion = defineBrowserCommand<[mode: 'reduce' | null]>(async (context, mode) => {
  await context.page.emulateMedia({ reducedMotion: mode });
  if (mode) {
    const frame = await context.frame();
    await frame.waitForFunction(
      `matchMedia('(prefers-reduced-motion: reduce)').matches`,
      undefined,
      { timeout: 5000 },
    );
  }
});

// Press and hold a real pointer, which is the only way to reach `:active` in a test.
const holdPointer = defineBrowserCommand<[selector: string]>(async (context, selector) => {
  await context.iframe.locator(selector).hover();
  await context.page.mouse.down();
});

const releasePointer = defineBrowserCommand<[]>(async (context) => {
  await context.page.mouse.up();
});

/** The commands `./browser` declares. */
export const browserCommands = {
  setColorScheme,
  setForcedColors,
  setReducedMotion,
  holdPointer,
  releasePointer,
};

/** Reads comma- or space-separated names, without checking them against a list. */
export function listSelection(groups = '', themes = ''): Selection {
  const list = (text: string) => text.split(/[\s,]+/).filter(Boolean);
  const selection: Selection = {};
  if (list(groups).length > 0) selection.groups = list(groups);
  if (list(themes).length > 0) selection.themes = list(themes);
  return selection;
}

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

/** The files one part runs, and the selection the gallery suites read. `parse` may check names. */
export function browserRun(
  root: string,
  include: string[],
  gallerySuites: readonly string[],
  env: Record<string, string | undefined> = process.env,
  parse: (groups?: string, themes?: string) => Selection = listSelection,
): BrowserRun {
  const selection = parse(env['PUNK_GALLERY_GROUPS'], env['PUNK_GALLERY_THEMES']);
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
