# Data Display

**Scope:** components that present data and status in the flow of a page: the table, the alert, the badge, the spinner, and the keyboard key.
**Code:** `src/components/table/`, `alert/`, `badge/`, `spinner/`, `kbd/`; `src/styles/status-shape.ts`, `close-button.ts`, `visually-hidden.ts`.

## 1. Table

`punk-table` around a native `<table>` the application writes, so rows, headers, captions, and scopes keep their platform semantics. **Why** not a table rendered from data: cell content is often rich (status lights, buttons, links), and a native table in the light DOM is what every assistive technology and the application's own tests already understand.

- **Name.** The table's `<caption>`, or an `aria-label` on the table or the host.
- **Scrolling.** The table scrolls sideways inside the element, never the page. While it overflows, the scroll area in the shadow tree is a focusable `region` (`tabindex="0"`) named by the host's `aria-label` or the caption's text, so a keyboard can scroll it ([accessibility.md §9](accessibility.md)). Whether it overflows is the state one `ResizeObserver` per table holds, on the scroll area and the table, while connected ([performance.md §3](performance.md)).
- **Sticky header.** `--punk-table-max-height` limits the height; the header row then stays in view while the body scrolls under it.
- **Styles for the light DOM.** A shadow tree's styles cannot reach a slotted table's cells, so the element adopts one shared stylesheet into the table's root node (the document or a shadow root), once per root, and never removes it. Every selector is inside `:where()` and scoped to `punk-table > table`, so it has no specificity and any rule of the application's wins. This is the one stylesheet the library adds outside its own shadow roots ([component-model.md §7](component-model.md)).
- **Sorting.** Sorting is the application's. A header cell with `data-sort="key"` and a `<button>` inside is sortable. A click on the button sets `aria-sort` on that cell (`ascending` first, then alternating) and `none` on the other sortable cells, and sends `punk-sort-change` with `{ key, direction }`; the application reorders the rows. `sort-key` and `sort-direction` set the state from script without an event. The table owns `aria-sort` on sortable cells and restores the author's value when a cell leaves or it disconnects. The button shows a triangle for the direction and a pair of triangles when unsorted.
- **Selection.** Selection is by checkboxes the application places and names: one with `data-punk-select` in a body row (`<tr data-value>`) selects that row, and one with `data-punk-select-all` in the header selects every enabled row and shows `checked` or `indeterminate` for all or some. Selected rows get `data-selected` (an `accent` bar on the first cell). `values` reads the selected rows' values and checks rows by value when assigned. `punk-selection-change` carries `{ values, items }` once per change the user makes. **Why** checkboxes and not `aria-selected`: rows of a `table` do not take `aria-selected`, and a checkbox gives every row a named, focusable control.
- **Warnings:** no `<table>` child; a table with no name.

## 2. Alert

`punk-alert`: a message that stays in the page. `variant` (`info`, the default, `success`, `warning`, `danger`), `heading`, `dismissible`, `announce`, with the default (message) and `actions` slots.

- The variant is a status shape in an inset lens, hidden from assistive technology, with the text in `text` ([visual-system.md §4](visual-system.md)). The variant's color is also a bar on the start edge, as decoration.
- **Announcing.** Nothing is announced by default ([accessibility.md §11](accessibility.md)). `announce` makes the host a live region while it is set: `role="alert"` for `warning` and `danger`, `role="status"` for `info` and `success`. A role the author set is remembered and given back.
- **Dismissal.** `dismissible` adds a native dismiss button (localized "Dismiss"). `dismiss(reason)` (default `method`; the button says `user`) sends a cancelable `punk-dismiss` and, unless cancelled, sets `hidden`. Focus on the button goes with it, so the docs tell the application to move focus in its listener.
- **Warning:** no text and no heading.

## 3. Badge

`punk-badge`: a small count or status label inside a tab, a button, a list item, or a cell. `variant` (`neutral`, the default, `info`, `success`, `warning`, `danger`).

- It has no role and is never announced. Its text joins the name of the element that holds it ("Alerts 3").
- `neutral` is text alone; the other variants add their status shape before the text, hidden from assistive technology, so the variants differ without color. The plate is `panel-inset`, and its text is `text`, so both are covered by the contrast gate.
- **Warning:** no text.

## 4. Spinner

`punk-spinner`: a loading indicator for a region. `size` (`sm`, `md`, the default, `lg`, from the icon sizes), with the default slot.

- The loading button's dashed ring, hidden from assistive technology, beside a `role="status"` element holding the localized "Loading" (visually hidden), or the slotted text instead, shown.
- It turns while shown, and stands still under reduced motion. It is one of the two animations allowed to run continuously ([performance.md §3](performance.md)).
- For a busy button the button's own `loading` is used instead ([layout-and-actions.md §4](layout-and-actions.md)).

## 5. Keyboard key

`punk-kbd`: one keyboard key, drawn as a keycap, with the default slot for its name.

- A native `<kbd>` in the shadow tree holds the slot. The host has no role, and its text joins the name of the element that holds it ("Save Ctrl + S").
- **A shortcut is markup.** It is several keys with the application's own text between them (`+`, "then"), so it reads in order and is translated with the page. **Why** not a `keys` property: the separator and the key names are language, and the library's own strings are only its chrome ([localization.md](localization.md)).
- **Key names are the application's text.** The docs ask for words a screen reader can say ("Up arrow") where a symbol alone would be skipped or read as punctuation.
- The cap is the raised surface with a deeper bottom edge, and `text` in the mono face, so a key differs from a badge without color. Under forced colors the edges become a `CanvasText` border, still deeper at the bottom.
- A long name wraps rather than overflow its container.
- **Warning:** no text.

## Verification

- `table.test.ts`: the native table and its name, the adopted styles and their zero specificity, the region only while overflowing, sorting by click and from script, `aria-sort` restoration, the direction shapes under forced colors, selection by row and select-all, `values`, and the warnings.
- `alert.test.ts`: shapes under forced colors, roles with `announce` and their restoration, optional heading and actions, the localized dismiss button, cancelable dismissal.
- `badge.test.ts`: shapes and their absence for `neutral`, contrast of text and shapes in every theme, the name of the holding element, wrapping, and the warning.
- `spinner.test.ts` and `spinner.reduced-motion.test.ts`: the status text and its locale, slotted text, sizes, the ring stopping under reduced motion.
- `kbd.test.ts`: the native `<kbd>`, no role, a shortcut in the name of its button, the mono face and deeper edge, text contrast on the cap in every theme, forced colors, wrapping, and the warning.
- The `data` gallery group: axe, reflow, manifest, strings, and the visual matrix.
- `aria.spec.ts`: a sorted table with a selected row, an announcing alert, a badge in a button, a spinner, and keys in a button and in a paragraph, in the three engines.

## Gaps

- **The table's stylesheet stays after the last table leaves a root.** It is scoped to `punk-table > table` and has no effect without one, so it is harmless; closing it would need a count of tables per root.
