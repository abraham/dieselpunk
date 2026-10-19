# Inventory and Readouts

**Scope:** the receptacle model shared by inventory items, and the components that show values and status: slot, item stack, recipe, progress bar, meter, status light, production stat, and connection row. The slot grid that arranges items is in [keyboard-and-selection.md §6](keyboard-and-selection.md).
**Code:** `src/internal/selectable-base.ts`, `receptacle-base.ts`, `stat-format.ts`; `src/styles/receptacle.ts`, `readout.ts`, `status-shape.ts`, `visually-hidden.ts`; `src/components/slot/`, `item-stack/`, `recipe/`, `progress-bar/`, `meter/`, `status-light/`, `production-stat/`, `connection-row/`.

## 1. The receptacle model

### 1.1 Selectable items

`PunkSelectableBase` is the base of the slot, item stack, and recipe: an item that is itself the focus target.

- **Host-level widget.** The host has the role and `tabindex`, as attributes. Outside a grid it is `role="button"` with `tabindex="0"` (unless the author set one). Inside a grid the grid owns `role`, `tabindex`, and `aria-selected`, and the item writes none of them; when it leaves, it restores its own.
- **`aria-pressed`** appears outside a grid only once `selected` has been set, true or false, so an item never meant to be selectable is not announced as a toggle.
- **Selection is never the item's own decision.** The grid sets it from its selection model; outside a grid the application sets it. A click does not select an item.
- **Activation** follows [keyboard-and-selection.md §3](keyboard-and-selection.md) and emits `punk-activate` with `{ value, item }`, bubbling and composed, so the grid and the application both hear it and the grid does not re-emit it.
- **Managed state.** While in a grid, the item tells its owner when `disabled`, `value`, or `selected` changes ([component-model.md §8](component-model.md)).
- **Disabled** items are not focusable unless the author made them so, do nothing, and hide their click from later listeners.
- **Coarse pointers.** A small item renders at 40px or more, since extended hit areas of adjacent items would overlap.
- **Name** is text in the shadow tree: the label or name, the count and state words, and the localized word for each state that applies.

### 1.2 Receptacles

`PunkReceptacleBase` adds the square receptacle used by the slot and item stack: `size` (`sm`, `md`, `lg` at 0.8, 1, and 1.2 times `--punk-slot-size`), `highlighted`, `invalid`, and the `badge` and `overlay` slots. Overlay content takes no pointer events, so it never blocks activation, and is centered over the item and clipped to the receptacle, so a glyph never straddles its edge. A receptacle with no accessible name warns.

Each state owns one visual channel, so states combine and stay apart without color:

| State         | Treatment                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle          | Inset receptacle; when empty, a `control-edge` boundary, since nothing else identifies it                                                                 |
| Hover         | Brighter edges                                                                                                                                            |
| Focus-visible | The two-tone ring on the host                                                                                                                             |
| Active        | Content moves 1px down and toward the inline end                                                                                                          |
| Selected      | A 3px `accent` ring and a darker inset                                                                                                                    |
| Highlighted   | A dotted 2px `warning` outline, clear of the ring                                                                                                         |
| Invalid       | An inner 2px `danger` frame and a hatched corner, and the word "invalid" in the name (not `aria-invalid`, which ARIA deprecates on `option` and `button`) |
| Disabled      | Flat and desaturated; name unchanged                                                                                                                      |

Under forced colors, selected is a 3px `Highlight` outline, highlighted dotted, invalid dashed.

## 2. Slot

The square receptacle for an item, recipe, tool, or piece of equipment, with `label` (visually hidden text) and `value`, and its art in the default slot. Drag and drop is not provided; applications use pointer and drag events.

## 3. Item stack

An item with its count, capacity, durability, and quality, in the same receptacle. It extends the receptacle base and does not nest a slot, so a grid never has an option inside an option or a second tab stop.

- `name` names it. It has no `label`; an `aria-label` would replace the quantity in the name, and the docs say to use `name`.
- **Count** is drawn on an opaque `panel-inset` plate in `text`, so it reads over any art. It is hidden when exactly 1, and shown as `count/capacity` when a capacity is set. It is always laid out left to right and isolated, so a cut count keeps its first digits in either direction, and it is ellipsized, never wrapped.
- **`compact-count`** abbreviates the shown count (`1.2K`) with `Intl.NumberFormat`. The name always has the full name and the unabridged, locale-formatted quantity: "Speed module, 1,234", or "Speed module, 75 of 100".
- **Durability** is a fraction from 0 to 1, drawn as a thin bar in an inset trough: solid stripes at 0.5 and above, diagonal hatching from 0.25, cross-hatching below. The name says "durability 40%".
- **Quality** is a whole number from 0 to 5, drawn as that many small diamonds at the inline start of the top edge; the number is in the name, and 0 adds nothing.
- **Repairs** (each warns once): a negative or non-finite count is 0; a capacity not above 0 is ignored; a count above the capacity is shown as written; durability is clamped to 0 to 1; quality is rounded and clamped.

## 4. Recipe

A selectable tile: `name`, `duration` (seconds), `available`, `craftable-count`, with the `icon`, `ingredients`, and `products` slots. It extends the selectable base, not the receptacle: it has no `size`, `highlighted`, or `invalid`.

- **Name from content,** in reading order: icon alt text, name, duration, status, ingredients, products. Nothing is hidden from it, so an ingredient list is read. An `aria-label` would replace the ingredients, and the docs say to use `name`. It warns when it has no name and nothing in its slots.
- **Status** is a word present or absent, never dimming or color: "unavailable" when it cannot be made; "can craft N" when it can with a count above zero; nothing otherwise. The chip is solid when available and dashed when not.
- **Duration** is formatted as a unit with `Intl.NumberFormat` (`unit: 'second'`, `unitDisplay: 'short'`), at most two decimals; zero is a time, and unset shows none.
- **Layout.** A raised tile with the button's bevel; selected is a 3px ring and a pressed-in bevel. The icon plate is `--punk-slot-size` square and hidden when empty. Ingredients, an arrow (hidden from assistive technology, flipped in `rtl`, shown only when both sides are present), and products share a wrapping row. The text column has a basis of `12em`, so in a narrow container it moves under the icon rather than being squeezed beside it.

## 5. Readouts

Readouts draw values and status where they are read at a glance. They share these rules:

- **Status fills and glyphs sit on `panel-inset`** (a trough, a lens, or a plate), where every fill meets 3:1 ([visual-system.md §4](visual-system.md)).
- **The readout plate** (`styles/readout.ts`) is the inset surface that the production stat and connection row draw everything on, so their contrast does not depend on where they are placed.
- **Values update immediately** for assistive technology; a fill may animate visually, and reduced motion removes it.
- **Repairs** follow [component-model.md §6](component-model.md): a non-finite value, an inverted range, or an out-of-range boundary is repaired and warns once.
- **No announcement by default** ([accessibility.md §11](accessibility.md)).
- **Status vocabulary.** The five statuses (`neutral`, `info`, `success`, `warning`, `danger`) are a ring, a diamond, a filled circle, a triangle, and a square (`styles/status-shape.ts`). The four fill states are solid, ticks, hatch, and cross-hatch.

## 6. Progress bar

Determinate or indeterminate progress: `value` (unset is indeterminate), `max`, `variant`, `label`, `label-hidden`, `show-value`.

- The track is `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (the percentage) when determinate, and no `aria-valuenow` when indeterminate. It is labeled by the rendered label (still present when `label-hidden`), or by the host's `aria-label` copied in; with neither it warns. Custom markup, not `<progress>`, whose styling differs between engines.
- `value` is clamped to `[0, max]`; non-finite or empty is indeterminate; a `max` that is not a finite number above zero is 100.
- The percentage is `Intl.NumberFormat` percent with no fraction digits, in the nearest `lang` (crossing shadow roots; `lang=""` is the browser default).
- The fill animates `inline-size` (not a scale, which would stretch its pattern). Variants differ by pattern: `default` solid accent, `success` ticks, `warning` hatch, `danger` cross-hatch. Indeterminate is a full-width hazard stripe that scrolls, and is static under reduced motion.

## 7. Meter

A segmented gauge: `value`, `min`, `max`, `low`, `high`, `optimum`, `segments` (2 to 100, default 10), `orientation`, `label`, `label-hidden`, `show-value`.

- The track is `role="meter"` with the value attributes and `aria-valuetext`: the percentage, then the state word ("15%, warning"). It is named like the progress bar.
- **State** follows the HTML `<meter>` algorithm (`meter-state.ts`). With none of `low`, `high`, `optimum` set there is no state and the fill is solid `accent`. With any set, the missing ones default as in HTML: optimal is solid `success`, suboptimal hatched `warning`, the worst region cross-hatched `danger`. The best state adds no word.
- **Segments** are one repeating gradient over the fill and trough, not one element each, so the element count is fixed. The lit length snaps to whole segments: at least one above the minimum, full only at the maximum. The fill grows from the inline start (from the bottom when vertical), flipping in `rtl`.
- `--punk-meter-length` and `--punk-meter-thickness` size it.

## 8. Status light

A compact indicator: `variant` and `announce`, with the text in the default slot and an optional `icon` slot whose fallback is the built-in shape.

- The text carries the meaning; the shape, in an inset lens, is decorative and hidden. A light with no text (an icon alone counts as none) warns.
- No role by default. `announce` makes the host `role="status"` and gives back an author's role when turned off.

## 9. Production stat

A compact metric: `label`, `value` (a number; unset is none), `unit` (the application's text, never formatted or translated), `decimals` (0 to 6), `compact`, `trend` (`up`, `down`, `flat`), `delta`, `delta-percent`, `layout` (`stacked` or `inline`), `announce`; and the `icon` and `sparkline` slots.

- **Formatting** is `resolveStat` (pure): the value for the nearest `lang`; `delta` signed (`exceptZero`), as a ratio when `delta-percent`; an unset `trend` follows the sign of `delta`, and a change that rounds to zero at the digits shown is `flat`, so the arrow and number never disagree.
- **Stable figures.** The value, unit, and change are set in `font-mono` with `tabular-nums`, aligned to the inline end, reserving `--punk-stat-value-min`, so a column of stats lines up and a changing value moves nothing. The value is never clipped or ellipsized: the label wraps first, the figures go under the label where the row is too narrow, and a value wider than the whole plate breaks as a last resort.
- **Compact** shows an abbreviated value that is `aria-hidden`, with the full number as visually hidden text beside it.
- **No value** shows an en dash with the hidden word "no value".
- **Trend** is a shape (triangle up, triangle down, bar) and a hidden word, then the visible change. It carries no good-or-bad color: rising output is good and rising consumption bad, and the component cannot know which. An application that wants a verdict puts a status light beside it.
- **Reading order** (the accessible text): label, value, unit, trend word, change, slotted content. The icon follows the label in the DOM and is placed before it visually.
- **Sparkline** is application content in a slot sized by `--punk-stat-sparkline-size`; the component never reads it. An `svg`, `canvas`, or `img` there with neither `aria-hidden="true"` nor a name warns.
- No role; `announce` as on the status light. No animation: a changed value is drawn at once.

## 10. Connection row

A logistics or circuit connection: `direction` (`forward`, `backward`, `both`), `status`, `removable`, `remove-label`, `disabled`, `value`; and the `source`, `destination`, default (details), and `status` slots.

- **DOM order** is fixed: source, the direction as a hidden localized word ("to", "from", "to and from"), destination, details, status, button. The visual arrow flips in `rtl`.
- **Status** is a shape in an inset lens with the slot's text beside it. A `neutral` row with no text draws nothing; a non-neutral one with no text draws the shape alone and warns.
- **Remove button** (`removable`): a native button from the shared close-button styles, the row's only tab stop, with a 40px hit area under a coarse pointer. Its name is "Remove connection: {source}, {destination}" from the slots' text, read on connect and on `slotchange` (never in render), or `remove-label`, which is the way to name it when the text changes without a slot change. A click emits `punk-remove` with `{ value, item }`, bubbling, composed, and not cancelable; the application removes the row and moves focus (to the next row's button, or the list's heading after the last). `disabled` disables the button and removes it from the tab order, with every word still readable.
- **Narrow.** The host is the container. Below 360px the arrow turns to point down (or up), the source shares its line with the button, and the arrow, destination, details, and status take full-width lines.
- **Warning:** no source, no destination, and no `remove-label`.

## Verification

- Node: `stat-format.test.ts` (in `en`, `de`, `ar`, `ja`, against `Intl` output, never literals), `meter-state.test.ts`.
- Each component's tests: names and quantities in the accessibility tree, repairs and warnings, the count plate's contrast over white and black art, non-color tests with all status colors forced equal, fixed element counts whatever the segments or value, `selected` and `aria-pressed` rules, coarse-pointer sizes, the count's first digit visible in both directions, and the stat's equal widths for 1,111 and 8,888 with the real font.
- `selectable-base.test.ts`: activation, managed state, ownership.
- `production-surface.test.ts` and `production-review.test.ts`: every text node and glyph of the stat and row on `panel-inset` or a lens; no word split where there was room, no overlap, clipping, or overflow at 187px and 375px in every theme, density, variant, and forced colors.
- `aria.spec.ts`, the `inventory` and `production` visual groups, and `perf-production.test.ts`.

## Gaps

- **Long counts are cut.** A count wider than a small item is ellipsized; the docs say to use `compact-count`, a larger `size`, or low density. A design that never cuts (shrinking the plate's font, or moving the count outside) has not been chosen.
- **Size.** The item stack, recipe, and connection row are over the 5 kB entry budget ([performance.md](performance.md) Gaps).
