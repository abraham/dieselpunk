export const themes = [
  { value: 'dark', title: 'Dark' },
  { value: 'light', title: 'Light' },
  { value: 'high-contrast', title: 'High contrast' },
  { value: 'reduced-texture', title: 'Reduced texture' },
  { value: 'auto', title: 'Auto (system)' },
] as const;

export const densities = [
  { value: 'compact', title: 'Compact' },
  { value: 'low', title: 'Low' },
] as const;

/** The themes that have their own palette; `auto` only chooses between them. */
export const paletteThemes = themes.filter((theme) => theme.value !== 'auto');
