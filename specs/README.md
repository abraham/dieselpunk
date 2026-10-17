# Industrial UI Specifications

Living specifications for `@dieselpunk/core` and `@dieselpunk/locales`. Each one describes the ideal design of one part of the system as it should be today, not the order in which it was built. When the code and a spec disagree, the pull request that notices it either fixes the code or changes the spec. Neither is left to drift.

## Index

| Spec                                                   | Owns                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [product.md](product.md)                               | Purpose, goals, non-goals, design principles, release criteria                                                         |
| [components.md](components.md)                         | The component catalog: every implemented and planned component, its purpose, and its status                            |
| [toolchain.md](toolchain.md)                           | Repository layout, TypeScript and Node, builds, scripts, dependencies                                                  |
| [package-contract.md](package-contract.md)             | Exports, registration, naming, events, development warnings, the manifest, the API snapshot, versioning                |
| [visual-system.md](visual-system.md)                   | Tokens, themes, density, contrast, surfaces, focus, forced colors, motion, typography, responsive layout               |
| [component-model.md](component-model.md)               | `PunkElement`, base classes, controllers, pure logic modules, properties, ownership, composition                       |
| [accessibility.md](accessibility.md)                   | Names, roles, cross-shadow ARIA, non-color cues, targets, reflow, live regions, manual testing                         |
| [keyboard-and-selection.md](keyboard-and-selection.md) | Roving focus, grid navigation, selection, activation; slot grid, tabs, toolbar, accordion, menu, toggle group, list    |
| [overlays.md](overlays.md)                             | Top layer, the Escape stack, modality, anchoring; tooltip, popover, window, dialog, toast, drawer                      |
| [forms.md](forms.md)                                   | Form association, values and defaults, validation, labels; the ten form controls and the fieldset                      |
| [inventory-and-readouts.md](inventory-and-readouts.md) | Receptacles and readouts; slot, item stack, recipe, progress bar, meter, status light, production stat, connection row |
| [data-display.md](data-display.md)                     | Data and status in the page; table, alert, badge, spinner, keyboard key, description list                              |
| [layout-and-actions.md](layout-and-actions.md)         | Panel, divider, stack, cluster, button, icon button, breadcrumb, pagination                                            |
| [localization.md](localization.md)                     | Messages, locale changes, the locales package, translation gates, number formatting, direction                         |
| [performance.md](performance.md)                       | Size budgets, runtime cost rules, and the deterministic gates that hold them                                           |
| [testing.md](testing.md)                               | Test layers, the gallery, engines, visual regression, mutation checking, the gate list, the testing package            |
| [ci.md](ci.md)                                         | The CI workflows: jobs, shared setup, splitting by gallery group, generated matrices, change detection, budgets        |
| [workbench.md](workbench.md)                           | The Storybook workbench, its examples, guides, and smoke test, and its publication at dieselpunk.dev                   |

Read [product.md](product.md) first. The architecture specs can then be read in any order; each names the specs it depends on.

## Conventions

- **Normative text.** A plain statement is a requirement. Rationale is marked **Why**, and examples are marked as such.
- **Ideal, with gaps.** A spec describes the target design. Where the code falls short today, the spec's **Gaps** section names the shortfall and what closing it means. A gap is open work, not a permanent exception, and it is removed from the spec when it is closed.
- **Verification.** Each spec ends with the tests and gates that enforce it. A requirement that no gate checks says so.
- **No duplicated generated facts.** The names and types of attributes, properties, methods, events, slots, parts, and CSS properties are recorded by the Custom Elements Manifest and [`packages/core/api.snapshot.json`](../packages/core/api.snapshot.json). Measured sizes are recorded by `.size-limit.json` and `.size-limit.reasons.json`. Specs describe behavior, and name API only where behavior depends on it.
- **No history.** Specs do not record when or in which order something was built; commits and pull requests do. The reason for a decision stays, because it is what stops the decision from being undone by accident.
- **Citations.** Specs cite each other by file and section number (`overlays.md §3`). Code comments cite specs the same way.
- **Changes.** A change in behavior updates its spec in the same pull request. A new component gets a section in the spec of its family. A new architecture area gets a new file and a row in the index above.

## Relation to the earlier documents

These specs replace `SPEC.md` and `SPEC-PHASE-1.md` to `SPEC-PHASE-4.md`, the original product specification and the delivery plans of the four phases, which are deleted and remain in git history. Code comments cite these specs instead.
