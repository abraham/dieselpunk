# Keyboard, Focus, and Selection

**Scope:** the shared keyboard model, roving focus, activation, the selection model, and grid navigation; and the composite widgets built on them: slot grid, tabs, toolbar, accordion, menu, toggle group, list, menubar, and tree.
**Code:** `src/internal/roving.ts`, `roving-keys.ts`, `selection-model.ts`, `grid-navigation.ts`, `tab-navigation.ts`, `selectable-base.ts`; `src/components/slot-grid/`, `tabs/`, `toolbar/`, `accordion/`, `menu/`, `toggle-group/`, `list/`, `menubar/`, `tree/`.

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
- **Items are asked, not assumed.** An item takes part through the roving item protocol: `[itemDisabled]`, `[focusItem]()`, and `[setTabStop](on)`, with `[setTabStop](null)` handing control back, keyed by symbols from `internal/roving.ts` ([package-contract.md §9](package-contract.md)). The button base, the toggles, and tabs implement it, since their focus target may not be the host. A native button or link is adapted by writing `tabindex` and restoring the author's.
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
- **Look.** The tabs sit edge to edge, and the tab list wraps onto more rows and never scrolls sideways. When the panels are inside the tabs, they sit on one flat surface (`part="panels"`, padded by `--punk-tabs-padding`), and the selected tab takes that surface's fill and covers the seam below it, so it joins its panel: a cue of shape, not color. The other tabs recede to the `panel-inset` fill. When the panels are elsewhere the surface is hidden, and the selected tab is inset with a 3px `accent` bar on the edge facing the panel. Under forced colors the selected tab always has the bar, in `Highlight`. **Why** a join and not the selection outline of [visual-system.md §5](visual-system.md): an outline would draw a line between the tab and the panel it opens.
- **Panels that are parsed late.** A panel after the tabs in the markup may not exist yet; a missing panel is not reported while `document.readyState` is `loading`, and the tabs look again on `DOMContentLoaded`.
- **Warnings:** no name; a tab naming a missing panel; two tabs naming one panel.

## 8. Toolbar

`punk-toolbar` is a fixed-height strip with a minimum height, `role="toolbar"`, `aria-orientation` from `orientation`, and the application's `aria-label`. The strip is the inset surface, darker than a panel, so the raised controls on it stand out by value as well as by bevel.

- **Items** are direct children that are a `punk-button`, `punk-icon-button`, `punk-checkbox`, `punk-switch`, `button`, or `a[href]`, or that have `data-punk-toolbar-item`. A `punk-divider`, `hr`, or `[role="separator"]` is a separator and is skipped. A select, text field, number field, or slider keeps its own tab stop outside the group, since each uses the arrow keys itself (APG). Anything else is ignored.
- **Roving.** `RovingController` keeps one tab stop; `Left`, `Right` (swapped in `rtl`), `Home`, and `End` move without wrapping. Tab enters at the item that last had focus, else the first.
- **Overflow.** With content in the `overflow` slot (the application's trigger) and without `wrap`, one `ResizeObserver` on the strip and a measurement on `slotchange` decide which trailing items do not fit. They get `data-punk-overflow`, are hidden and left out of the roving group, and the trigger shows. `punk-overflow-change` lists them in order so the application can fill its own menu; the toolbar builds none. A separator never ends the visible run and is never reported. Items never reorder. Focus on an item that overflows moves to the trigger. The measurement runs on resize and on child changes, not when an item's own content changes.
- **Without an overflow slot** nothing is hidden, the strip scrolls inside itself, and it warns once.
- **`wrap`** lets the strip grow taller and its items shrink, with no observer.
- **`orientation="vertical"`** makes the strip a column as wide as its widest item, with `aria-orientation="vertical"`. `Up` and `Down` move instead of `Left` and `Right`; `Home` and `End` are the same. It is at most as tall as its container (`max-block-size: 100%`), and overflow measures heights against that: since a column is only as tall as its items, the one `ResizeObserver` also watches the container, so more room shows hidden items again. A separator in a vertical toolbar is a horizontal `punk-divider` or an `hr`.

## 9. Accordion

`punk-accordion` with `punk-accordion-item` children.

- Each item renders a heading (`role="heading"` with `aria-level` from `level`, 1 to 6, default 3) holding a native `<button aria-expanded>`, and a panel with `role="region"` labeled by the button, both in the item's shadow tree. A collapsed panel is `hidden`; there is no height animation.
- **Single mode** (default): expanding an item collapses the others, whether the user, a property, or an attribute expanded it. The open item can be collapsed, so none may be open. Several expanded at connection keep the first and warn once. **`multiple`** allows any number.
- **Every enabled header is a tab stop**, as in the APG accordion; there is no roving. `Up` and `Down` move between enabled headers without wrapping, and `Home` and `End` go to the first and last; the keys act only when they come from a header, so arrows in a field inside a panel are left alone. Enter and Space are the native button's.
- The indicator is a plus when collapsed and a minus when expanded.
- **Look.** A collapsed header is raised; an expanded one is pressed in, and its content meets it with no gap and square inner corners, as a panel's header strip meets its body, so an open item reads as one framed section.
- `punk-toggle` carries `{ expanded }` for user changes.
- An out-of-range `level` is clamped and warns.

## 10. Menu

`punk-menu` with `punk-menu-item` children: the APG menu, in the top layer and on the Escape stack like the popover ([overlays.md §2](overlays.md), [§4](overlays.md)). The popover's menu mode remains for menus of the application's own markup; this family owns its items.

- **Trigger.** Resolved as an overlay's anchor (`for`, else the previous sibling) and wired with `aria-haspopup="menu"` and `aria-expanded`. A click, Enter, or Space toggles the menu; Down opens it on the first enabled item and Up on the last. Opening always moves focus to an item.
- **Items.** A `punk-menu-item` host is `role="menuitem"`, `menuitemcheckbox` (`type="checkbox"`), or `menuitemradio` (`type="radio"`), with `aria-checked` for the last two, `aria-disabled`, and `tabindex="-1"`. Its text is its name; the `shortcut` slot is shown and hidden from assistive technology, so the application adds `aria-keyshortcuts`. The menu host is `role="menu"` while open. Separators are `hr`, `punk-divider`, or `role="separator"` children.

| Key                                    | Effect                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `Up`, `Down`                           | Previous or next enabled item, without wrapping                                         |
| `Home`, `End`                          | First or last enabled item                                                              |
| A letter                               | The next enabled item whose text starts with it                                         |
| `Enter`, `Space`                       | Activate the item (a click); on an item with a submenu, open it on its first item       |
| `Right` (`Left` in `rtl`)              | On an item with a submenu, open it on its first item                                    |
| `Left` (`Right` in `rtl`) in a submenu | Close the submenu and return to its item                                                |
| `Escape`                               | Close the innermost open menu (the stack) and return focus to its trigger               |
| `Tab`                                  | Close every menu, put focus on the root trigger, and let the browser move on from there |

- **Activation** sends `punk-activate` (`{ value, item }`) from the item. A checkbox item toggles; a radio item is chosen among the radio items between the nearest separators; both keep the menu open. A plain item closes every open menu with reason `action` and returns focus to the root trigger. A disabled item's click is stopped before any listener after the item's own.
- **Submenus.** A `punk-menu` placed right after an item is that item's submenu: a sibling, never a child, so its text never joins the item's name ([overlays.md §4](overlays.md)). The item gets `aria-haspopup` and `aria-expanded` and shows an arrow. A submenu opens at the item's end edge; one submenu of a menu is open at a time; closing a menu closes its submenus silently.
- **No opening on hover.** Menus and submenus open only by click, keys, or `show()`; resting the pointer on an item never opens its submenu. **Why:** hover opening needs delays and a pointer-intent path to avoid closing a submenu as the pointer crosses other items, touch and pen have no hover, and a menu that opens on its own contradicts "hover reveals supplemental information only" ([product.md](product.md)).
- **Light dismissal.** A press outside the root menu (submenus are inside it) closes every menu with reason `outside`; a press on a button trigger is left to its click.
- **Context menus.** With `context` the trigger is an area and gets no popup ARIA: its `contextmenu` event (a right click, the context-menu key, Shift+F10) opens the menu at the pointer, or at the area when the event has no position, and a press anywhere outside the menu closes it.
- **Placement.** Below the trigger at its start edge (a submenu: beside the item at its top), flipped and shifted to stay in the viewport. Listeners exist only while open: one for presses outside (root only), and frame-throttled `scroll` and `resize`.
- `punk-open` and `punk-close` (`escape`, `outside`, `tab`, `action`, `method`) report every change of `open`.
- **Warnings:** no trigger; no enabled item to focus.

## 11. Toggle group

`punk-toggle-group` with native `<button>` children identified by `value`, styled through `::slotted(button)`, so the buttons stay the application's.

- **`selection="single"`** (the default): the group element in the shadow tree is a `radiogroup`, each button `role="radio"` with `aria-checked`. The arrow keys move and choose together, as in a radio group, and the chosen button is the tab stop. Once chosen, one stays pressed.
- **`selection="multiple"`**: a `group` of toggle buttons with `aria-pressed`. The arrow keys only move focus; a click, Enter, or Space (the native button's own) presses or releases. The tab stop is the button last focused, else the first pressed, else the first.
- **Keys.** `Left` and `Right` (swapped in `rtl`), `Up` and `Down`, `Home` and `End`, skipping disabled buttons, without wrapping.
- **Values.** `values` reads and assigns the pressed values (copies). Before anything is assigned, buttons the markup marked `aria-pressed="true"` or `aria-checked="true"` start pressed. `punk-selection-change` carries `{ values, items }` once per user change.
- **Ownership.** The group owns each button's `role`, `aria-checked`, `aria-pressed`, and `tabindex`, and restores the author's values when a button leaves or the group disconnects. `disabled` disables the buttons that were enabled, and enables exactly those again.
- The group is named by the host's `aria-label`, copied to the inner group.
- **Look.** A pressed button is set into the strip with the inset bevel and a warm `accent` outline, the selection marker of [visual-system.md §5](visual-system.md); under forced colors it is `Highlight` with a double border.
- **Warnings:** no name; a child that is not a `<button>`.

## 12. List

`punk-list` with `punk-list-item` children: one column of rich rows. Items extend `PunkSelectableBase` and are owned by the list as the slot grid owns its items ([§6](#6-slot-grid)).

| `selection`      | Host                                     | Items      | Focus                       |
| ---------------- | ---------------------------------------- | ---------- | --------------------------- |
| `none` (default) | `list`                                   | `listitem` | None; rows hold the actions |
| `single`         | `listbox`                                | `option`   | One tab stop, roving        |
| `multiple`       | `listbox`, `aria-multiselectable="true"` | `option`   | One tab stop, roving        |

- **Keys** in a selecting list: `Up` and `Down` move focus without wrapping and skip disabled items, `Home` and `End` go to the ends, `Space` selects (`single`) or toggles (`multiple`), `Shift+Up` and `Shift+Down` extend from the anchor, `Ctrl+A` or `Cmd+A` selects every enabled item, and `Enter` activates. Moving focus never selects.
- **Pointer.** A click selects or toggles, Shift-click extends, and both also activate; the list handles clicks and Space in the capture phase, as the grid does ([§3](#3-activation)).
- **Tab stop.** The item last focused, else the first selected, else the first enabled.
- **Values.** Items are identified by `value`. `values` reads and assigns (copies); assigned before items exist, it applies when they arrive; before anything is assigned, items marked `selected` start selected. `punk-selection-change` carries `{ values, items }` once per user change.
- **Rows.** A start slot, the text, a description below it, and an end slot. All of the row's text is its name. A selected row shows a check and an `accent` bar on its start edge. A disabled row dims all of its text, the description and slots included, not only its name.
- **Warnings:** no name; a child that is not an item; items without distinct, non-empty values in a selecting list.

## 13. Menubar

`punk-menubar`: a persistent row of menus at the top of an application window, the APG menubar built from the menu family ([§10](#10-menu)). Each `punk-menu-item` child is a menubar item, and the `punk-menu` right after it is its menu, since a menu's trigger is its previous sibling. Its register entry registers the menu family too, as the icon button's registers the tooltip.

- **Semantics.** A `role="menubar"` row with `aria-orientation="horizontal"` in the shadow tree, named by the host's `aria-label`. The items are `menuitem`s that their menus wire with `aria-haspopup="menu"` and `aria-expanded`. A menu item in a menubar draws no submenu arrow, since its menu opens below it.
- **The row** is one tab stop through `RovingController`: `Left` and `Right` (swapped in `rtl`) move among the items, skipping disabled ones, without wrapping ([§1](#1-keyboard-model)), and `Home` and `End` go to the ends. `Enter`, `Space`, `Down`, or a click opens an item's menu on its first item, and `Up` on its last; a click on an open item's trigger closes it.
- **An open menu.** `Left` and `Right` close it and open the previous or next enabled item's menu on its first item, stopping at the ends. A submenu's own keys come first: `Right` on an item with a submenu opens it, and `Left` in a submenu closes it. `Escape` closes the menu and returns to its item, an action closes it and returns to its item, and `Tab` closes it and leaves the row. These are the menu's own behaviors.
- **No opening on hover**, as for menus.
- **Look.** The toolbar's flat strip, wrapping rather than scrolling, with the menu items' own hover and focus.
- **Warnings:** no name; no items.

## 14. Tree

`punk-tree` with nested `punk-tree-item` children: hierarchical navigation and selection, the APG tree view. `selection` (`none`, the default, `single`, `multiple`) and `values`, as the list's.

- **Semantics.** The host is `role="tree"` (with `aria-multiselectable` in `multiple`), named by its `aria-label`. Each item host is a `treeitem` named by its `label` (copied to `aria-label`, so its children's text never joins its name), with `aria-level` from its nesting, `aria-expanded` while it has child items, and `aria-disabled`; its children sit in a `role="group"` in its shadow tree, shown only while it is `expanded`. The tree writes `aria-selected` in a selecting tree, and `tabindex`. A parent draws a triangle that turns toward its children while they show.
- **Keys.** One tab stop: the item last focused, else the first selected one that shows, else the first. `Up` and `Down` move among the enabled items that show, without wrapping; `Home` and `End` go to the first and last. `Right` (`Left` in `rtl`) expands a closed parent and moves into an open one; `Left` collapses an open parent or moves to the item's parent. `*` expands every sibling of the item. A letter moves to the next item whose label starts with it. `Enter` sends `punk-activate` (`{ value, item }`) from the item; in a tree that does not select, so does `Space`.
- **Selection.** `Space` and a click select (`single`) or toggle (`multiple`) through `SelectionModel` ([§4](#4-selection-model)), and `Ctrl+A` or `Cmd+A` selects every enabled item in `multiple`, hidden ones included. A click also activates. `punk-selection-change` carries `{ values, items }` once per change the user makes, never for `values` from code. Before anything is assigned, items marked `selected` start selected. A selected row shows a check and an `accent` bar on its start edge, a border under forced colors.
- **Expanding.** A click on a parent's triangle, the keys, or `*` expand and collapse, and send `punk-toggle` (`{ expanded }`) from the item; setting `expanded` from code sends nothing. Collapsing an item that holds focus deeper inside moves focus to it.
- **Ownership.** The tree owns every item, nested ones included, through the owner protocol ([component-model.md §8](component-model.md)); an item reports changes to its value, state, and children, and is let go when it leaves.
- **Warnings:** no name; a child that is not an item; items without distinct, non-empty values in a selecting tree.

## Verification

- Node: `selection-model.test.ts`, `grid-navigation.test.ts`, `roving.test.ts`, `tab-navigation.test.ts`, covering every table row, disabled items, removed keys, empty lists, unequal rows, and `rtl`.
- Browser: each component's tests cover every key table in `ltr` and `rtl`, both orientations and activation modes, tab-stop survival, events once per user change and never for script changes, ownership restoration, and the warnings.
- `test/browser/perf.test.ts`: a 100-item grid listens once on itself, reads no layout on a horizontal key and one rectangle per item on a vertical key, changes two `tabindex` values per move, and re-renders only the items whose selection changed.
- `perf-shell.test.ts`: one `ResizeObserver` per non-wrapping toolbar, none with `wrap`, no layout read on an arrow key.
- `aria.spec.ts`: slot grid in each mode, tabs with panels inside and beside, toolbar, accordion, an open menu with checkable items and a submenu, the toggle group in each mode, the list with and without selection, and a menubar with a menu open and moving to the next one, and a tree with a parent open and an item selected.
- `menu.test.ts`: the trigger's ARIA, opening by click and by Down and Up, every key of the table in both directions, typeahead, checkbox and radio items, disabled items, submenus, Escape order, Tab, presses outside, context menus, listeners only while open, and the warnings. `toggle-group.test.ts` and `list.test.ts`: roles in each mode, keys in both directions, events once per user change and never for script changes, initial state from markup, ownership restoration, and the warnings. `menubar.test.ts`: the menubar and its name, the items' ARIA, one tab stop, no arrows, the row's keys in both directions past a disabled item, opening by Enter, Space, Down, Up, and click, moving between open menus and stopping at the ends, a submenu's keys first, Escape, an action, Tab, and the warnings. `tree.test.ts`: roles, levels, names, and expanded states, children shown only while expanded, indentation in both directions, every key in both directions, `*` and letters, activation, focus kept out of a collapse, both selection modes and `Ctrl+A`, values from markup and code, forced colors, items added and removed, and the warnings. The axe suites (`test/browser/axe.ts`, shared with the locales package) set aside `label-content-name-mismatch` on parent tree items only, since their children's text is inside them while their name is their label.

## Gaps

- **Tabs reimplement roving.** `punk-tabs` handles keys itself because `RovingController` has no hook for activation. Closing it: give the controller an `onMove(item, key)` hook that tabs use for automatic and manual activation, and delete the duplicate key handling.
- **The listbox grid's screen reader behavior is unverified** ([accessibility.md](accessibility.md) Gaps).
