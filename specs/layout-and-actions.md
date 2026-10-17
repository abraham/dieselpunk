# Layout and Actions

**Scope:** the structural surfaces and layout primitives (panel, divider, stack, cluster) and the buttons (the shared button base, button, icon button).
**Code:** `src/components/panel/`, `divider/`, `stack/`, `cluster/`, `button/`, `icon-button/`; `src/internal/button-base.ts`, `button-base.styles.ts`, `slot-presence.ts`; `src/styles/density.ts`, `gap.ts`, `surfaces.ts`, `texture.ts`.

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
- **Variants.** `default`, `primary` (accent fill with `accent-text`), `danger` (danger fill with `danger-text`). Under forced colors, `primary` has a 4px border and `danger` a dashed one, so a destructive action keeps its cue.
- **States.** Idle raised; hover adds the hover ring; active presses in (the inset shadow, and the content shifts 1px down and toward the inline end; a default button also takes the inset fill); focus-visible shows the ring; disabled is flat with the disabled colors and a readable label. Hover and press apply only while neither disabled nor loading.
- **Disabled.** Sets the inner button's `disabled`. A capturing click listener on the host stops clicks in the host's padding from reaching any listener or form action. A disabled `<fieldset>` ancestor disables the button outside its first `<legend>`, read on every render.
- **Loading.** `aria-disabled="true"` and `aria-busy="true"` on the inner button, without `disabled`, so focus stays. Clicks are suppressed. The label is kept at `opacity: 0`, so the width and the accessible name do not change, and a CSS gear spinner sits over it (static under reduced motion). A visually hidden `role="status"` beside the inner button says "Loading".
- **Forms.** The class is form-associated. With `type="submit"` a click calls `requestSubmit()` on its form, and with `type="reset"` `reset()`. `type` defaults to `button`, unlike the native default, to prevent accidental submission. `SubmitEvent.submitter` is `null`, a platform limit.
- **ARIA forwarding.** The host's `aria-label` is mirrored onto the inner button. Other ARIA reaches the inner button only through `setExternalAria` ([accessibility.md §4](accessibility.md)).
- **Protocols.** It implements external ARIA and the roving item protocol ([package-contract.md §9](package-contract.md)).
- **Coarse pointers.** A transparent `::before` extends the hit area to at least 40px block size without changing the look.
- `--punk-button-padding-inline` sets the inline padding.

## 5. Button

A labeled button with the default slot, `icon-start`, and `icon-end`. Its only event is the native `click`. The label wraps with `overflow-wrap: break-word`.

## 6. Icon button

A square, icon-only button: one icon in the default slot (inline SVG in `currentColor` is typical), a required `label`, and `tooltip-placement`.

- Width equals height at every size and density, and the icon is centered at the icon size.
- **Name.** The inner button is named by `label`, else the host's `aria-label`. With neither it warns, and warns again if the name is later removed.
- **Tooltip.** It renders a `punk-tooltip` as the inner button's next sibling, showing `label`, with a 400ms delay and `describe="false"`, so the name is not read twice. Its register entry registers the tooltip, the one cross-family registration ([package-contract.md §2](package-contract.md)). **Why:** an icon-only control requires a visible label on hover and focus, and the icon button should not depend on the application remembering to register it.
- **Loading** hides the icon and shows the spinner; the name, size, and tooltip are unchanged.
- The base's inline padding is zeroed; `--punk-button-padding-inline` is not part of its API.

## Verification

- Each component's tests, including its unstyled appearance, both directions of every property, and its warnings.
- Button tests: Enter and Space, `focus()` on the host, disabled and loading suppressing clicks in host padding and form actions, loading width and name, the status element, submit and reset, the fieldset rule, `aria-label` forwarding, external ARIA, the coarse-pointer hit area extracted from the component's own stylesheet and hit-tested, and the forced-colors variant cues.
- Icon button tests: name and its warning, the tooltip on hover and focus without a duplicate description, square at each size and density, loading, and that registering it registers the tooltip.
- Panel and divider tests: variants, empty strips, `density` on a subtree, separator roles and orientation, label rules and the vertical warning.
- Stack and cluster tests: gap mapping and density, overrides, alignment in both directions, reflow at 187px.
- `reflow.test.ts` and the `foundation` and `shell` visual groups.

## Gaps

- **The icon button is the largest entry,** because it carries the tooltip and the button base ([performance.md](performance.md) Gaps).
