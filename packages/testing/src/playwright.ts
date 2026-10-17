// The tags CI selects visual tests by (specs/ci.md §5.2), and the screenshot tolerances
// (specs/testing.md §6). `./ci` builds its --grep from the same tags.

export const groupTag = (group: string) => `@group:${group}`;
export const themeTag = (theme: string) => `@theme:${theme}`;

/** A whole page: animations off, and a fifth of a colour step on 0.2% of the picture. */
export const pageTolerance = { maxDiffPixelRatio: 0.002 };

/** A capture clipped to one target, where a hover or a press moves an edge by a few steps. */
export const interactionTolerance = { threshold: 0.02, maxDiffPixelRatio: 0.0005 };
