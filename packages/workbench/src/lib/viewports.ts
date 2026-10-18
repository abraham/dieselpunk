// The widths every overview, example, and responsive-layout story must fit without scrolling
// sideways: a narrow window, and the layout width of that window at 200% zoom (WCAG 1.4.10).
// The smoke test checks them, and the Viewport toolbar offers them (specs/workbench.md §3).
export const reflowWidths = [375, 187] as const;
