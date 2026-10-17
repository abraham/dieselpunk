# Product

**Scope:** what Industrial UI is, who it is for, the principles every other spec follows, and what 1.0 means.
**Packages:** `@dieselpunk/core`, `@dieselpunk/locales`. The workbench in `apps/storybook` is private.

## 1. Purpose

Industrial UI is a framework-agnostic Web Component library for dense, tactile, factory-management interfaces in web applications and browser-based games. Its visual language evokes practical machinery, inventory screens, production controls, and beveled metal, in the spirit of Factorio, without redistributing, tracing, or deriving from any of Factorio's artwork, textures, icons, sounds, fonts, names, or code.

The library feels:

- mechanical rather than futuristic;
- dense, legible, and built for repeated use;
- tactile, with visibly raised, inset, pressed, selected, and disabled states;
- warm and worn: charcoal metal, muted brass, safety yellow, signal orange;
- at home with a mouse, a keyboard, touch, a screen reader, and game-style input.

## 2. Goals

1. Reusable Lit-based components for inventory, crafting, logistics, production, research, and settings screens.
2. The native behavior, accessibility, and composability expected of good Web Components: form participation, keyboard patterns from WAI-ARIA, focus that is always visible, and events that cross shadow roots.
3. A convincing industrial game UI from CSS custom properties and the application's own assets, with no global setup.
4. Plain HTML as a first-class target, typed imports for TypeScript, and documented use from React, Vue, and Svelte.
5. A small, tree-shakeable package whose only runtime dependencies are Lit and Lit's own localization library, `@lit/localize`.

## 3. Non-goals

- Pixel recreation of any game's screens, or any extracted game asset, logo, typeface, sound, or proprietary name.
- Game logic: simulation, inventory rules, recipe calculation, drag-and-drop business rules, persistence. Components report what the user did and show what the application tells them.
- A general-purpose design system for interfaces that are not industrial or game-like.
- Game-world graphics: maps, sprites, charts. Applications slot their own.
- Framework wrapper packages, server-side rendering, and hydration.

## 4. Design principles

Every spec applies these. Where a spec makes a trade-off, it says which principle wins.

1. **Dense but ordered.** Compact by default, with strong alignment and stable sizes: a changing count never moves its neighbors. A low-density mode enlarges spacing and targets without changing behavior ([visual-system.md §3](visual-system.md)).
2. **Tactile state.** State shows as depth as well as color: idle is raised, hover brightens edges, pressed sinks 1px and turns inset, selected gets a warm outline and a darker inset, disabled flattens and desaturates but stays readable, and focus is a two-tone ring on `:focus-visible` that is never removed without a replacement.
3. **Information before decoration.** Counts, progress, warnings, labels, and selection read at a glance. Texture and bevels never lower text contrast or obscure an icon, and they degrade cleanly in forced colors and the `reduced-texture` theme.
4. **Never color alone.** Every state and status has a second cue: a shape, a pattern, a word, or an outline style ([accessibility.md §6](accessibility.md)).
5. **Native first.** A component uses the native element whose semantics fit (`<button>`, `<dialog>`, `<input>`, `<select>`, the Popover API) and adds only what the platform leaves out.
6. **Containers decide.** Components respond to the space they are given, not to the viewport, and never force horizontal scrolling at 200% zoom.
7. **Cheap when idle.** A page of the library's components does no work when nothing happens: no polling, no continuous animation, no document-wide listener or observer that is not needed right now ([performance.md](performance.md)).
8. **Original materials.** Bundled textures are procedural and original. Core ships no icons, fonts, images, or sounds. The workbench's demo icons and item art are original and documented as such. Applications supply their own imagery and hold the rights to it.

## 5. Packages

| Package               | Contents                                                                                                                                    | Spec                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `@dieselpunk/core`    | The components, their class and registration entries, `tokens.css`, `themes.css`, and `custom-elements.json`. English is its source locale. | [package-contract.md](package-contract.md) |
| `@dieselpunk/locales` | Translations of core's messages as Lit Localize runtime modules, a loader, a merger, and `bindDocumentLocale`.                              | [localization.md §5](localization.md)      |
| `apps/storybook`      | The documentation workbench. Private; consumes the built packages through their public exports.                                             | [workbench.md](workbench.md)               |

## 6. Component inventory

32 tags in 29 registration entries. One entry registers a family; [package-contract.md §2](package-contract.md) has the rules.

| Family                 | Tags                                                                                                  | Behavior spec                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Layout and surfaces    | `punk-panel`, `punk-divider`, `punk-stack`, `punk-cluster`                                            | [layout-and-actions.md](layout-and-actions.md)         |
| Actions                | `punk-button`, `punk-icon-button`                                                                     | [layout-and-actions.md](layout-and-actions.md)         |
| Navigation, disclosure | `punk-tabs` + `punk-tab`, `punk-toolbar`, `punk-accordion` + `punk-accordion-item`                    | [keyboard-and-selection.md](keyboard-and-selection.md) |
| Inventory              | `punk-slot`, `punk-item-stack`, `punk-slot-grid`, `punk-recipe`                                       | [inventory-and-readouts.md](inventory-and-readouts.md) |
| Readouts               | `punk-progress-bar`, `punk-meter`, `punk-status-light`, `punk-production-stat`, `punk-connection-row` | [inventory-and-readouts.md](inventory-and-readouts.md) |
| Overlays and feedback  | `punk-tooltip`, `punk-popover`, `punk-window`, `punk-dialog`, `punk-toast-stack` + `punk-toast`       | [overlays.md](overlays.md)                             |
| Form controls          | `punk-checkbox`, `punk-switch`, `punk-slider`, `punk-text-field`, `punk-number-field`, `punk-select`  | [forms.md](forms.md)                                   |

The slot grid's keyboard and selection model is in [keyboard-and-selection.md §6](keyboard-and-selection.md); its items are in [inventory-and-readouts.md](inventory-and-readouts.md).

## 7. Platforms

- **Browsers:** the current and previous major versions of Chrome, Edge, Firefox, and Safari. Emitted code is ESNext and is not downleveled, so source uses only what that baseline supports.
- **Input:** mouse, pen, touch, keyboard, and assistive technology. Hover reveals supplemental information only, never a required action.
- **Integration:** plain HTML and TypeScript with no global setup. React, Vue, and Svelte through integration guides backed by tested fixture apps ([workbench.md §4](workbench.md)), not wrappers.
- **Locales:** English, German, French, Spanish, Japanese, and Arabic (right to left), with one active message locale per page ([localization.md](localization.md)).

## 8. Acceptance scenario

A developer installs `@dieselpunk/core`, imports the registration entries for window, tabs, slot grid, item stack, recipe, button, progress bar, and a form control, and builds a responsive assembler interface with their own item art. The result is a dense, tactile industrial control surface that works with a mouse, touch, a keyboard, and a screen reader; can be recolored through tokens; can be switched to another language at run time with `@dieselpunk/locales`; takes part in a native form; and needs no React, Vue, or Svelte runtime.

**Verification:** `test/package/src/shell.ts` and `test/package/src/production.ts` in the consumer check build exactly this from the packed tarballs and drive it in a browser ([testing.md §8](testing.md)).

## 9. Release criteria

These hold for every release from 1.0 on, not once:

1. Every non-experimental component in §6 is implemented, documented in the workbench, and described in the manifest.
2. The manifest is valid, every public name has a description, and the API snapshot matches it.
3. Axe reports no serious or critical violation in any gallery group, theme, density, content variant, or shipped locale.
4. Keyboard behavior matches the WAI-ARIA pattern each component names, in every engine and in both directions.
5. Visual regression covers every required state, theme, density, width, zoom, and forced colors, against baselines rendered in CI.
6. The package is usable from plain HTML and TypeScript with no global setup, and from the three framework fixtures.
7. A tree-shaken import of one entry registers and bundles nothing from another family.
8. The repository contains no game file, extracted asset, or trademark used as branding.
9. The workbench's examples are usable at desktop width, 375px, and 187px without overlap, clipping, or sideways scrolling.
10. Every size entry is within its limit and has a stated reason, and the performance gates pass.
11. Every component supports every theme and both densities, including `industrial-light` with `low`, without loss of function or accessibility.
12. The manual screen reader checklist has been run for the release, or the owner has named what was not run ([accessibility.md §13](accessibility.md)).
13. Each shipped locale is `reviewed` by a native reader, or is shipped as `draft` by the owner's decision ([localization.md §5](localization.md)).

## 10. Deliberately deferred

Each is a candidate for a later spec. None may be added without one.

- A searchable combobox, until its accessibility behavior is specified and tested on its own.
- An interaction-sound adapter: an optional package that maps existing component events to audio the application supplies, off until enabled from a user gesture, never the only carrier of information, with no audio bundled. Core needs no change for it.
- A multiline text field, radio group, date and time inputs, file input, a menu component (the popover supplies the surface and focus behavior), a data table, a tree, a vertical slider, and drag-to-resize windows.
- A window manager: z-order beyond the top layer, snapping, minimizing, and persisted positions.
- Virtualized lists and per-subtree message locales.

## Gaps

- **1.0 is not released.** Versions are `0.0.0`. Criterion 12 has not been run for any combination, criterion 13 is unmet (all five translations are drafts), and criterion 5's baselines have not been compared with an amd64 CI render ([testing.md](testing.md) Gaps).
- **Cross-component protocol methods are public.** They inflate the 1.0 surface that criterion 2 freezes ([package-contract.md](package-contract.md) Gaps).
