# Layout and Actions

**Scope:** the structural surfaces and layout primitives (panel, divider, stack, cluster, splitter), the buttons (the shared button base, button, icon button), and the page navigation (breadcrumb, pagination, steps).
**Code:** `src/components/panel/`, `divider/`, `stack/`, `cluster/`, `button/`, `icon-button/`, `breadcrumb/`, `pagination/`, `steps/`, `splitter/`; `src/internal/button-base.ts`, `button-base.styles.ts`, `slot-presence.ts`; `src/styles/density.ts`, `gap.ts`, `surfaces.ts`, `texture.ts`.

## 1. Panel

A structural metal surface: `variant` (`raised`, `inset`, `flat`; unknown is `raised`) and `density` (`compact`, `low`, or unset to inherit), with the default, `header`, and `footer` slots.

- The host is `display: block` and imposes no width or height. Padding is `--punk-panel-padding`.
- Header and footer are strips on `panel-inset` (so their text is covered by the contrast gate), with an etched edge toward the body. Each is rendered `hidden` while its slot is empty, through `SlotPresence`, and appears when content arrives.
- `raised` and `flat` carry the texture; `inset` does not.
- `density` applies the density token set to the panel's subtree, overriding an ancestor's `data-punk-density` in either direction ([visual-system.md §3](visual-system.md)).
- No role. An application adds `role="region"` and a label where the panel is a landmark.

## 2. Divider

An etched separator: `orientation` (`horizontal`, `vertical`; unknown is horizontal) and `decorative`, with an optional label in the default slot.

- The line is 1px dark beside 1px light. A horizontal divider with a label draws the label centered between two lines; whitespace-only text is no label. The label is `text-muted` and wraps.
- The host is `role="separator"` with `aria-orientation`, written as host attributes; `decorative` makes it `role="none"` with no orientation.
- A vertical divider stretches to its container's block size (at least `1em`) and ignores its label, warning once when one is present. The label slot is always rendered, inside a `hidden` wrapper when unused, so label tracking keeps working.

## 3. Stack and cluster

Layout primitives with no decoration, no role, and no parts.

- `punk-stack` is a column with `gap` (`0` to `5`, mapped to `0` and `--punk-space-1` to `--punk-space-5`, default `2`) and `align` (default `stretch`).
- `punk-cluster` is a wrapping row with `gap`, `justify` (default `start`), and `align` (default `center`).
- `--punk-stack-gap` and `--punk-cluster-gap` override `gap`. Gaps follow density.
- Children may shrink below their content, and a stack's children are also clamped to its width, so a long word breaks and nothing scrolls sideways.
- Unknown values are ignored.

## 4. Button base

`PunkButtonBase` is shared by the button and icon button.

- **Structure.** A native `<button type="button">` fills the host, with `delegatesFocus`. Subclasses supply its content and may add content after it.
- **Size.** `size` (`sm`, `md`, `lg`) sets a minimum height from `--punk-control-height-<size>` and an icon box from `--punk-icon-size-<size>`. Height is a minimum, not a fixed value, so a wrapping label grows the button; the host is at most 100% wide.
- **Variants.** `default` (raised panel), `primary` (accent fill with `accent-text`), `danger` (danger fill with `danger-text`), `confirm` (success fill with `success-text`, for an action that commits or approves). Under forced colors, `primary` has a 4px border, `danger` a dashed one, and `confirm` a 4px double one, so each keeps its cue.
- **States.** Idle raised; hover adds the hover ring; active presses in (the inset shadow, and the content shifts 1px down and toward the inline end); focus-visible shows the ring; disabled is flat with the disabled colors and a readable label. Hover and press apply only while neither disabled nor loading. Fills by state:

  | Variant          | Hover                             | Press                            | Disabled                                                               |
  | ---------------- | --------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
  | `default`        | Its own fill, with the hover ring | `panel-inset`, with `text`       | `disabled-fill` with `disabled-text`                                   |
  | The filled three | Its fill mixed 25% toward `text`  | Its fill mixed 45% toward `text` | Its fill mixed 30% into `disabled-fill`, text 45% into `disabled-text` |

  Mixing toward `text` lightens a fill on dark themes and darkens it on light ones; the contrast gate checks each fill's text on both mixes ([visual-system.md §4.1](visual-system.md)). A disabled filled button keeps a trace of its fill so its kind still shows; under forced colors every disabled button is `GrayText`. **Why** a default button keeps its fill on hover: filled with `accent`, a hovered default button looked exactly like an idle primary one, and hover is meant to brighten edges, not change kind ([product.md §4](product.md)).

- **Disabled.** Sets the inner button's `disabled`. A capturing click listener on the host stops clicks in the host's padding from reaching any listener or form action. A disabled `<fieldset>` ancestor disables the button outside its first `<legend>`, read on every render.
- **Loading.** `aria-disabled="true"` and `aria-busy="true"` on the inner button, without `disabled`, so focus stays. Clicks are suppressed. The label is kept at `opacity: 0`, so the width and the accessible name do not change, and a CSS gear spinner sits over it (static under reduced motion). A visually hidden `role="status"` beside the inner button says "Loading".
- **Forms.** The class is form-associated. With `type="submit"` a click calls `requestSubmit()` on its form, and with `type="reset"` `reset()`. `type` defaults to `button`, unlike the native default, to prevent accidental submission. `SubmitEvent.submitter` is `null`, a platform limit.
- **ARIA forwarding.** The host's `aria-label` is mirrored onto the inner button. For a disclosure toggle, the host's `aria-expanded` is mirrored too (an anchored overlay's state wins over it), and the host's `aria-controls` IDs are looked up in the host's tree when it renders and set as the inner button's `ariaControlsElements`, since an element reference can leave a shadow tree where an ID cannot. Other ARIA reaches the inner button only through `[setExternalAria]` ([accessibility.md §4](accessibility.md)).
- **Protocols.** It implements external ARIA and the roving item protocol ([package-contract.md §9](package-contract.md)).
- **Coarse pointers.** A transparent `::before` extends the hit area to at least 40px block size without changing the look.
- `--punk-button-padding-inline` sets the inline padding.

## 5. Button

A labeled button with the default slot, `icon-start`, and `icon-end`. Its only event is the native `click`. The label wraps with `overflow-wrap: break-word`.

- **Arrow.** `arrow` (`end` or `start`, reflected) points the button with a tip on that inline side, for an action that moves on or back: "Next", "Back", a step in a sequence. Unknown values render no tip. The tip mirrors in `rtl`.
- **Shape.** The tip is half the button's minimum height long, with 45-degree sides; a label that wraps gives it a flat nose. The host grows by the tip's length, and the body's corners on that side are square. It is drawn inside the inner button, so it hovers, presses, and clicks with it, and only the point itself is hit: the corners beside it are the host's.
- **Drawing.** Four layers, each clipped to the tip grown by the offset of a part of the body: the fill (the body's current fill, so every state follows), the outline, and the focus ring's two tones (shown only with `:focus-visible`). Square shoulders join each to the body's. The tip is `aria-hidden`; the name is the label.
- **Forced colors.** The body drops its border on the tip side, the tip draws its edge in `ButtonText` (`GrayText` when disabled), and focus draws a `Canvas` gap and a `Highlight` ring around both, in place of the body's outline, which would cross the tip. The tip's edge is solid even where the body's border is double or dashed.
- **Why** not the icon button: a square icon-only control has no label to point.

## 6. Icon button

A square, icon-only button: one icon in the default slot (inline SVG in `currentColor` is typical), a required `label`, and `tooltip-placement`.

- Width equals height at every size and density, and the icon is centered at the icon size.
- **Name.** The inner button is named by `label`, else the host's `aria-label`. With neither it warns, and warns again if the name is later removed.
- **Tooltip.** It renders a `punk-tooltip` as the inner button's next sibling, showing `label`, with a 400ms delay and `describe="false"`, so the name is not read twice. Its register entry registers the tooltip, the one cross-family registration ([package-contract.md §2](package-contract.md)). **Why:** an icon-only control requires a visible label on hover and focus, and the icon button should not depend on the application remembering to register it.
- **Loading** hides the icon and shows the spinner; the name, size, and tooltip are unchanged.
- The base's inline padding is zeroed; `--punk-button-padding-inline` is not part of its API.

## 7. Breadcrumb

`punk-breadcrumb` with `punk-breadcrumb-item` children: the path to the current page.

- **Semantics.** A `nav` landmark named by `label`, else the localized "Breadcrumb", around an `<ol>`. Each item host is `role="listitem"`; it renders a native link to `href`, named by its slotted text, or text when it has no `href`. A `current` item has `aria-current="page"` and is not underlined.
- **Separators** are a slash shape before every item but the first, hidden from assistive technology and mirrored in `rtl`. Items wrap onto more lines and never scroll sideways.
- **Collapsing.** With `max-items` (2 or more), a longer path shows its first item and its last `max-items - 1`; a native button named by the localized "Show full path" (showing an ellipsis) stands where the others were. Activating it shows them all and moves focus to the first revealed link. **Why** not a menu: the catalog's "collapse into a menu" would render another family's component ([component-model.md §9](component-model.md)), and revealing in place keeps every link in the list, in order.
- **Ownership.** To place the button after the first item, the breadcrumb puts the other items in its `rest` slot by writing their `slot`, and hides collapsed ones with `hidden`, as the toast stack writes its toasts' `slot`. It gives both back when an item leaves or it disconnects.
- **Unsafe links.** An `href` that is not an `http:`, `https:`, `mailto:`, or relative URL makes the item text, not a link ([security.md §4.2](security.md)).
- **Warnings:** a child that is not an item; an item whose `href` is unsafe.

## 8. Pagination

`punk-pagination`: moving through pages of results the application holds. `page` (from 1), `pages`, `siblings` (default 1), `label`.

- **Semantics.** A `nav` landmark named by `label`, else the localized "Pagination", around a list of native buttons: previous and next (named "Previous page" and "Next page", disabled at the ends) and a button for each page shown, named "Page 3" while it shows "3", with `aria-current="page"` on the current one. Numbers are formatted for the nearest `lang`, in the name as in the text.
- **Which pages** (`page-window.ts`, pure): the first and last, the current one with `siblings` on each side, and a gap (an ellipsis hidden from assistive technology) for each run left out; a gap never stands for a single page, which is shown instead.
- **Changes.** A click sets `page` and sends `punk-page-change` with `{ page }`. Focus stays on the pressed button, or moves to the current page when that button is gone or disabled. Setting `page` from script sends nothing.
- **Repairs.** `pages` below 1 or not a number is 1, and a `page` outside 1 to `pages` is clamped; each warns once per occurrence.
- **Look.** Raised buttons; the current page is set in with the inset bevel and an `accent` bar along its foot, and under forced colors a double border.

## 9. Steps

`punk-steps` with `punk-step` children: progress through a task of several steps, such as a setup wizard. `current` (1-based, default 1), `label`.

- **Semantics.** An `<ol>` named by `label`, else the localized "Steps". Each step host is `role="listitem"`. The steps before `current` are completed: a check, and the localized "completed" after the text, visually hidden. The current one has its number in an `accent` ring, bold text, and `aria-current="step"`. The ones after it are not started: the number, muted text, and the localized "not started". The marker and the connector before each step but the first are hidden from assistive technology, since the list gives the position. Numbers are formatted for the nearest `lang`.
- **Bounds.** `0` is before the first step, and a `current` past the last step means every step is completed, so neither needs a repair. A fraction is rounded down.
- **A record, not navigation.** The steps are not links or buttons, and the application moves `current`. **Why:** a wizard decides which steps may be revisited, and its own Back and Next buttons already say so.
- **Ownership.** The steps give each step its index and state through a symbol-keyed property ([component-model.md §8](component-model.md)), and clear it when the step leaves or the steps disconnect. A step writes `role` and `aria-current` only to its own host. A step outside a `punk-steps` has no number and no connector, and reads as not started.
- Steps wrap onto more lines and never scroll sideways. Under forced colors the completed marker is filled with `CanvasText`, and the current one has a `Highlight` ring.
- **Warning:** a child that is not a step.

## 10. Splitter

`punk-splitter`: two panes, in the `start` and `end` slots, with a divider the user drags or moves with the keyboard (the APG window splitter). `value` (the start pane's share, default 50), `min` (0), `max` (100), `step` (5), `orientation` (`horizontal`, side by side, or `vertical`, stacked), `label`.

- **Semantics.** The divider is a focusable `role="separator"` named by `label`, else the localized "Resize", with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-controls` on the start pane, and `aria-orientation` across the layout (`vertical` for side-by-side panes). The docs ask for a `label` that names the start pane.
- **Layout.** A grid: the start pane takes its share of the space left after the 8px divider, and the end pane the rest; both scroll their own overflow. Side by side the start pane is on the inline start, so on the right in `rtl`. Stacked panes need a height on the host.
- **Keys.** Side by side, Left and Right move the divider by `step` (swapped in `rtl`), and Up and Down are left to the page; stacked, Up and Down move it, as the arrows point. PageUp and PageDown move by the larger of `step` and 10%, Home and End go to `min` and `max`, and Enter collapses the start pane to `min` and gives back the share it had. The arithmetic is the slider's (`slider-math.ts`).
- **Pointer.** A press on the divider focuses it, captures the pointer, and reads the splitter's rectangle once; every move is arithmetic on it, to a tenth of a percent, clamped to the range. `touch-action: none` on the divider keeps the page from scrolling under a drag. Under a coarse pointer the divider has a 40px target.
- **Events.** `punk-split-change` with `{ value }` for each change the user makes, during a drag too, and none for a change from script or at an end.
- **Repairs.** A value outside the range is shown clamped. An inverted range or a `step` not above 0 is 0 to 100 in steps of 1, and warns once.
- **Look.** A raised bar with a grip of three lines that turns `accent` on hover and focus, and under forced colors a `ButtonText` border and grip.

## Verification

- Each component's tests, including its unstyled appearance, both directions of every property, and its warnings.
- Button tests: Enter and Space, `focus()` on the host, disabled and loading suppressing clicks in host padding and form actions, loading width and name, the status element, submit and reset, the fieldset rule, `aria-label` forwarding, external ARIA, the coarse-pointer hit area extracted from the component's own stylesheet and hit-tested, and the forced-colors variant cues.
- Icon button tests: name and its warning, the tooltip on hover and focus without a duplicate description, square at each size and density, loading, and that registering it registers the tooltip.
- Panel and divider tests: variants, empty strips, `density` on a subtree, separator roles and orientation, label rules and the vertical warning.
- Stack and cluster tests: gap mapping and density, overrides, alignment in both directions, reflow at 187px.
- `reflow.test.ts` and the `foundation` and `shell` visual groups.
- Node: `page-window.test.ts`, every page and sibling count up to 30 pages.
- `breadcrumb.test.ts`: the landmark and its name in each locale, links and the current page, separators, wrapping, collapsing and focus on expand, and ownership restoration. `pagination.test.ts`: the landmark, names and formatting by language, the ends, focus after a change, no event for script changes, and the repairs. `steps.test.ts`: the list and its name in each locale, the state words and `aria-current`, `current` both ways and its bounds, numbers by language, steps added and removed, the states under forced colors, connectors, wrapping at 187px in every theme, and the warning. All three are in the `navigation` gallery group. `splitter.test.ts`: the separator, its values and orientation, its name in each locale, the panes' shares in both directions and stacked, clamping and the repair, every key in both orientations and directions, Enter's collapse and restore, no event at an end or from script, drags in both orientations with one layout read, the range under a drag, and forced colors; in the `shell` gallery group.

## Gaps

- **The icon button is the largest entry,** because it carries the tooltip and the button base ([performance.md](performance.md) Gaps).
