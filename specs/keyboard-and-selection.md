# Keyboard, Focus, and Selection

**Scope:** the shared keyboard model, roving focus, activation, the selection model, and grid navigation; and the four composite widgets built on them: slot grid, tabs, toolbar, and accordion.
**Code:** `src/internal/roving.ts`, `roving-keys.ts`, `selection-model.ts`, `grid-navigation.ts`, `tab-navigation.ts`, `selectable-base.ts`; `src/components/slot-grid/`, `tabs/`, `toolbar/`, `accordion/`.

## 1. Keyboard model

These rules hold in every component:

- **Tab** moves between standalone controls and composite widgets. A composite has exactly one tab stop.
- **Arrow keys** move within a composite. **Nothing wraps**: at the first or last item a key does nothing.
- **Right to left** swaps the horizontal arrows. Direction is read with `:dir(rtl)`, which reads no layout.
- **Disabled and hidden items are skipped** by arrows, `Home`, and `End`.
- **Modifiers are the browser's.** A key with Ctrl, Alt, or Meta is ignored unless a table below claims it (`Ctrl+Home`, `Ctrl+A`).
- **Keys are not stolen from content.** A key pressed in focusable content slotted into an item is left alone, and a key whose default is already prevented is ignored.
- **Focus is not selection.** Moving focus never changes a selection, except where a pattern says so (automatic tab activation).
- **Escape** closes the topmost dismissible overlay and nothing else ([overlays.md §2](overlays.md)).
- **Key handling reads no layout**, except a vertical move in the slot grid, which reads each item's rectangle once per keypress.
- **Events report the user.** A component emits its change event when the user changes something, not when the application does ([package-contract.md §5](package-contract.md)).

## 2. Roving focus

`RovingController` keeps one tab stop among a group of items.

- `new RovingController({ host, items, orientation })`; `connect()` listens on the host, `refresh()` recomputes the tab stop when items or their disabled state change, `focus(item)` moves the stop and focus together, `current` is the item that holds it, and `disconnect()` gives every item its own tab stop back.
- Arrows (by orientation), `Home`, and `End` move focus. Focus that arrives another way (a click, script) moves the stop with it.
- **Items are asked, not assumed.** An item takes part through the roving item protocol: `isDisabled`, `focusItem()`, and `setTabStop(on)`, with `setTabStop(null)` handing control back ([package-contract.md §9](package-contract.md)). The button base, the toggles, and tabs implement it, since their focus target may not be the host. A native button or link is adapted by writing `tabindex` and restoring the author's.
- The pure part is `nextRovingIndex(key, from, disabled, { orientation, rtl })`.
- It reads no layout and creates no observer.

## 3. Activation

Items that act like buttons without being native buttons (slot, item stack, recipe, checkbox, switch, tab) activate the native way:

- **Enter** activates on key down, once per press.
- **Space** activates on key up, only if it was pressed on the same item, and never scrolls the page. A held Space does not repeat.
- **Click** activates. A click on a disabled item is stopped before any listener after the component's own.
- Keys do not synthesize a `click`, so a container that selects on click does not select on Enter.
- A container claims a key it handles by preventing its default in a capture listener, before the item sees it. That is how Space selects in a selecting grid instead of activating, while Enter, which the grid does not claim, still activates.

## 4. Selection model

`SelectionModel` holds ordered keys, a mode, the selected set, and an anchor, with no DOM.

| Operation                  | `single`                               | `multiple`                                                  |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `select(key)`              | Replaces the selection                 | Replaces the selection and sets the anchor                  |
| `toggle(key)`              | Selects; never clears                  | Adds or removes, and sets the anchor                        |
| `extendTo(key)`            | As `select`                            | Selects every key from the anchor to `key`, inclusive       |
| `selectAll()`              | Nothing                                | Selects every enabled key                                   |
| `clear()`                  | Clears                                 | Clears                                                      |
| `set(keys)`                | Selects the first valid key            | Selects exactly the valid keys; the last becomes the anchor |
| `setItems(keys, disabled)` | Drops selected keys that left          | Same                                                        |
| `setMode(mode)`            | Narrowing keeps the first selected key | `none` clears; widening keeps the selection                 |

In `none` every operation except `clear` and `setItems` does nothing. A disabled key is never newly selected; a selected key that becomes disabled stays selected until an operation replaces the selection. A duplicate key counts once, at its first position. Each operation returns `{ selected, changed }`: the selection in item order, and whether it differs as a set, so reordering alone is not a change.

## 5. Grid navigation

`nextIndex(key, from, items, { direction, ctrl })` takes item rectangles in any one coordinate space and returns the next index, or `from`.

- **Horizontal** keys move one item in reading order (swapped in `rtl`) and continue onto the next or previous row, since knowing where a row ends would need layout. This path (`stepIndex`) takes only which items are disabled.
- **Vertical** keys move to the item in the adjacent row whose horizontal center is nearest; a tie goes to the earlier item. Rows are runs of items in document order that start within half an item height of the run's first item, so the column count need not be stored, and a common offset, scale, scroll, or sub-pixel jitter cancels out. Rows with no enabled item are passed over.
- **Home** and **End** go to the first and last enabled item of the focused row, in document order. **Ctrl+Home** and **Ctrl+End** go to the first and last enabled item of the grid.

## 6. Slot grid

`punk-slot-grid` is a responsive, keyboard-navigable grid of `punk-slot` and `punk-item-stack` children.

**Layout.** CSS Grid with square tracks of `--punk-slot-size` and a `--punk-slot-gap`. `columns` is the most columns wanted; a narrower container drops columns before slots shrink, down to one column, and a slot is never smaller than its size.

**Roles.**

| `selection`      | Host                                     | Items    | Item state      |
| ---------------- | ---------------------------------------- | -------- | --------------- |
| `none` (default) | `group`                                  | `button` | none            |
| `single`         | `listbox`                                | `option` | `aria-selected` |
| `multiple`       | `listbox`, `aria-multiselectable="true"` | `option` | `aria-selected` |

**Why not `grid`:** the ARIA grid needs rows and cells, and a CSS wrap point is not a row. **Why roving `tabindex`, not `aria-activedescendant`:** the items are light-DOM children and an id reference from the grid's shadow root cannot reach them.

The application names the grid with `aria-label`; a missing name warns.

**Keyboard** (horizontal keys swap in `rtl`):

| Key                          | Effect                                                  |
| ---------------------------- | ------------------------------------------------------- |
| Arrows                       | Move focus per §5                                       |
| `Home`, `End`                | First and last item of the row                          |
| `Ctrl+Home`, `Ctrl+End`      | First and last item of the grid                         |
| `Space`                      | `single`: select. `multiple`: toggle. `none`: activate  |
| `Enter`                      | Activate (`punk-activate`); never changes the selection |
| `Shift+Arrow` (multiple)     | Move focus and extend the selection from the anchor     |
| `Ctrl+A`, `Cmd+A` (multiple) | Select every enabled item                               |

**Pointer.** A click selects (single), toggles (multiple), or does neither (none), and always activates. Shift-click extends in `multiple`. The grid handles clicks in the capture phase, so the selection is current when `punk-activate` reaches a listener.

**Tab stop.** One item. Tab enters at the item that last had focus, else the first selected, else the first enabled; a second Tab leaves. The stop survives items being added, removed, and disabled.

**Selection and values.** Items identify themselves by `value`. `values` reads the selected values (a copy) and selects by value when assigned (copying the array); assigned before items exist, it applies when they arrive. `punk-selection-change` carries `{ values, items }` once per user change; `values` leaves out items with no `value`, and `items` does not. Assigning `values`, changing `selection`, and adding or removing items send nothing. If the application sets `selected` on a managed item, the grid puts it back.

**Ownership.** The grid owns its items' `role`, `tabindex`, `aria-selected`, and `selected` ([component-model.md §8](component-model.md)). An item outside a grid is a `button` with `aria-pressed` once its `selected` has been set. A removed item gets its own role and tab stop back. Disabling the grid disables the items not already disabled and remembers which, so enabling it restores exactly those.

**Warnings:** no name; a child that is not an item; two items with the same non-empty `value`; an item in a selecting grid with no `value`.

## 7. Tabs

`punk-tabs` with `punk-tab` children in its `tab` slot.

- The tab list is `role="tablist"` with `aria-orientation` and the application's `aria-label`, copied from the host. Each tab host is `role="tab"` with `aria-selected`, `aria-controls`, and a roving `tabindex`, and is named by its text.
- **Panels.** A tab names its panel by id in `panel`, resolved in the tab's root node, so the panel may be inside `punk-tabs` (default slot) or beside it. The tabs own each managed panel's `role="tabpanel"`, `aria-labelledby`, `hidden`, and, when the panel has no tabbable content, `tabindex="0"`. Everything is restored when a tab leaves or the tabs disconnect. A panel's own `display` rule overrides `hidden`, and the docs say so.
- **Activation** is `auto` (focus selects) or `manual` (Enter or Space selects).

| Key                                      | Effect                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `Left`, `Right` (vertical: `Up`, `Down`) | Previous or next enabled tab; in `auto`, also select it                       |
| `Home`, `End`                            | First or last enabled tab; in `auto`, also select it                          |
| `Enter`, `Space`                         | In `manual`, select the focused tab                                           |
| `Tab`                                    | To the selected panel if it is focusable or has tabbable content, else onward |

- The first enabled tab is selected when none is. Removing the selected tab selects the nearest enabled one, forward first. `value` (the selected tab's `panel`) can be read and assigned; assigned before tabs exist, it applies when they arrive.
- `punk-tab-change` carries `{ value, tab, panel }` for user changes.
- **Look.** The tab list wraps onto more rows and never scrolls sideways. The selected tab is inset with a 3px `accent` bar on the edge facing the panel; others have none.
- **Panels that are parsed late.** A panel after the tabs in the markup may not exist yet; a missing panel is not reported while `document.readyState` is `loading`, and the tabs look again on `DOMContentLoaded`.
- **Warnings:** no name; a tab naming a missing panel; two tabs naming one panel.

## 8. Toolbar

`punk-toolbar` is a fixed-height strip with a minimum height, `role="toolbar"`, `aria-orientation="horizontal"`, and the application's `aria-label`.

- **Items** are direct children that are a `punk-button`, `punk-icon-button`, `punk-checkbox`, `punk-switch`, `button`, or `a[href]`, or that have `data-punk-toolbar-item`. A `punk-divider`, `hr`, or `[role="separator"]` is a separator and is skipped. A select, text field, number field, or slider keeps its own tab stop outside the group, since each uses the arrow keys itself (APG). Anything else is ignored.
- **Roving.** `RovingController` keeps one tab stop; `Left`, `Right` (swapped in `rtl`), `Home`, and `End` move without wrapping. Tab enters at the item that last had focus, else the first.
- **Overflow.** With content in the `overflow` slot (the application's trigger) and without `wrap`, one `ResizeObserver` on the strip and a measurement on `slotchange` decide which trailing items do not fit. They get `data-punk-overflow`, are hidden and left out of the roving group, and the trigger shows. `punk-overflow-change` lists them in order so the application can fill its own menu; the toolbar builds none. A separator never ends the visible run and is never reported. Items never reorder. Focus on an item that overflows moves to the trigger. The measurement runs on resize and on child changes, not when an item's own content changes.
- **Without an overflow slot** nothing is hidden, the strip scrolls inside itself, and it warns once.
- **`wrap`** lets the strip grow taller and its items shrink, with no observer.

## 9. Accordion

`punk-accordion` with `punk-accordion-item` children.

- Each item renders a heading (`role="heading"` with `aria-level` from `level`, 1 to 6, default 3) holding a native `<button aria-expanded>`, and a panel with `role="region"` labeled by the button, both in the item's shadow tree. A collapsed panel is `hidden`; there is no height animation.
- **Single mode** (default): expanding an item collapses the others, whether the user, a property, or an attribute expanded it. The open item can be collapsed, so none may be open. Several expanded at connection keep the first and warn once. **`multiple`** allows any number.
- **Every enabled header is a tab stop**, as in the APG accordion; there is no roving. `Up` and `Down` move between enabled headers without wrapping, and `Home` and `End` go to the first and last; the keys act only when they come from a header, so arrows in a field inside a panel are left alone. Enter and Space are the native button's.
- The indicator is a plus when collapsed and a minus when expanded.
- `punk-toggle` carries `{ expanded }` for user changes.
- An out-of-range `level` is clamped and warns.

## Verification

- Node: `selection-model.test.ts`, `grid-navigation.test.ts`, `roving.test.ts`, `tab-navigation.test.ts`, covering every table row, disabled items, removed keys, empty lists, unequal rows, and `rtl`.
- Browser: each component's tests cover every key table in `ltr` and `rtl`, both orientations and activation modes, tab-stop survival, events once per user change and never for script changes, ownership restoration, and the warnings.
- `test/browser/perf.test.ts`: a 100-item grid listens once on itself, reads no layout on a horizontal key and one rectangle per item on a vertical key, changes two `tabindex` values per move, and re-renders only the items whose selection changed.
- `perf-shell.test.ts`: one `ResizeObserver` per non-wrapping toolbar, none with `wrap`, no layout read on an arrow key.
- `aria.spec.ts`: slot grid in each mode, tabs with panels inside and beside, toolbar, accordion.

## Gaps

- **Tabs reimplement roving.** `punk-tabs` handles keys itself because `RovingController` has no hook for activation. Closing it: give the controller an `onMove(item, key)` hook that tabs use for automatic and manual activation, and delete the duplicate key handling.
- **The listbox grid's screen reader behavior is unverified** ([accessibility.md](accessibility.md) Gaps).
