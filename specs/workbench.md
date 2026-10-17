# Documentation Workbench

**Scope:** the Storybook workbench in `apps/storybook`: what it is for, how it consumes the library, what it contains, and how it is tested.
**Code:** `apps/storybook/.storybook/`, `src/stories/`, `src/lib/`, `src/icons/`, `src/styles/workbench.css`, `scripts/smoke.ts`.

## 1. Purpose

The workbench is where people build with and review the library, not a marketing site. Its first screen is the **Inventory overview**: an assembler built from a panel, a slot grid of item stacks, a recipe, a progress bar, meters, status lights, and buttons. Every component, state, theme, and density is reachable from the sidebar, and every claim in a guide is backed by something that runs.

## 2. Build and consumption

- Storybook for web components with Vite (`@storybook/web-components-vite`).
- The workbench imports the **built** packages through their public exports, including `custom-elements.json`, exactly as an external consumer does, so it exercises the real `exports` map. Its `typecheck` and the root `storybook` script build core first.
- The `development` export condition is on in every build, so development warnings (a missing name, a bad range) show in stories.
- Fonts (Chakra Petch, IBM Plex Mono) come from `@fontsource` as development dependencies; neither package bundles a font.

## 3. Structure

- **Toolbar controls** set `data-punk-theme` (`industrial`, `industrial-light`, `high-contrast`, `reduced-texture`, `auto`) and `data-punk-density` (`compact`, `low`) on each story's stage wrapper, not on `<html>`, so each story is themed independently, they combine, and Storybook's own chrome keeps its look.
- **Overview:** Inventory (the first screen) and Application shell (the acceptance scenario's assembler: a movable, dismissible window with a toolbar, tabs for Production, Modules, Settings, and Logistics, a recipe, a progress bar, status lights and stats, a slot grid of item stacks, a settings form with a live `FormData` display, a confirmation dialog, a popover menu, connection rows, and toasts, all wired from outside with the components' own events).
- **Foundations:** colors per theme with contrast ratios measured in the browser from computed properties (the gate's pairs), spacing, control-height, and typography scales parsed from the shipped `tokens.css`, the surface recipes, texture on and off, and the Machine panel composition.
- **One page per component family:** a playground with controls from the manifest; every state; the theme by density matrix; a keyboard table beside the example; and an API table from the manifest. Overlays open from a button. Families add stories where a state needs one (the slot grid's selection modes, narrow container, and 100 slots; the connection row's removal pattern with focus moved and Undo).
- **Examples:** Production dashboard (stats with sparklines, meters, status lights, and progress bars, updated once a second by a seeded simulation, with a visible Pause updates switch, never moving focus or announcing, and stopping its timer when the story is not shown); Logistics network (a filterable list of connection rows, a confirming dialog before removal, focus to the next row or the heading, and an Undo toast); Interface settings (a locale select over English and the five packs, applied with `setLocale` and `bindDocumentLocale`, with theme and density).
- **Demo art:** original icons (gear, plus, close, info, warning, check) and item art (gear, plate, circuit, module, coil), drawn on a 24px grid in `currentColor`, in `src/icons/`. They are workbench-only and documented on the asset policy page.

## 4. Guides

| Guide                    | Covers                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration              | Plain HTML and TypeScript: class versus register imports, CSS, typing, forms, and localization setup                                                                                           |
| React, Vue, Svelte       | Properties versus attributes, `punk-` and native events, binding a value, calling methods, typing; each shows its fixture's code with `?raw`, so the page is what `check:frameworks` built     |
| Forms                    | Association, what each control submits, defaults and reset, validation timing, fieldsets, names and labels, events, platform limits                                                            |
| Focus and overlays       | Modality, the Escape order, backdrop clicks, popover focus modes, toast announcements and modals, window move mode                                                                             |
| Responsive layouts       | Windows and footers at 560px and 320px, a tall modal, a settings row from stack, cluster, and a container query; containers decide                                                             |
| Accessibility and layout | Reflow, right-to-left, forced colors, reduced motion, focus, each family's keyboard model and non-color cues                                                                                   |
| Localization             | Configuring Lit Localize, merging application messages, `bindDocumentLocale`, writing XLIFF, the rules, what does not change, and a table of every message read from the XLIFF                 |
| Performance              | Budgets, what each component costs, updating many stats, `content-visibility` for long lists with measurements and caveats, a list of connection rows virtualized with `@lit-labs/virtualizer` |
| Screen reader checklist  | The manual scenarios and combinations of [accessibility.md §13](accessibility.md), and the results table                                                                                       |
| Asset policy             | What is original, what applications must supply, and the rule against game-derived assets                                                                                                      |

## 5. Smoke test

`scripts/smoke.ts` loads the built workbench in Chromium and fails on:

- any story or docs page that throws, or logs a warning or error other than Lit's one-time development notice (so a story that misuses a component fails);
- sideways scrolling of more than 1px at 375px and 187px for the overviews, the examples, and the responsive-layout stories;
- the Application shell's keyboard flows: tabs, the live form, the Stop dialog and its focus return, and the Actions menu;
- the examples' flows: dashboard updates, pause, and resume without focus moves or announcements; logistics removal, cancel, Undo, filter, and focus targets; interface-settings `lang`, `dir`, and names for every locale;
- guide content: each framework guide contains its app's code, the Localization table lists every message id, and the checklist has its rows and combinations.

## 6. Authoring rules

- MDX here has no GitHub-flavored Markdown: pipe tables do not render, so docs pages use JSX tables.
- Slot content in a story's controls is a string argument named `<slot>-slot` (`default-slot`, `header-slot`), which the manifest helpers render. Demo icons are therefore available as SVG strings.
- A story never produces a development warning: an icon button has a label, a grid has a name.
- A story with a timer stops it when the story is not shown.
- A slotted control in a shadow-rendered footer (a dialog's buttons) is found from the page with an exact accessible name, not from the overlay's locator.

## Verification

- `npm run build` builds the workbench; `test:smoke` runs §5.
- Every guide's framework code is the code `check:frameworks` builds.
- Foundations data is measured from the built CSS, so it cannot drift from what consumers get.

## Gaps

- **The screen reader results table is empty** ([accessibility.md](accessibility.md) Gaps).
