# Component Catalog

**Scope:** every component the library has or plans to have, what each is for, and its status. This is the one list; [product.md §6](product.md) summarizes it, and each component's behavior lives in the family spec named in its row.

## 1. Statuses

| Status           | Meaning                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented**  | Built, tested in Chromium, Firefox, and WebKit, documented in the workbench, and recorded in the API snapshot. Covered by the release criteria ([product.md §9](product.md)). |
| **Planned (P1)** | Needed for general-purpose use: a typical application cannot be built without it, or without hand-rolling an inaccessible equivalent.                                         |
| **Planned (P2)** | Common in applications, but an application can compose it today from existing components and native elements.                                                                 |
| **Not planned**  | Considered and left out, with the reason (§5).                                                                                                                                |

A planned component is built only after its section exists in its family spec, with its semantics, keyboard model, events, non-color cues, and warnings. It then follows every architecture spec like the rest: one registration entry per family, no other `punk-` component rendered inside it ([component-model.md §9](component-model.md)), the size budget ([performance.md §2](performance.md)), and the gallery and gates ([testing.md](testing.md)).

**General purpose, one look.** The planned components extend the library from factory and inventory screens to whole applications (settings, data, navigation, and forms) in the same industrial visual language. They add no second theme family and no game logic.

## 2. Implemented

63 tags in 54 registration entries.

### 2.1 Layout and surfaces

| Tag             | Purpose                                                                                 | Status      | Spec                                               |
| --------------- | --------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| `punk-panel`    | A structural metal surface (raised, inset, flat) with optional header and footer strips | Implemented | [layout-and-actions.md §1](layout-and-actions.md)  |
| `punk-divider`  | An etched separator, horizontal or vertical, with an optional label                     | Implemented | [layout-and-actions.md §2](layout-and-actions.md)  |
| `punk-stack`    | A vertical layout primitive with token-based gaps                                       | Implemented | [layout-and-actions.md §3](layout-and-actions.md)  |
| `punk-cluster`  | A wrapping horizontal layout primitive with token-based gaps                            | Implemented | [layout-and-actions.md §3](layout-and-actions.md)  |
| `punk-splitter` | Two panes with a draggable, keyboard-operable divider                                   | Implemented | [layout-and-actions.md §10](layout-and-actions.md) |

### 2.2 Actions

| Tag                | Purpose                                                                   | Status      | Spec                                              |
| ------------------ | ------------------------------------------------------------------------- | ----------- | ------------------------------------------------- |
| `punk-button`      | A labeled action with variants, sizes, loading, and form submit and reset | Implemented | [layout-and-actions.md §5](layout-and-actions.md) |
| `punk-icon-button` | A square icon-only action with a required label shown as its tooltip      | Implemented | [layout-and-actions.md §6](layout-and-actions.md) |

### 2.3 Navigation and disclosure

| Tag                                       | Purpose                                                                                                 | Status      | Spec                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `punk-tabs`, `punk-tab`                   | Switch between panels of one view, with automatic or manual activation                                  | Implemented | [keyboard-and-selection.md §7](keyboard-and-selection.md)  |
| `punk-toolbar`                            | A strip of actions with one tab stop and an application-supplied overflow menu                          | Implemented | [keyboard-and-selection.md §8](keyboard-and-selection.md)  |
| `punk-accordion`, `punk-accordion-item`   | Collapsible sections for settings and categories, single or multiple open                               | Implemented | [keyboard-and-selection.md §9](keyboard-and-selection.md)  |
| `punk-menu`, `punk-menu-item`             | A menu of commands, checkable items, and radio items, with separators and submenus; also a context menu | Implemented | [keyboard-and-selection.md §10](keyboard-and-selection.md) |
| `punk-toggle-group`                       | A set of pressed-state buttons, single or multiple: view modes, alignment, filters                      | Implemented | [keyboard-and-selection.md §11](keyboard-and-selection.md) |
| `punk-list`, `punk-list-item`             | A one-column list of rich rows, optionally selectable: file lists, queues, search results               | Implemented | [keyboard-and-selection.md §12](keyboard-and-selection.md) |
| `punk-menubar`                            | A persistent row of menus at the top of an application window                                           | Implemented | [keyboard-and-selection.md §13](keyboard-and-selection.md) |
| `punk-tree`, `punk-tree-item`             | Hierarchical navigation and selection: file trees, tech trees, category browsers                        | Implemented | [keyboard-and-selection.md §14](keyboard-and-selection.md) |
| `punk-breadcrumb`, `punk-breadcrumb-item` | The path to the current page or folder, collapsing its middle on request                                | Implemented | [layout-and-actions.md §7](layout-and-actions.md)          |
| `punk-pagination`                         | Moving through pages of a long result set                                                               | Implemented | [layout-and-actions.md §8](layout-and-actions.md)          |
| `punk-steps`, `punk-step`                 | Progress through a multi-step task, such as a setup wizard                                              | Implemented | [layout-and-actions.md §9](layout-and-actions.md)          |

### 2.4 Inventory

| Tag               | Purpose                                                                                 | Status      | Spec                                                      |
| ----------------- | --------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `punk-slot`       | A square receptacle for an item, recipe, tool, or equipment, selectable and activatable | Implemented | [inventory-and-readouts.md §2](inventory-and-readouts.md) |
| `punk-item-stack` | An item with its count, capacity, durability, and quality, in the same receptacle       | Implemented | [inventory-and-readouts.md §3](inventory-and-readouts.md) |
| `punk-slot-grid`  | A responsive, keyboard-navigable grid of slots with none, single, or multiple selection | Implemented | [keyboard-and-selection.md §6](keyboard-and-selection.md) |
| `punk-recipe`     | A selectable recipe tile with duration, availability, ingredients, and products         | Implemented | [inventory-and-readouts.md §4](inventory-and-readouts.md) |

### 2.5 Readouts

| Tag                    | Purpose                                                                         | Status      | Spec                                                       |
| ---------------------- | ------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `punk-progress-bar`    | Determinate or indeterminate progress of a task                                 | Implemented | [inventory-and-readouts.md §6](inventory-and-readouts.md)  |
| `punk-meter`           | A segmented gauge of a level within a range, with low, high, and optimum states | Implemented | [inventory-and-readouts.md §7](inventory-and-readouts.md)  |
| `punk-status-light`    | A compact status indicator: a shape and a word                                  | Implemented | [inventory-and-readouts.md §8](inventory-and-readouts.md)  |
| `punk-production-stat` | A metric with label, value, unit, trend, change, and an optional sparkline slot | Implemented | [inventory-and-readouts.md §9](inventory-and-readouts.md)  |
| `punk-connection-row`  | A source-to-destination connection with direction, status, and a remove action  | Implemented | [inventory-and-readouts.md §10](inventory-and-readouts.md) |

### 2.6 Data display

| Tag                     | Purpose                                                                                                      | Status      | Spec                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------- |
| `punk-table`            | Tabular data in a native table, with sortable headers, row selection, a sticky header, and its own scrolling | Implemented | [data-display.md §1](data-display.md) |
| `punk-alert`            | A persistent inline message (info, success, warning, danger) with optional heading, actions, and dismissal   | Implemented | [data-display.md §2](data-display.md) |
| `punk-badge`            | A small count or status label attached to a tab, button, or row                                              | Implemented | [data-display.md §3](data-display.md) |
| `punk-spinner`          | A standalone loading indicator for regions, not buttons                                                      | Implemented | [data-display.md §4](data-display.md) |
| `punk-kbd`              | A keyboard key, shown as a keycap; a shortcut is several in a row                                            | Implemented | [data-display.md §5](data-display.md) |
| `punk-description-list` | Label and value pairs for details and specification sheets                                                   | Implemented | [data-display.md §6](data-display.md) |
| `punk-tag`              | A chip for a filter, a chosen value, or a label, optionally removable                                        | Implemented | [data-display.md §7](data-display.md) |

### 2.7 Overlays and feedback

| Tag                              | Purpose                                                                      | Status      | Spec                           |
| -------------------------------- | ---------------------------------------------------------------------------- | ----------- | ------------------------------ |
| `punk-tooltip`                   | Supplemental text for an anchor on hover and keyboard focus                  | Implemented | [overlays.md §5](overlays.md)  |
| `punk-popover`                   | An anchored interactive surface, in content or menu mode                     | Implemented | [overlays.md §9](overlays.md)  |
| `punk-window`                    | A titled application window, optionally modal, movable, and dismissible      | Implemented | [overlays.md §7](overlays.md)  |
| `punk-dialog`                    | A modal confirmation or task surface                                         | Implemented | [overlays.md §8](overlays.md)  |
| `punk-toast-stack`, `punk-toast` | Transient notifications in persistent live regions, with pausable timers     | Implemented | [overlays.md §10](overlays.md) |
| `punk-drawer`                    | A panel that slides from an edge, modal or not: navigation, filters, details | Implemented | [overlays.md §11](overlays.md) |

### 2.8 Form controls

| Tag                              | Purpose                                                                                      | Status      | Spec                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ----------- | ------------------------ |
| `punk-checkbox`                  | A boolean or mixed choice that submits with a form                                           | Implemented | [forms.md §6](forms.md)  |
| `punk-switch`                    | An on/off setting that takes effect at once and submits with a form                          | Implemented | [forms.md §6](forms.md)  |
| `punk-slider`                    | A value chosen from a continuous or stepped range                                            | Implemented | [forms.md §7](forms.md)  |
| `punk-range-slider`              | A low and a high value chosen on one track                                                   | Implemented | [forms.md §18](forms.md) |
| `punk-text-field`                | Single-line text input with label, hint, affixes, and validation                             | Implemented | [forms.md §9](forms.md)  |
| `punk-number-field`              | Numeric input with bounds, step, and pointer steppers                                        | Implemented | [forms.md §10](forms.md) |
| `punk-select`                    | A single choice from a short native list                                                     | Implemented | [forms.md §11](forms.md) |
| `punk-radio-group`, `punk-radio` | One choice from a small visible set                                                          | Implemented | [forms.md §12](forms.md) |
| `punk-textarea`                  | Multiline text, with an optional count and growth                                            | Implemented | [forms.md §13](forms.md) |
| `punk-combobox`                  | A searchable choice from a long list, optionally free text                                   | Implemented | [forms.md §14](forms.md) |
| `punk-fieldset`                  | A titled group of controls with a shared description, error summary, and group-level disable | Implemented | [forms.md §15](forms.md) |
| `punk-date-field`                | A date, with the platform's picker                                                           | Implemented | [forms.md §16](forms.md) |
| `punk-time-field`                | A time of day, with the platform's picker                                                    | Implemented | [forms.md §16](forms.md) |
| `punk-file-field`                | Choosing files, with an optional drop zone and a list of the chosen files                    | Implemented | [forms.md §17](forms.md) |

## 3. Planned (P1)

None: every component that general-purpose use needs is implemented. The part of the P1 rows that was not built is a gap of its family spec: a combobox with several values ([forms.md](forms.md) Gaps). Menus deliberately do not open on hover ([keyboard-and-selection.md](keyboard-and-selection.md)), and the breadcrumb reveals its middle in place rather than in a menu ([layout-and-actions.md §7](layout-and-actions.md)).

## 4. Planned (P2)

| Tag(s)                                             | Purpose                                                                 | Basis                                                                                                                                                                                   | Spec                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Data modes of the slot grid, list, table, and tree | Collections of thousands of items with only the visible ones in the DOM | `@lit-labs/virtualizer`, as a peer dependency of an optional package, not core; `items` and `renderItem`, `aria-setsize` and `aria-posinset`, selection by value, roving focus by index | [performance.md §4.1](performance.md) |

## 5. Not planned

| Component                         | Reason                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Charts, sparklines, maps, sprites | Game-world and data graphics are application content; components provide slots for them ([product.md §3](product.md)).                         |
| A calendar date picker            | The native picker of `punk-date-field` is accessible in every engine; a custom calendar grid is a large accessibility surface for little gain. |
| A rich text editor                | Out of proportion to the library's size budget and scope; applications embed one.                                                              |
| Avatar, carousel, rating          | Not part of the industrial visual language, and composable from existing parts where needed.                                                   |
| A window manager                  | Z-order beyond the top layer, snapping, minimizing, and persisted positions are application state.                                             |

Flat lists of independent rows need no component: applications virtualize them with `@lit-labs/virtualizer` ([performance.md §4.1](performance.md)).

Capabilities of existing components that are deferred, not new components: a vertical slider, drag-to-resize windows, and per-subtree message locales. The interaction-sound adapter is a separate optional package, not a component ([product.md §10](product.md)).

## Gaps

- **No P2 component has its spec section yet.**
