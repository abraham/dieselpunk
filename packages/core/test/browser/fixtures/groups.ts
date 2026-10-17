// The gallery groups and their components (specs/ci.md §5.1). No DOM or Lit imports, so the visual
// spec, the Vitest configs, and scripts/ci-matrix.ts can read it in Node.

import { themeNames } from '../../../src/tokens/themes.ts';

// The visual matrix renders one group per run, so each group has its own page and baselines.
export const galleryGroups = {
  foundation: ['panel', 'divider', 'button', 'icon-button', 'progress-bar', 'tooltip'],
  inventory: ['slot', 'item-stack', 'slot-grid', 'recipe', 'meter', 'status-light'],
  production: ['production-stat', 'connection-row'],
  shell: ['stack', 'cluster', 'accordion', 'accordion-item', 'tabs', 'tab', 'toolbar', 'window'],
  // Every form control in every state, in flow: no top layer, so one page holds them all.
  forms: ['checkbox', 'switch', 'slider', 'text-field', 'number-field', 'select'],
  // The form controls that group or choose, in flow like the first six.
  inputs: ['radio-group', 'radio', 'textarea', 'combobox', 'fieldset'],
  // Navigation and selection in flow; a menu is in the top layer, so it is open only in `overlays`.
  navigation: [
    'toggle-group',
    'list',
    'list-item',
    'breadcrumb',
    'breadcrumb-item',
    'pagination',
    'menu-item',
  ],
  // Readouts of data and status that sit in the page.
  data: ['table', 'alert', 'badge', 'spinner', 'kbd'],
  // Overlays open on a page of their own, since the top layer covers everything else.
  overlays: ['dialog', 'window', 'popover', 'toast-stack', 'drawer', 'menu'],
} as const;
export type GalleryGroup = keyof typeof galleryGroups;

export const groupNames = Object.keys(galleryGroups) as GalleryGroup[];

/** The groups and themes to render; all of either when absent. */
export interface Selection {
  groups?: readonly string[];
  themes?: readonly string[];
}

/** Reads comma- or space-separated group and theme names, and rejects unknown ones. */
export function parseSelection(groups = '', themes = ''): Selection {
  const list = (text: string, known: readonly string[], kind: string) => {
    const names = text.split(/[\s,]+/).filter(Boolean);
    const unknown = names.filter((name) => !known.includes(name));
    if (unknown.length > 0) {
      throw new Error(`Unknown ${kind}: ${unknown.join(', ')}. Known: ${known.join(', ')}.`);
    }
    return names.length > 0 ? names : undefined;
  };
  const selection: Selection = {};
  const g = list(groups, groupNames, 'group');
  const t = list(themes, themeNames, 'theme');
  if (g) selection.groups = g;
  if (t) selection.themes = t;
  return selection;
}

// The Vitest configs pass the selection of PUNK_GALLERY_GROUPS and PUNK_GALLERY_THEMES to the
// gallery suites, where `null` means all (specs/ci.md §5.3).
declare module 'vitest' {
  interface ProvidedContext {
    galleryGroups: string[] | null;
    galleryThemes: string[] | null;
  }
}
