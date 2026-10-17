import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultThemeName, themeNames } from '../packages/core/src/tokens/themes.ts';
import { parseSelection } from './ci-matrix.ts';
import type { Selection } from './ci-matrix.ts';

// Merges the baselines the update jobs rendered into the committed ones (specs/ci.md §8): the
// baselines the selection re-renders are deleted first, so those of removed tests do not linger.
//   node scripts/merge-baselines.ts <rendered dir>
// PUNK_GALLERY_GROUPS and PUNK_GALLERY_THEMES name the selection, as for scripts/ci-matrix.ts.

/** The theme a baseline renders, from its file name. A capture named for no theme uses the default. */
export function themeOfBaseline(file: string, themes: readonly string[] = themeNames): string {
  const longestFirst = [...themes].sort((a, b) => b.length - a.length);
  const found = longestFirst.find(
    (theme) => file.startsWith(`${theme}-`) || file.includes(`-${theme}-`),
  );
  return found ?? defaultThemeName;
}

/** Replaces the selected baselines in `baselines` (project/group/file) with those in `rendered`. */
export function mergeBaselines(baselines: string, rendered: string, selection: Selection): number {
  if (!existsSync(rendered) || readdirSync(rendered).length === 0) {
    throw new Error(`${rendered} holds no rendered baselines`);
  }
  let removed = 0;
  if (!selection.groups && !selection.themes) {
    rmSync(baselines, { recursive: true, force: true });
  } else if (existsSync(baselines)) {
    for (const project of readdirSync(baselines)) {
      for (const group of readdirSync(join(baselines, project))) {
        if (selection.groups && !selection.groups.includes(group)) continue;
        for (const file of readdirSync(join(baselines, project, group))) {
          if (selection.themes && !selection.themes.includes(themeOfBaseline(file))) continue;
          rmSync(join(baselines, project, group, file));
          removed++;
        }
      }
    }
  }
  cpSync(rendered, baselines, { recursive: true });
  return removed;
}

if (import.meta.main) {
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
  const removed = mergeBaselines(baselines, rendered, selection);
  console.log(
    selection.groups || selection.themes
      ? `Replaced ${removed} baselines with the newly rendered ones.`
      : 'Replaced every baseline with the newly rendered ones.',
  );
}
