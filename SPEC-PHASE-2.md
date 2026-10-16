# Phase 2: Inventory — Implementation Specification

**Status:** Draft 1. Work packages 1 (contrast and tokens), 2 (shared internals), 3 (slot and item stack), 4 (slot grid), 5 (recipe), and 6 (meter and status light) are implemented.
**Parent:** [SPEC.md](SPEC.md), SPEC §17 (Delivery Phases), Phase 2
**Builds on:** [SPEC-PHASE-1.md](SPEC-PHASE-1.md)
**Package:** `@dieselpunk/core`
**Prefix:** `punk-`

References written `SPEC §N` point to `SPEC.md`. References written `Phase 1 §N` point to `SPEC-PHASE-1.md`. Bare `§N` references point to this document.

## 1. Scope

### 1.1 Deliverables

1. A resolution of the control-boundary contrast gap left open in Phase 1 §6.8, with a gate that enforces it (§6).
2. Shared internals for selection and keyboard navigation, tested as pure logic (§7).
3. Six components: `punk-slot`, `punk-item-stack`, `punk-slot-grid`, `punk-recipe`, `punk-meter`, `punk-status-light` (§8).
4. A workbench whose first screen shows the inventory components, as SPEC §15 requires (§9).
5. Test coverage for the new components across themes, densities, engines, writing directions, zoom levels, and forced colors, plus a performance gate for a 100-slot grid (§10).

### 1.2 Out of Scope

- `punk-window`, `punk-dialog`, `punk-popover`, form controls, tabs, toolbar, toast; Phase 3.
- `punk-production-stat`, `punk-connection-row`, locale packs, the sound adapter; Phase 4.
- Drag and drop, inventory rules, recipe calculation, and persistence (SPEC §3). The components emit events and expose state; applications decide what they mean.
- A list or picker container for recipes. `punk-recipe` is a tile; arranging tiles is the application's job in Phase 2.
- Virtualization of large grids. The budget is 100 slots (§10.5).
- Item art. Applications supply their own images (SPEC §4.3). The workbench contains a small set of original demo art for examples only.

### 1.3 Outcome

A developer can import the registration modules for panel, slot grid, item stack, button, progress bar, meter, and status light, and build a responsive assembler interface with their own item art. It supports mouse, touch, keyboard, and screen readers, follows theme and density attributes, and stays inside the size and performance budgets. This is the inventory subset of the SPEC §19 acceptance scenario; the window is Phase 3.

## 2. Resolved Ambiguities

These decisions close gaps in `SPEC.md` and `SPEC-PHASE-1.md` that affect Phase 2. Where one changes parent-spec wording, `SPEC.md` is updated when Phase 2 starts. Decision 1 needs the owner's confirmation before work package 1 starts, because it reinterprets a requirement.

| # | Topic | Decision |
|---|-------|----------|
| 1 | Boundary contrast (SPEC §10 "non-text controls 3:1"; Phase 1 §6.8 "known gap") | WCAG 2.2 SC 1.4.11 requires a 3:1 boundary only for a control that has no other visible way to be identified. A control with a visible label or a sufficiently contrasting icon needs no boundary, and an inactive control is exempt. `punk-button` and `punk-icon-button` therefore meet 1.4.11 through their text and icon, which the contrast gate already checks, and their edges are not gated. The **empty slot** has no text or icon, so its boundary must reach 3:1. A new token, `--punk-color-control-edge`, is that boundary, and a new gate rule checks it (§6). This closes Phase 1 §6.8 and Phase 1 §13 item 7 by the second route that item allows: the spec defines the qualifying boundary and the gate checks it. |
| 2 | Status colors on surfaces (Phase 1 §6.8: "Phase 2 must extend this check") | In the dark theme `danger` is 2.57:1 on `panel` and 1.82:1 on `panel-raised`, and `success` and `info` are 2.58:1 and 2.71:1 on `panel-raised`. The palette is not changed. Instead, **status fills are drawn on `panel-inset`**, where every fill already passes 3:1 and the gate already checks it: the status light sits in an inset lens, meters and durability bars sit in inset troughs, and an invalid slot's outline is drawn against the slot's inset interior. The selection outline (`accent`) and the highlight outline (`warning`) are drawn on ordinary surfaces, so they are checked against all four (§6.3). |
| 3 | ARIA structure of the slot grid | `role="listbox"` with `role="option"` items when `selection` is `single` or `multiple`; `role="group"` with `role="button"` items when it is `none`. Not `role="grid"`: that needs rows and cells, and a CSS-grid wrap point is not a row. Focus uses a roving `tabindex`, never `aria-activedescendant`: an id reference cannot cross a shadow root (Phase 1 §8.6), and the items are light-DOM children. |
| 4 | Selection outside a grid | A selectable item outside a `punk-slot-grid` is `role="button"`. It exposes `aria-pressed` once its `selected` property has been set, true or false, and not before, so a slot that was never meant to be selectable is not announced as a toggle. Inside a grid the grid owns `role`, `tabindex`, and `aria-selected` (decision 5). |
| 5 | Who owns selection | The grid. An item never changes its own `selected`. In a grid the grid sets it from its selection model and reflects it; outside a grid the application sets it. This keeps one source of truth and makes `punk-selection-change` complete. |
| 6 | Names for `option`, `button`, and `meter` | These roles have presentational children, so the accessible name must be computed from content or supplied. Components render their label, count, and state words as **text in the shadow tree**, visually hidden where they are not shown, and let the browser compute the name from content. They do not write `aria-label` onto the host, so a consumer's `aria-label` always wins and localization stays in one place. |
| 7 | Invalid state | ARIA 1.2 deprecates `aria-invalid` on `option` and `button`. The invalid state is therefore exposed as visually hidden text (the localized string `invalid`) in the accessible name, and shown as an outline plus a corner hatch, never color alone. |
| 8 | Item stack structure | `punk-item-stack` extends the same internal base as `punk-slot`; it does not nest a `punk-slot`. A nested slot would give an `option` inside an `option`, and a second tab stop. |
| 9 | Home and End (SPEC §7.4: "Home/End move to row boundaries") | Kept. `Ctrl+Home` and `Ctrl+End` move to the first and last item, following the usual grid convention. |
| 10 | Touch target (SPEC §9.2, 40x40) | Phase 1 extends a button's hit area with a pseudo-element. Adjacent slots in a grid would have overlapping extended areas, so under `@media (pointer: coarse)` a slot renders at no less than 40px instead. The visual change is deliberate and limited to small slots in compact density. |
| 11 | `punk-activate` | Emitted by the item (slot, item stack, recipe) on click, Enter, or Space. It bubbles and is composed, so a grid's listeners and an application's listeners on the grid receive it, and the grid does not re-emit it. Its detail is `{ value, item }`. |
| 12 | Meter thresholds | The meter uses the names of the HTML `<meter>` attributes: `low`, `high`, and `optimum`. ARIA 1.2 has no equivalents, so the state reaches assistive technology as words in `aria-valuetext`. A segmented meter cannot show status through a segment pattern (segments are the pattern), so it uses the same non-color cues as the progress bar's variants: solid, diagonal-hatched, and cross-hatched fills. |
| 13 | Visual matrix size | The Phase 1 matrix renders every component on one page per combination. With twelve components that page is too tall and the baselines too large. The gallery gains a `group` parameter, and the matrix runs once per group (§10.4). |
| 14 | Localized strings with values | `localize.ts` gains `{name}` interpolation, so strings such as "{level}" and "{percent}" are translatable as whole phrases instead of being concatenated in code (§7.4). |
| 15 | Demo art | The workbench draws its own item art, original and geometric, in `apps/storybook/src/icons/items.ts`. The asset policy page (Phase 1 §9) states this. |

## 3. Constraints Carried Over from Phase 1

The toolchain, package contract, and conventions of Phase 1 §3 to §5 and §7 apply unchanged. These Phase 1 findings shape this phase:

- **Test for the three engines on Linux.** Run the suite in the pinned Playwright image from a Linux `npm ci`; macOS does not reproduce Firefox and WebKit behavior. Emulation commands wait for the frame to report the change. `focusWithKeyboard` focuses the window first. A test that toggles `prefers-reduced-motion` lives in its own `*.reduced-motion.test.ts` file. Geometry assertions allow half a pixel (Phase 1 §10.1).
- **Baselines come only from CI.** Local `test:visual` is a precise check, but only the "Update visual baselines" workflow writes them (Phase 1 §10.3).
- **Every gate is mutation-checked.** A new test is run against a deliberately broken implementation before it is trusted, and a test that survives is fixed (Phase 1 §10.7).
- **Reflow, forced colors, and RTL are tested from the start** through the shared gallery, not left to a hardening pass.
- **Sizes are measured before limits are set.** A single-line control is checked against its expected size in normal and forced-colors modes.
- **Declare each tag with `@tagname`**, so the manifest and the workbench's API tables find it (Phase 1 §9).

## 4. Repository Layout

Additions to Phase 1 §4:

```text
packages/core/src/
  internal/
    selection-model.ts          pure selection logic: single, multiple, anchor, range (no DOM)
    selectable-base.ts          PunkSelectableBase: role, tabindex, keys, activation
    selectable-base.styles.ts   its host styles: cursor, touch, 40px coarse-pointer minimum
    selectable-base.test.ts     browser tests, through a minimal subclass that uses receptacle.ts
    grid-navigation.ts          pure functions: next index for a key, from item rectangles
  styles/
    focus.ts                    gains hostFocusRing() for elements that are themselves focused
    receptacle.ts               the shared slot surface, boundary, and state styles
  components/
    slot/  item-stack/  slot-grid/  recipe/  meter/  status-light/
      <name>.ts, <name>.styles.ts, index.ts, register.ts, <name>.test.ts, <name>.registration.test.ts
packages/core/test/
  selection-model.test.ts       node:test, no browser
  grid-navigation.test.ts       node:test, no browser
  localize.test.ts              node:test, no browser
  meter-state.test.ts           node:test, no browser: the meter's state, clamping, and segments
  browser/
    perf.test.ts                100-slot grid gate (§10.5)
    fixtures/gallery.ts         gains the inventory components and a `group` parameter
apps/storybook/src/
  icons/items.ts                original demo item art
  stories/                      one stories file per new component, and the Inventory overview
```

## 5. Package Contract

### 5.1 Exports and Registration

Each component follows Phase 1 §5.1 and §5.2: a class entry with no side effects, and a `register.js` entry that defines the element. None of the new `register.js` entries registers another component. In particular, `slot-grid/register.js` does not register `punk-slot`, and `item-stack/register.js` does not register `punk-slot` either (decision 8). An application that uses a grid of item stacks imports exactly those two.

The package root exports the classes, their option types, and the event types:

```ts
export type PunkActivateDetail = { value: string; item: HTMLElement };
export type PunkSelectionChangeDetail = { values: string[]; items: HTMLElement[] };

declare global {
  interface HTMLElementEventMap {
    'punk-activate': CustomEvent<PunkActivateDetail>;
    'punk-selection-change': CustomEvent<PunkSelectionChangeDetail>;
  }
}
```

The fixture consumer (Phase 1 §10.4) gains a typed `addEventListener('punk-selection-change', …)` call, so a missing declaration fails type checking under both supported TypeScript versions.

### 5.2 Naming

Class names are `PunkSlot`, `PunkItemStack`, `PunkSlotGrid`, `PunkRecipe`, `PunkMeter`, and `PunkStatusLight`.

### 5.3 Development Warnings

Each warns once per occurrence (Phase 1 §5.4) when:

- a slot, item stack, or recipe has no accessible name (no `label`, no text, and no `aria-label`);
- `selected` is set on an item that is outside a grid and has no `aria-pressed` of its own (informational: the component supplies it, §2 decision 4);
- a grid has no accessible name, contains an element that is not an item, or contains two items with the same non-empty `value`;
- an item in a selecting grid has no `value`, which leaves it out of `values`;
- a count, durability, or quality is out of range, or a meter's `value`, `min`, `max`, `low`, or `high` are inconsistent (clamped as the progress bar does);
- a status light has no text.

## 6. Contrast and Tokens

### 6.1 New Token

| Token | industrial | industrial-light | high-contrast | reduced-texture |
|-------|-----------|------------------|---------------|-----------------|
| `--punk-color-control-edge` | `#b8b5ac` | `#4a4840` | `#ffffff` | same as industrial |

It is the visible boundary of a control that has no other visible content, which in Phase 2 means the empty slot. Like every token it never references another custom property (Phase 1 §6.4), and the tests that give every theme the same names and require 6-digit hex values cover it.

### 6.2 Measured Values

All ratios are measured against the four surfaces a control can sit on (`canvas`, `panel`, `panel-raised`, `panel-inset`) with the computation in `check-contrast.ts`:

| Pair | industrial | industrial-light | high-contrast |
|------|------------|------------------|---------------|
| `control-edge` on canvas, panel, raised, inset | 8.16, 4.88, 3.47, 6.97 | 6.23, 4.81, 5.76, 3.98 | 21.00, 19.44, 17.40, 21.00 |
| Current `edge-dark` on panel | 1.78 | 4.81 | 19.44 |
| Current `edge-light` on panel | 2.22 | 1.57 | 19.44 |
| `accent` on canvas, panel, raised, inset | 7.65, 4.57, 3.25, 6.53 | 5.48, 4.24, 5.06, 3.50 | 14.67, 13.58, 12.16, 14.67 |
| `warning` on canvas, panel, raised, inset | 10.99, 6.57, 4.67, 9.37 | 4.98, 3.85, 4.60, 3.18 | 16.57, 15.34, 13.73, 16.57 |

`industrial-light` already meets 3:1 with its existing `edge-dark`, and `high-contrast` with white, so for those themes the new token reuses the existing value. The dark palette is the only one that needed a new color. The lightest neutral that reaches 3:1 on `panel-raised` is about `#b0ada4`, so `#b8b5ac` adds some margin; a boundary this light is a visible design change, and is applied to empty receptacles only.

### 6.3 Contrast Gate

`check-contrast.ts` (§6.8 of Phase 1) gains these rules, for every theme:

- `control-edge` against `canvas`, `panel`, `panel-raised`, and `panel-inset` is at least 3:1.
- `accent` (the selection outline) and `warning` (the highlight outline) against `canvas`, `panel`, and `panel-raised` are at least 3:1. `panel-inset` is covered by the fill rule below.
- The existing fill rules stay: `accent`, `accent-strong`, `warning`, `danger`, `success`, and `info` against `panel-inset` are at least 3:1.

### 6.4 Closing the Phase 1 Gap

The "known gap" paragraph and the control-edge rows in Phase 1 §6.8 are replaced by decision 1: the qualifying boundary is `control-edge`, the gate checks it, and controls identified by text or an icon are not gated on their edges. The three "gap" rows in the workbench's contrast table (`edge-dark`, `edge-light`, and `panel-raised` on `panel`) are removed and replaced by the new rules. A control's disabled state is exempt under 1.4.11, so disabled controls are not gated.

## 7. Shared Internals

### 7.1 `SelectionModel`

A pure class with no DOM access, so it is tested with `node --test` and no browser. It holds an ordered list of item keys, a mode (`none`, `single`, or `multiple`), the set of selected keys, and an anchor.

| Operation | `single` | `multiple` |
|-----------|----------|------------|
| `select(key)` | Replaces the selection with `key` | Replaces the selection with `key` and sets the anchor |
| `toggle(key)` | Selects `key`; never clears | Adds or removes `key` and sets the anchor |
| `extendTo(key)` | Same as `select` | Selects every key between the anchor and `key`, inclusive |
| `selectAll()` | No effect | Selects every enabled key |
| `clear()` | Clears | Clears |
| `set(keys)` | Selects the first valid key | Selects exactly the valid keys; the last one becomes the anchor |
| `setItems(keys, disabled)` | Drops selected keys that left the list | Same |
| `setMode(mode)` | Keeps the first selected key when narrowing from `multiple` | `none` clears; widening keeps the selection |

In `none` mode every operation but `clear` and `setItems` does nothing. A key that appears twice in `setItems` counts once, at its first position. It never selects a disabled key, drops keys that no longer exist, and returns `{ selected, changed }`: the selection in item order, and whether it differs as a set from before, so the grid emits `punk-selection-change` only for real changes and reordering the items alone is not one. A selected key that becomes disabled stays selected until an operation replaces the selection.

### 7.2 Grid Navigation

`grid-navigation.ts` exports `nextIndex(key, from, items, { direction, ctrl })`. Items are `{ left, right, top, bottom, disabled }` in any one coordinate space, since only comparisons between them matter. It returns the next index, or `from` when there is nowhere to go. It does not wrap.

- Horizontal keys move by one item in reading order, and swap in `rtl`. At the end of a row they continue on the next row, because knowing where a row ends needs layout, and a horizontal key reads none (§10.5). Nothing wraps from the last item to the first. `stepIndex(from, step, disabled)` is that move, and takes only which items are disabled.
- Vertical keys move to the item in the adjacent row whose horizontal center is nearest; rows are runs of items in document order that start within half an item height of the run's first item, so a grid whose column count changes with its width needs no stored column count, and a common offset, scale, or sub-pixel jitter does not matter. A tie between two equally near items goes to the earlier one. Rows with no enabled item are passed over.
- `Home` and `End` move to the first and last enabled item of the focused row, in document order, so in `rtl` `Home` is the row's visually rightmost item. `Ctrl+Home` and `Ctrl+End` move to the first and last enabled item of the grid.
- Disabled items are skipped.

The grid reads rectangles once per vertical keypress and not at all for horizontal ones (§10.5).

### 7.3 `PunkSelectableBase`

The base of `punk-slot`, `punk-item-stack`, and `punk-recipe`, in the way `PunkButtonBase` serves the buttons.

`PunkSelectableBase` is told about its owner by an `ItemOwner` reference in `managed` (not a boolean): a grid cannot observe attributes, and may not create a `MutationObserver` (§10.5), so an item calls `owner.itemChanged(item, changed)` from `willUpdate` when its `disabled`, `value`, or `selected` changes while it is managed. The grid coalesces these into one rebuild per microtask, and ignores a `selected` change that already agrees with its selection model. `selected` is an accessor so the base can tell that it has been set, even to `false`.
- It is a host-level widget: the host has the role and the `tabindex`, written as attributes (not `ElementInternals`) so that tooling that reads the DOM sees what users get. A native `<button>` cannot be an `option`, and a grid needs to own both. The host is `role="button"` outside a grid. While `managed`, the base leaves `role`, `tabindex`, and `aria-selected` to the grid and writes no `aria-pressed`; when the flag clears it restores its own `role`, removes `aria-selected`, and resets `tabindex` (§2 decision 3).
- `tabindex="0"` is added unless the author set one, and is removed again only if the base added it, so a disabled item is not focusable unless the author made it so.
- Keyboard: `Enter` activates on key down, once per press, and `Space` on key up if it was also pressed on this item, as a native button does; `Space` never scrolls the page. Keys with Ctrl, Alt, or Meta, keys pressed in focusable content slotted into the item, and keys whose default is already prevented are ignored. The last rule is how a grid claims the keys it handles: it prevents the default in a capture listener before the item sees the event. A disabled item does nothing, and its click is hidden from later listeners.
- It emits `punk-activate` with `{ value, item }` from a click or from those keys. Keys do not synthesize a `click` event, so a grid that selects on click does not select on `Enter`.
- `aria-pressed` follows §2 decision 4; `aria-selected` is set only by the grid.
- The accessible name is text in the shadow tree (§2 decision 6): the label, the count and state words, and the localized word for each state that applies (`invalid`, and so on). Subclasses render it; `receptacle.ts` exports a `visuallyHidden` rule for the text that is not shown.
- A coarse-pointer rule in `selectable-base.styles.ts` sets a minimum rendered size of 40px (§2 decision 10).

### 7.4 Localization

`localize.ts` (Phase 1 §7.6, which has one key, `loading`) gains these keys and `{name}` interpolation. The English default lives beside the component that renders it, not in `localize.ts`: `t(key, fallback)` returns the string set by `setStrings`, else `fallback`, and `format(key, fallback, values)` also fills the placeholders. A table of defaults in the shared module would add about 90 bytes to every bundle, including the buttons that never use them. `setStrings` accepts the keys like any other:

| Key | Default |
|-----|---------|
| `invalid` | `invalid` |
| `stackCount` | `{count}` |
| `stackCapacity` | `{count} of {capacity}` |
| `durability` | `durability {percent}` |
| `quality` | `quality {level}` |
| `unavailable` | `unavailable` |
| `craftable` | `can craft {count}` |
| `meterWarning` | `warning` |
| `meterCritical` | `critical` |

Numbers are formatted with `Intl.NumberFormat` and the nearest `lang` (`resolveLang` from Phase 1 §7.6 and §8.5), so counts and percentages follow the page's language and the unabridged count is never a compact one.

### 7.5 Focus and Forced Colors

`focus.ts` gains `hostFocusRing(selector)` for a host that is itself the focus target: the ring is drawn on `selector`, a positioned element inside the shadow tree that fills the host, while the host has `:focus-visible`, and under forced colors the 2px `Highlight` outline goes on the host. `focusRing` and `hostFocusRing` share one implementation. `receptacle.ts` exports `receptacleStyles`, the slot surface for `.slot > .content > slot` with optional `.badge` and `.overlay`, and the `empty` class while the default slot has no content. Each state owns one channel, so they combine and stay apart without color: selected is the outer ring and a darker fill, highlighted a dotted outline, invalid an inner frame and a hatched corner. Under forced colors a selected receptacle draws a 3px `Highlight` outline, a highlighted one a dotted border, and an invalid one a dashed border, so the three states stay different when colors are replaced.

## 8. Components

All components follow Phase 1 §8: Shadow DOM, logical properties, tokens only, complete JSDoc with `@tagname`, and reduced-motion handling. None uses continuous animation.

### 8.1 `punk-slot`

The square receptacle for an item, a recipe, a tool, or equipment.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `selected` | `selected` | `boolean` | `false` | yes |
| `disabled` | `disabled` | `boolean` | `false` | yes |
| `highlighted` | `highlighted` | `boolean` | `false` | yes |
| `invalid` | `invalid` | `boolean` | `false` | yes |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | yes |
| `label` | `label` | `string` | `''` | yes |
| `value` | `value` | `string` | `''` | yes |

- **Slots:** default (artwork or content), `badge`, `overlay`.
- **Parts:** `slot`, `content`, `badge`, `overlay`.
- **CSS properties:** `--punk-slot-size` (default from the density token). `sm` is 0.8 times it and `lg` is 1.2 times it.
- **Events:** `punk-activate`.
- The surface is an inset receptacle. When it has no content its boundary is drawn in `--punk-color-control-edge`; with content, the content identifies it (decision 1).
- `overlay` content does not receive pointer events by default, so it cannot block activation.
- `label` is rendered as visually hidden text. A slot with neither a label nor slotted text has no accessible name and warns (§5.3).
- Drag and drop is not provided. Application code can use the standard pointer and drag events.

States, each with a cue that does not depend on color:

| State | Treatment |
|-------|-----------|
| Idle | Inset receptacle |
| Hover | Brighter edge (an increase in edge contrast, as for a button) |
| Focus-visible | The two-tone focus ring (§7.5) |
| Active | Content moves 1px down and toward the inline end |
| Selected | A 3px `accent` ring (the idle ring is 2px) and a darker inset surface |
| Highlighted | Dotted 2px `warning` outline, 3px clear of the ring |
| Invalid | An inner 2px `danger` frame and a hatched corner; the word "invalid" is part of the name |
| Disabled | Flat, desaturated, not focusable, name unchanged |

### 8.2 `punk-item-stack`

An item with its count, durability, and quality, in the same receptacle.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `name` | `name` | `string` | `''` | yes |
| `count` | `count` | `number` | `1` | yes |
| `capacity` | `capacity` | `number \| undefined` | `undefined` | yes |
| `durability` | `durability` | `number \| undefined` | `undefined` | yes |
| `quality` | `quality` | `number` | `0` | yes |
| `compactCount` | `compact-count` | `boolean` | `false` | yes |
| `selected`, `disabled`, `highlighted`, `invalid`, `size`, `value` | as `punk-slot` | | | |

- **Slots:** `icon`, `badge`, `overlay`.
- **Parts:** `slot`, `icon`, `count`, `durability`, `quality`, `badge`, `overlay`.
- The count is drawn on an opaque plate in `panel-inset` with `text`, so it meets the text rule whatever the art underneath is. It is hidden when the count is exactly 1, and shown as `count/capacity` when a capacity is set.
- `compact-count` abbreviates the **visible** count (`1.2K`, `3.4M`) with `Intl.NumberFormat`. It never changes the accessible text, which always carries the full name and the unabridged quantity: "Speed module, 1,234" or, with a capacity, "Speed module, 75 of 100".
- `durability` is a fraction from 0 to 1, drawn as a thin bar in an inset trough. Its fill uses the same non-color patterns as the progress bar, so a low value is visible without color, and its state is in the accessible text ("durability 40%").
- `quality` is an integer from 0 to 5, drawn as that many small diamonds; the number is in the accessible text.
- Invalid input (a negative or non-finite count, a durability outside 0 to 1, a quality outside 0 to 5) is clamped and warns once.
- Details settled in implementation: a non-finite count is 0, a `capacity` that is not above 0 is ignored, a count above the capacity is shown as written, and quality is rounded. Removing the `count` or `quality` attribute restores the default silently. A `quality` of 0 draws no diamonds and adds nothing to the name. A durability of 0.5 or more draws solid stripes, 0.25 or more diagonal hatching, and less than that cross-hatching. The quality diamonds sit at the inline start of the top edge, the count plate at the inline end of the bottom edge and above the bar when there is one, and a count too long for the item is ellipsized, never wrapped. The item has no `label` property: `name` names it, and an `aria-label` would replace the quantity in the accessible name, so the JSDoc says to use `name`.
- The slot and the item stack share `PunkReceptacleBase`, which owns `highlighted`, `invalid`, `size`, the receptacle markup, badge and overlay, and the "no accessible name" warning. The item stack warns once for each of: no name, a count below 0 or not a number, a capacity not above 0, a durability outside 0 to 1 or not a number, and a quality that is not a whole number from 0 to 5.

### 8.3 `punk-slot-grid`

A responsive, keyboard-navigable grid of slots or item stacks.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `columns` | `columns` | `number \| undefined` | `undefined` | yes |
| `selection` | `selection` | `'none' \| 'single' \| 'multiple'` | `'none'` | yes |
| `disabled` | `disabled` | `boolean` | `false` | yes |
| `values` | none | `string[]` | `[]` | no |

- **Slots:** default (items).
- **Parts:** `grid`.
- **CSS properties:** `--punk-slot-size`, `--punk-slot-gap` (default `var(--punk-space-1)`).
- **Events:** `punk-selection-change` with `{ values, items }`, and the bubbling `punk-activate` from its items.
- `values` is read to get the selected values and assigned to select by value; it never mutates the array an application passes in.
- The grid has no name of its own: the application provides `aria-label` (SPEC §8 uses `aria-label="Module slots"`), and a missing one warns.
- Layout is CSS Grid with square tracks of `--punk-slot-size`. `columns` is the most columns wanted. When the container is narrower, the column count falls before the slots shrink, and a slot is never smaller than its size (SPEC §11).
- The grid owns `role`, `tabindex`, and `aria-selected` on its items (§2 decision 3), and listens once on itself, not on each item (§10.5). It finds its items from `slotchange`.
- Exactly one item is a tab stop. Tab enters at the item that last had focus, else the first selected item, else the first enabled item, and a second Tab leaves the grid.
- Selection and focus are separate (SPEC §9.3): moving focus never changes the selection.
- Details settled in implementation:
  - **Events.** `punk-selection-change` is sent for changes the user makes (click, Space, Shift and Ctrl+A), once per change and not for a click that changes nothing. It is not sent when the application assigns `values`, changes `selection`, or adds or removes items, as `change` is not sent for a script's change to an input. `detail.values` leaves out items with no `value`, and `detail.items` does not.
  - **Order.** The grid handles a click in the capture phase, so the selection is up to date when `punk-activate` reaches a listener. A key it handles has its default prevented before the item sees it, which is why Space selects without also activating, and Enter, which it does not handle, activates without selecting.
  - **`values`.** Assigned before its items exist, it selects them when they arrive, and the user's first choice replaces it. Reading returns a copy, and assigning copies what it is given. A selected item that becomes disabled stays selected until the selection is replaced.
  - **Items.** An item is a direct child that has the `managed` property; an element that is not yet defined is waited for with `customElements.whenDefined`, and anything else is ignored and warned about once. An item with no `value`, or a second one with the same `value`, can still be selected and is listed in `detail.items`, but not in `values`. A removed item gets its own role and tab stop back.
  - **Disabling the grid** disables the items that are not already disabled and remembers them, so enabling the grid restores exactly what it took. Re-enabling does not touch an item the application disabled.
  - **Selection by an item.** If the application sets `selected` on an item inside a grid, the grid puts it back.
  - **Columns.** A `columns` value that is not a number of at least 1 is ignored, and a fraction is rounded down. Right to left is found with `:dir(rtl)`, which reads no layout.
  - **Keys.** Ctrl, Alt, and Meta with an arrow are left to the browser, `Ctrl+Home` and `Ctrl+End` are the exception, and `Ctrl+A` and `Command+A` both select all. Shift with `Home` or `End` is plain. A held Space is ignored.

Roles and states:

| `selection` | Host | Item | Item selected state |
|-------------|------|------|---------------------|
| `none` | `role="group"` | `role="button"` | none |
| `single` | `role="listbox"` | `role="option"` | `aria-selected` |
| `multiple` | `role="listbox"` and `aria-multiselectable="true"` | `role="option"` | `aria-selected` |

Keyboard (for `rtl`, the horizontal arrows swap):

| Key | Effect |
|-----|--------|
| Arrow keys | Left and Right move to the neighbor in reading order, and on to the next or previous row at a row end; Up and Down keep the column. Nothing wraps from the last item to the first |
| `Home`, `End` | First and last item of the row |
| `Ctrl+Home`, `Ctrl+End` | First and last item of the grid |
| `Space` | Select the focused item (single) or toggle it (multiple); in `none` it activates |
| `Enter` | Activate the focused item (`punk-activate`); never changes the selection |
| `Shift+Arrow` (multiple) | Move focus and extend the selection from the anchor |
| `Ctrl+A` (multiple) | Select every enabled item |

Pointer: a click selects the item (single), toggles it (multiple), or only activates it (none). A `Shift` click in multiple mode extends the selection. A click activates in every mode.

### 8.4 `punk-recipe`

A selectable recipe tile.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `name` | `name` | `string` | `''` | yes |
| `duration` | `duration` | `number \| undefined` | `undefined` | yes |
| `available` | `available` | `boolean` | `false` | yes |
| `craftableCount` | `craftable-count` | `number` | `0` | yes |
| `selected`, `disabled`, `value` | as `punk-slot` | | | |

- **Slots:** `icon`, `ingredients`, `products`.
- **Parts:** `recipe`, `icon`, `name`, `duration`, `status`, `ingredients`, `products`.
- **Events:** `punk-activate`.
- Details settled in implementation:
  - **Base.** `PunkRecipe` extends `PunkSelectableBase` directly, not the receptacle base: it is a tile, not a square receptacle, so it has no `highlighted`, `invalid`, or `size`, and its own styles (a raised tile with the button's bevel, pressed in and ringed when selected).
  - **Status.** The word "unavailable" for a recipe that cannot be made, "can craft N" for one that can with a count above zero, and nothing for one that can with a count of zero, so availability is a word present or absent, never dimming or color. An unavailable recipe ignores its count. The chip is solid when it can be made and dashed when it cannot, which also tells them apart without color.
  - **Duration** is in seconds, shown with `unit: 'second'` and `unitDisplay: 'short'` ("0.5 sec" in English, "12 Sek." in German), at most two decimals. Zero is shown as a time, and unset shows none. A negative value is clamped and warns, and a value that is not a number shows nothing and warns.
  - **Count.** `craftable-count` is rounded down. Removing the attribute reads as zero without a warning, and a negative or non-numeric value is zero with one.
  - **Name.** The tile's text in reading order (icon alt text, name, duration, status, ingredients, products), so naming it with `aria-label` would replace the ingredients: the JSDoc and the gallery use `name`. It warns once when there is no `name`, no `aria-label` or `aria-labelledby`, and nothing in the icon, ingredients, or products slots.
  - **Layout.** The icon plate is `--punk-slot-size` square and hidden when empty. The ingredients, an arrow, and the products sit on one wrapping row; the arrow shows only when both are present, is hidden from assistive technology, and flips for right-to-left. The text column can shrink below its widest unbreakable content, and a long word breaks.
  - **Selected** is a 3px ring and a pressed-in bevel, no fill change, since the text keeps its contrast on the tile. Under forced colors it is a 3px `Highlight` outline.
- The tile is `role="button"` with `aria-pressed` for `selected` (§2 decision 4). Its name is the browser's name from content: the name, the duration, the availability word, the craftable count, and the text of the `ingredients` and `products` slots. Nothing in the tile is hidden from the name, so an ingredient list is read.
- The duration is formatted as a unit with `Intl.NumberFormat` (for example "0.5 s"), and the count and the word "unavailable" are shown as text, so availability never depends on dimming or color.
- The tile grows with its content. A long name wraps, and the tile keeps a minimum size, as Phase 1's controls do (§10.7 of that spec).

### 8.5 `punk-meter`

A segmented gauge for power, fluid, heat, durability, or capacity.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `value` | `value` | `number` | `0` | yes |
| `min` | `min` | `number` | `0` | yes |
| `max` | `max` | `number` | `100` | yes |
| `low` | `low` | `number \| undefined` | `undefined` | yes |
| `high` | `high` | `number \| undefined` | `undefined` | yes |
| `optimum` | `optimum` | `number \| undefined` | `undefined` | yes |
| `segments` | `segments` | `number` | `10` | yes |
| `orientation` | `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | yes |
| `label` | `label` | `string` | `''` | yes |
| `labelHidden` | `label-hidden` | `boolean` | `false` | yes |
| `showValue` | `show-value` | `boolean` | `false` | yes |
| `accessibleLabel` | `aria-label` | `string \| null` | `null` | no |

- **Parts:** `header`, `label`, `value`, `track`, `fill`.
- **CSS properties:** `--punk-meter-length` (the vertical length; default `calc(var(--punk-control-height-lg) * 3)`), `--punk-meter-thickness` (default `calc(var(--punk-control-height-sm) * 0.6)`).
- Semantics: the track has `role="meter"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (the percentage, followed by the state word when there is one). The meter role requires a name and has presentational children (§2 decision 6), so the label is rendered text, with an `aria-label` fallback and a warning as in the progress bar.
- State follows the HTML meter algorithm over `low`, `high`, and `optimum`. With none of them set there is no state, and the fill is solid `accent`. Otherwise: optimal is a solid `success` fill, suboptimal a diagonally hatched `warning` fill, and the worst region a cross-hatched `danger` fill (§2 decision 12).
- The segments are a CSS pattern on the track and not one element per segment, so a meter costs a fixed number of nodes. The lit length snaps to a whole number of segments, at least one when the value is above the minimum, and full only at the maximum.
- Fills are drawn in an inset trough, so they meet the fill rule (§2 decision 2).
- The fill animates `inline-size` or `block-size` over `--punk-duration-normal`, which reduced motion removes. ARIA values update immediately.
- Details settled in implementation:
  - **Logic.** `meter-state.ts` holds all the arithmetic and has no DOM: `resolveMeter` clamps the value and boundaries, runs the HTML `<meter>` algorithm for the state, snaps the lit segments, and lists what it repaired. It is tested with every combination of where the value and the optimum sit.
  - **State.** With none of `low`, `high`, `optimum` set there is no state and the fill is solid `accent`. With any set, the missing ones default as in HTML (`low` is `min`, `high` is `max`, `optimum` is the middle), so `optimum` alone makes everything optimal. The words are the strings `meterWarning` and `meterCritical`; the best state adds none, so the value text is "64%" or "15%, warning", and the same text is shown with `show-value`.
  - **Repairs.** A range where `max` is not above `min`, or not finite, becomes 0 to 100. A value that is not a number becomes `min`, and one outside the range is clamped. Boundaries are clamped, a `high` below `low` is raised to it, and `segments` is rounded and kept between 2 and 100. Each warns once. Removing a number attribute reads as its default, silently.
  - **Segments.** The cuts are trough-colored lines over the fill and the trough, drawn by one repeating gradient, so the node count is fixed (checked for 2, 10, and 100 segments). The fill grows from the inline start, and from the bottom when vertical, and the gradient flips for right-to-left. The header wraps, so a long label and the value text stack in a narrow container.
  - **Name.** `aria-labelledby` points at the rendered label, with `aria-label` as the fallback, as in the progress bar, and one warning when neither exists.

### 8.6 `punk-status-light`

A compact indicator with a shape and text.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `variant` | `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'` | `'neutral'` | yes |
| `announce` | `announce` | `boolean` | `false` | yes |

- **Slots:** default (the text), `icon` (replaces the built-in shape).
- **Parts:** `indicator`, `label`.
- The shape differs for each variant and is drawn with CSS, since core ships no icons: a ring for `neutral`, a diamond for `info`, a filled circle for `success`, a triangle for `warning`, and a square for `danger`. Color is a second cue, never the only one.
- The shape sits in an inset lens, so its fill meets the fill rule (§2 decision 2).
- The text carries the meaning, and a light with no text warns. The shape is decorative and hidden from assistive technology.
- By default the host has no role. With `announce` it is `role="status"`, a polite live region, for a light whose value changes while the user is elsewhere.
- Under forced colors the shapes keep their outlines in system colors.
- Details settled in implementation: the `icon` slot has the built-in shape as its fallback content, so slotting an icon replaces it with no extra bookkeeping. An unknown `variant` draws as `neutral`. The neutral ring uses `text` so it meets 3:1 on the lens like the others. `announce` remembers a role the author had set and gives it back when `announce` is turned off. The warning for no text fires when the text goes away as well as when it was never there, and an icon alone counts as no text. Under forced colors the ring stays a 2px border and the other shapes fill with `CanvasText`, so they stay apart by shape.

## 9. Documentation Workbench

Additions to Phase 1 §9:

1. **First screen:** the Phase 1 "Machine panel" overview is replaced by an **Inventory** overview, as SPEC §15 requires: an assembler built from a panel, a slot grid of item stacks, a recipe, a progress bar, meters, status lights, and buttons. Phase 1's overview stays as a story under Foundations.
2. **One docs page and story set per new component**, with a playground, every state, the theme by density matrix, keyboard tables beside the example, and a manifest-generated API table. The slot grid's page has the keyboard table in §8.3 and a story with 100 slots.
3. **Demo item art** in `src/icons/items.ts`: a gear, a plate, a circuit, a module, and a coil, drawn originally on a 24 by 24 grid in `currentColor`, so they follow the theme. The asset policy page says so and repeats that applications supply their own imagery.
4. The accessibility guide (Phase 1 §10.7) gains the inventory components: keyboard model, forced-colors cues, and the rule that status is never color alone.

## 10. Testing and CI

### 10.1 Logic Tests

`selection-model.test.ts` and `grid-navigation.test.ts` run under `node --test` with no browser. They cover every row of the tables in §7.1 and §7.2, including disabled items, removed keys, empty lists, rows of unequal length, and `rtl`. Each is mutation-checked.

### 10.2 Component Tests

Each component has `*.test.ts` and `*.registration.test.ts` as in Phase 1, covering the criteria in §12, run on all three engines. These apply to the whole phase:

- **Accessibility tree.** Roles, names, and states are asserted with Playwright's ARIA snapshot of the rendered tree, not only by reading attributes, because the name comes from shadow content. It covers a slot alone, a slot in each grid mode, and an item stack with every state.
- **Keyboard and focus.** Every key in §8.3, in `ltr` and `rtl`, including that focus and selection stay separate and that one item is a tab stop.
- **Both directions of every property.** A property set before and after connection, and an attribute added and removed, behave the same.
- **Each state is checked against its non-color cue**, by forcing every status color to one value and requiring the states to remain different, as Phase 1 does for the progress bar.

### 10.3 Accessibility

The shared gallery (`fixtures/gallery.ts`) gains every new component in its states, in the four content variants. The axe suite then covers them in all themes and both densities, with no serious or critical violation. It includes a slot grid in each `selection` mode, so the `listbox` and `option` ownership rules are checked, and a meter, which axe requires to have a name. The reflow test (Phase 1 §10.7) covers them automatically, so no component can force horizontal scrolling at 200% zoom.

### 10.4 Visual Regression

The matrix of Phase 1 §10.3 applies, with these changes:

- Until the matrix covers the inventory, the shared gallery exports `foundationNames` (what the matrix renders) and `inventoryNames` beside `componentNames` (everything, which the axe, manifest, and reflow suites use). Work package 3 added the slot and item stack to the gallery for those three suites without changing any baseline.
- The gallery takes a `group` parameter (`foundation` or `inventory`), and the matrix runs once per group (§2 decision 13). Each group has its own folder of baselines.
- The inventory group renders every state in the table in §8.1, an item stack with a count of 1, 99, 1,234, and 1,234,567 (plain and compact), with and without durability and quality, a grid of 100 slots in each selection mode, a meter in each state and both orientations, and a status light in each variant.
- Hover, focus-visible, and active are driven with real input on a slot, and a grid is captured with keyboard focus on an interior item.
- The forced-colors project covers the inventory group at one theme, as for the foundation group.
- Content variants: short, long (German), missing optional labels, and RTL. Names and labels wrap rather than clip.

### 10.5 Performance Gate

SPEC §14.3 requires a 100-slot grid to stay responsive. Frame times on a CI runner are too noisy to assert, so the gate checks what makes a grid fast, deterministically, in `perf.test.ts`:

- A grid of 100 item stacks has one set of event listeners on the grid, not one per item, and creates no `ResizeObserver`, `IntersectionObserver`, or `MutationObserver` of its own.
- A horizontal keypress reads no layout (`getBoundingClientRect` is never called). A vertical keypress, `Home`, or `End` reads each item's rectangle once, which is 100 reads for 100 items.
- Moving focus through all 100 items changes the `tabindex` of exactly two elements per keypress.
- Changing one item's `selected` re-renders that item only; moving a single selection re-renders the two items involved.
- The grid adds the same few listeners to itself for 10 items and for 100, adds none to its items, and the whole page creates no `ResizeObserver`, `IntersectionObserver`, or `MutationObserver`.
- Informational, not asserted: the time to render the grid, recorded in the CI log so regressions are visible.

### 10.6 Size and Packaging

The gates of Phase 1 §10.4 apply, with each component's register entry measured on its own and gzip-compressed:

- Each entry is at most 5 kB. The shared selectable base is imported by three components, so it counts toward each of them; if an entry would pass 5 kB, the base is split before any limit is raised, and any exception is documented as `punk-icon-button`'s was.
- Measured in work package 6: `punk-meter` 4.47 kB and `punk-status-light` 2.67 kB.
- Measured in work package 5: `punk-recipe` 4.86 kB, which is close: it does not use the receptacle styles, but it has its own tile styles and the number formatting. The shared base entry is named for the slot and the item stack, the two that use the receptacle.
- Measured in work package 4: `punk-slot-grid` 4.66 kB, with the shared runtime. The selectable base is not part of it, since the grid never imports an item class.
- Measured in work package 3: `punk-slot` 4.27 kB. `punk-item-stack` is 5.83 kB, so it has a documented exception of 6 kB, as `punk-icon-button` has 7. There was nothing left to split: the receptacle styles and base (about 4.2 kB with the shared runtime) are used by both components, and the rest of the item stack is its own code, which is the durability patterns, the quality diamonds, and the number formatting. The way to bring it under 5 kB is to cut features or shrink the receptacle CSS, and neither seemed worth it for 0.8 kB. English defaults live beside the component that renders them (§7.4), which kept the Phase 1 bundles from growing.
- `check-package.ts` gains a sentinel string for each new component and requires that no register entry brings another component with it.
- The shared runtime stays at or below 12 kB. The inventory-only base is measured as its own entry, "Selectable base and receptacle", at 4.23 kB against a 5 kB limit (measured in work package 2, with the shared runtime at 8.27 kB). It includes the shared runtime, so a component built on it has under 0.8 kB of its own before it reaches 5 kB; `punk-item-stack`, the largest, is the likely first entry to need the base split.

### 10.7 CI

The stages of Phase 1 §10.5 are unchanged. The "Update visual baselines" workflow is run once after the matrix is extended, and its artifact committed.

## 11. Work Packages

| # | Package | Depends on | Output |
|---|---------|------------|--------|
| 1 | Contrast and tokens | Phase 1 | `control-edge` in every theme, new gate rules, the workbench table updated, Phase 1 §6.8 and §13 item 7 closed, `SPEC.md` updated. Done. |
| 2 | Shared internals | 1 | `SelectionModel`, `grid-navigation`, `PunkSelectableBase`, `receptacle` styles, `hostFocusRing`, localization with interpolation; logic tests. Done. |
| 3 | Slot and item stack | 2 | Two components, tests. Done. |
| 4 | Slot grid | 2, 3 | Component, keyboard and selection tests, performance gate. Done. |
| 5 | Recipe | 2 | Component, tests. Done. |
| 6 | Meter and status light | 1 | Two components, tests. Done. |
| 7 | Test infrastructure | 3 to 6 as they land | Gallery group, axe and reflow coverage, ARIA snapshots, visual matrix, consumer typing, baselines |
| 8 | Workbench | 3 to 6 as they land | Inventory overview, stories, docs pages, demo art |
| 9 | Hardening | 7 | Forced-colors, RTL, 200% zoom review of the renders; size tuning; docs polish |

Packages 3, 5, and 6 can proceed in parallel after packages 1 and 2. The gallery in package 7 is extended as each component lands, so each package's own tests already run against it.

## 12. Acceptance Criteria

### 12.1 Contrast and Tokens

1. Every theme defines `--punk-color-control-edge`, and `tokens.css` and `themes.css` emit it.
2. The contrast gate passes with the new rules in §6.3, and fails when a theme's `control-edge` is changed to a color below 3:1 on any of the four surfaces.
3. The workbench's contrast table shows the new rules and no "gap" rows.
4. `SPEC.md` §10 states the boundary rule, and Phase 1 §6.8 refers to this section.

### 12.2 Slot

1. It exposes `role="button"`, the name from its label or content, and `aria-disabled` when disabled; a disabled slot is not focusable.
2. Click, `Enter`, and `Space` each emit `punk-activate` once, with the value and the slot; `Space` does not scroll the page.
3. `aria-pressed` is absent until `selected` is set, and then follows it.
4. An empty slot's boundary is `control-edge` and meets 3:1 on each surface in every theme; the test reads the rendered color, not the token.
5. Selected, highlighted, invalid, and disabled differ from each other and from idle with all colors forced to one value, and under forced colors.
6. `invalid` adds the localized word to the accessible name and not `aria-invalid`.
7. Overlay content does not block activation.
8. Under a coarse pointer a small slot renders at 40px or more; sizes are otherwise `0.8`, `1`, and `1.2` times `--punk-slot-size`, at both densities.
9. A slot without a name warns once.

### 12.3 Item Stack

1. The accessible name has the full item name and the unabridged, locale-formatted quantity ("Speed module, 1,234"), and the capacity, durability, and quality when set, whatever `compact-count` is.
2. With `compact-count` the visible count is abbreviated and the accessible text is not; without it, neither is.
3. The visible count is hidden for 1, and shown as `count/capacity` when a capacity is set.
4. The count plate meets 4.5:1 over any artwork; the test uses a white image and a black one.
5. Durability and quality are visible without color, and appear in the accessible text.
6. Out-of-range values are clamped and warn once.
7. Items behave as slots for focus, activation, selection, and the states in §12.2.
8. Registering it does not register `punk-slot`.

### 12.4 Slot Grid

1. In each `selection` mode the roles, `aria-multiselectable`, and `aria-selected` match the table in §8.3, checked in the accessibility tree.
2. One item is a tab stop. Tab enters at the right item and a second Tab leaves; the tab stop survives items being added, removed, and disabled.
3. Every key in the keyboard table does what it says, in `ltr` and `rtl`, including row boundaries in a grid whose column count changes with its width.
4. Moving focus never changes the selection, and `punk-selection-change` fires once per real change with the values and items.
5. `values` can be read, and assigned to select by value; the array an application passes is not modified.
6. The column count falls before the slots shrink, down to one column; a slot is never smaller than its size.
7. Disabling the grid disables every item and removes the tab stop.
8. A missing name, a non-item child, and duplicate values each warn once.
9. A grid of 100 stacks passes the performance gate in §10.5.

### 12.5 Recipe

1. It exposes `role="button"` with `aria-pressed` for `selected`, and its name from content includes the name, duration, availability, craftable count, ingredients, and products.
2. Unavailable is shown with a word, and the tile is readable without color.
3. The duration is formatted for the page's language.
4. A long name wraps; the tile never forces horizontal scrolling.
5. It emits `punk-activate` on click, `Enter`, and `Space`.

### 12.6 Meter

1. It exposes `role="meter"` with the correct `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`, and a name from its label or `aria-label`.
2. State follows the HTML meter algorithm for every combination of `low`, `high`, and `optimum`, and appears in `aria-valuetext` in words.
3. Solid, hatched, and cross-hatched fills differ with all state colors forced to one value, and under forced colors.
4. The lit length snaps to whole segments; it is at least one above the minimum and full only at the maximum.
5. Out-of-range values are clamped and warn once, and the percentage follows the page's language.
6. Both orientations render, and the vertical one uses `--punk-meter-length`.
7. It costs a fixed number of nodes, whatever `segments` is.

### 12.7 Status Light

1. Each variant has a different shape, and the variants are distinguishable with all colors forced to one value.
2. The text carries the meaning; a light without text warns; the shape is hidden from assistive technology.
3. By default there is no role; with `announce` the host is a polite live region.
4. The shape's fill meets 3:1 against its lens in every theme.
5. Forced colors keep the shapes.

### 12.8 Workbench

1. The first screen is the Inventory overview.
2. Every new component has a docs page with a state matrix, keyboard instructions, and an API table from the manifest.
3. The 100-slot grid story works with the keyboard.
4. The asset policy page covers the demo art.
5. The story smoke test loads every entry with no error or console warning.

### 12.9 Cross-Cutting

1. The manifest assertions (Phase 1 §10.1) pass for every new component: parts, slots, attributes, CSS properties, and descriptions.
2. The reflow test passes for the inventory components in every theme, density, and content variant at 187 to 512px.
3. Axe finds no serious or critical violation in the gallery.
4. The visual matrix passes in all three engines against CI baselines.
5. Every component supports the default and `industrial-light` themes and both densities, and the combination of `industrial-light` and low density, with no loss of function.

## 13. Definition of Done

Phase 2 is complete when:

1. All acceptance criteria in §12 pass.
2. All gates in Phase 1 §10 and in §10 above pass in CI, with Chromium, Firefox, and WebKit green.
3. Each new component can be imported on its own from plain HTML and from the TypeScript fixture, with the event types resolving under TypeScript 5.0 and 6.0, and no `register.js` brings another component with it.
4. The boundary-contrast decision (§2 decision 1) is confirmed by the owner and recorded in `SPEC.md`, and Phase 1 §6.8 no longer lists an open gap.
5. The performance gate for a 100-slot grid passes.
6. No asset or code in the package or the workbench is derived from Factorio files, and the demo art is documented as original.
7. `SPEC.md` is updated for the decisions in §2 that change its wording: §7.4 (events and roles of the grid, `value` on items), §10 (the boundary rule), and §15 (the first screen).
8. Every script runs as `node <file>.ts` on Node 26, and `npm ls typescript` reports exactly one version, 6.0.x.

## 14. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Decision 1 reads WCAG 1.4.11 more narrowly than the original requirement ("non-text controls 3:1") | It is the normative text of the criterion, and the empty slot, the one control it applies to, is gated. The owner confirms it before work package 1; if not accepted, the control edges of the buttons need a palette change that is a design decision, not an implementation task |
| A `listbox` with two-dimensional arrow keys is not a pattern in the WAI-ARIA Authoring Practices, and screen readers may announce it as a list | It is the closest correct structure (§2 decision 3). It is tested in the accessibility tree and with axe; manual screen reader testing is recorded in the workbench docs, and `role="grid"` stays available as a later option |
| A light boundary (`#b8b5ac`) on empty slots changes the look of the dark theme | It applies to empty receptacles only, the slot's other states keep the bevel language, and the value was chosen as the lightest that reaches 3:1 on every surface, with a little margin |
| Name from content differs between engines when the content is in a shadow tree | The accessibility-tree assertions run in all three engines, on the Linux image |
| Roving `tabindex` on light-DOM children breaks when items are added, removed, or disabled | Covered by §12.4 criterion 2; the grid recomputes the tab stop on `slotchange` and on an item's `disabled` change |
| Geometry-based vertical navigation is wrong for a grid in a transformed or scrolled container | Rectangles are compared against each other, not against the viewport, so a common transform or scroll cancels out; tested at 200% zoom and inside a scrolling container |
| The shared selectable base pushes three entries past 5 kB | The base is measured early (work package 2) and split before limits are changed (§10.6) |
| Inventory baselines add many megabytes | The matrix is split by group (§2 decision 13), the forced-colors set is small, and the sizes are checked after the first run |
| Firefox and WebKit differ on keyboard focus and media emulation | The rules in §3 apply, and the full suite runs on the Linux image before the first push |
