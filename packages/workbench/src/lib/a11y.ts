/** An axe rule setting for the accessibility addon. */
export interface AxeRule {
  id: string;
  enabled?: boolean;
  selector?: string;
}

/**
 * The addon's `config` for a story: the rules every story has, then `rules`. A story's rule list
 * replaces the preview's rather than merging with it, so every list starts from this one.
 */
export function axeConfig(...rules: AxeRule[]): { rules: AxeRule[] } {
  // Landmarks are the page's job, not a story's.
  return { rules: [{ id: 'region', enabled: false }, ...rules] };
}

/** A theme and density matrix repeats one example per cell, so its landmarks repeat by design. */
export const repeatedLandmarks: AxeRule = { id: 'landmark-unique', enabled: false };
