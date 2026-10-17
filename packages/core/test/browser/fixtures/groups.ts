// The gallery groups and their components (specs/ci.md §5.1). No DOM or Lit imports, so the visual
// spec and scripts/ci-matrix.ts can read it in Node.

// The visual matrix renders one group per run, so each group has its own page and baselines.
export const galleryGroups = {
  foundation: ['panel', 'divider', 'button', 'icon-button', 'progress-bar', 'tooltip'],
  inventory: ['slot', 'item-stack', 'slot-grid', 'recipe', 'meter', 'status-light'],
  production: ['production-stat', 'connection-row'],
  shell: ['stack', 'cluster', 'accordion', 'accordion-item', 'tabs', 'tab', 'toolbar', 'window'],
  // Every form control in every state, in flow: no top layer, so one page holds them all.
  forms: ['checkbox', 'switch', 'slider', 'text-field', 'number-field', 'select'],
  // Overlays open on a page of their own, since the top layer covers everything else.
  overlays: ['dialog', 'window', 'popover', 'toast-stack'],
} as const;
export type GalleryGroup = keyof typeof galleryGroups;

export const groupNames = Object.keys(galleryGroups) as GalleryGroup[];
