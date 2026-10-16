# Phase 3: Application Shell — Implementation Specification

**Status:** Draft 1. Work packages 1 (shared internals), 2 (layout and disclosure), 3 (tabs and toolbar), 4 (window and dialog), 5 (popover), 6 (toast), 7 (toggles and slider), and 8 (text, number, and select) are implemented, with their test infrastructure and workbench parts; the rest is not started.
**Parent:** [SPEC.md](SPEC.md), SPEC §17 (Delivery Phases), Phase 3
**Builds on:** [SPEC-PHASE-1.md](SPEC-PHASE-1.md), [SPEC-PHASE-2.md](SPEC-PHASE-2.md)
**Package:** `@dieselpunk/core`
**Prefix:** `punk-`

References written `SPEC §N` point to `SPEC.md`. References written `Phase 1 §N` point to `SPEC-PHASE-1.md`, and `Phase 2 §N` to `SPEC-PHASE-2.md`. Bare `§N` references point to this document.

## 1. Scope

### 1.1 Deliverables

1. Shared internals for form association, modal behavior, anchored overlays, roving focus, and the Escape stack (§7).
2. Eighteen components in fifteen registration entries (§5.1, §8):
   - layout and disclosure: `punk-stack`, `punk-cluster`, `punk-accordion` and `punk-accordion-item`, `punk-tabs` and `punk-tab`, `punk-toolbar`;
   - overlays and feedback: `punk-window`, `punk-dialog`, `punk-popover`, `punk-toast-stack` and `punk-toast`;
   - form controls: `punk-checkbox`, `punk-switch`, `punk-slider`, `punk-select`, `punk-text-field`, `punk-number-field`.
3. Responsive layout behavior for windows, footers, toolbars, and settings rows, checked at 375px and 200% zoom (SPEC §11).
4. Integration guides for plain HTML, React, Vue, and Svelte, each backed by a built and tested fixture app (§10.9).
5. A workbench with a docs page and story set for each component, an application-shell example that completes the SPEC §19 acceptance scenario, and guides for forms, focus and overlays, and responsive layout (§9).
6. Test coverage across themes, densities, engines, writing directions, zoom levels, and forced colors; form-participation tests; focus and modality tests; and performance and size gates (§10).

### 1.2 Out of Scope

- `punk-production-stat`, `punk-connection-row`, locale packs, the sound adapter, and performance tuning of production views; Phase 4.
- A searchable combobox. SPEC §7.2 defers it until its accessibility behavior is specified and tested on its own.
- A multiline text field, radio group, date and time inputs, file input, a menu component (`punk-popover` supplies the surface and focus behavior, §8.7), a data table, a tree, a vertical slider, and drag-to-resize windows.
- Framework wrapper packages. Phase 3 ships integration guides, and verifies them with fixture apps (§2 decision 19).
- Server-side rendering and hydration.
- A window manager: z-order beyond the top layer and focus-raising, snapping, minimizing, and persistence of window positions. Applications own those.
- Item art and application state, as in Phase 2.

### 1.3 Outcome

A developer can import the registration modules for window, tabs, toolbar, the form controls, slot grid, item stack, button, and progress bar, and build the assembler interface in SPEC §8 and SPEC §19 with their own item art. It supports mouse, touch, keyboard, and screen readers; its form controls take part in native forms; its dialogs and popovers manage focus; and it needs no React, Vue, or Svelte runtime. With Phase 2, this meets every acceptance point in SPEC §19.

## 2. Resolved Ambiguities

These decisions close gaps in `SPEC.md` and the earlier phase specs that affect Phase 3. Where one changes parent-spec wording or adds API, `SPEC.md` is updated when the package that needs it starts. Decisions 2, 8, and 12 change documented API and need the owner's confirmation before their packages start.

| # | Topic | Decision |
|---|-------|----------|
| 1 | Components SPEC §7 lists but SPEC §17 does not place | `punk-accordion`, `punk-stack`, and `punk-cluster` are in Section 7 and in the 1.0 definition of done (SPEC §18 item 1), but no phase lists them, and Phase 1 left stack and cluster out. They are Phase 3 components. `punk-accordion-item`, `punk-tab`, and `punk-toast` are the child tags those components imply. |
| 2 | `open` on `punk-window` (SPEC §7.1, §8) | A boolean attribute cannot default to true, and `<dialog>` and the popover API both default to closed. `open` defaults to `false`, and the SPEC §8 markup becomes `<punk-window heading="Assembler 03" open dismissible>`. `SPEC.md` is updated. |
| 3 | Registration entries | One `register.js` per family: `tabs` registers `punk-tabs` and `punk-tab`, `accordion` registers both of its tags, and `toast` registers both of its. Every other entry registers one tag. No entry registers a tag of another family, and no component renders another `punk-` component in its shadow tree: windows, toasts, and number fields draw their own native buttons from shared styles (§7.7), so the entries stay independent (Phase 2 §5.1). |
| 4 | Form association | Controls are form-associated custom elements: `static formAssociated = true`, `ElementInternals` for `setFormValue`, `setValidity`, and `labels`, and the form callbacks (§7.1). Roles on checkbox, switch, and slider are written as host attributes, not through `ElementInternals`, as in Phase 2 §7.3, so DOM tooling sees what users get. A text field, number field, and select render a native control in the shadow tree and delegate focus to it. |
| 5 | Names of fields | The accessible name comes from text in the shadow tree (Phase 2 §2 decision 6): checkbox and switch from their default slot, and the others from `label` or, failing that, `aria-label`, which the component copies to its inner control. An external `<label for>` focuses the control when clicked, which `delegatesFocus` and `ElementInternals.labels` provide, but does not name it: an ID reference cannot cross into the shadow tree. If no `label` or `aria-label` exists, the component reads the text of `internals.labels` when it renders and on `focusin`, and uses it as the name; this is not live, and the docs say to use `label`. A control with no name warns. |
| 6 | Boundary contrast for fields (Phase 2 §2 decision 1) | A text field, number field, and select have no visible text while empty, and a checkbox, switch, and slider track are identified by their shape alone, so their boundaries are 3:1 non-text contrast under WCAG 2.2 SC 1.4.11. They use `--punk-color-control-edge`, which the gate already checks on all four surfaces. No new color token is needed. Placeholder text uses `text-muted`, which the gate already requires to reach 4.5:1 on `panel-inset` (§6.2). |
| 7 | Error and status text | `danger` is below 3:1 on `panel` and `panel-raised` (Phase 2 §2 decision 2), so validation messages and toast text are drawn in `text`, never `danger`. The state is carried by a shape (a triangle for a message, the status-light shape for a toast), a `danger` frame drawn on `panel-inset`, and the word. The shapes are shared with `punk-status-light` (§7.7). |
| 8 | Moving a window (WCAG 2.2 SC 2.5.7 Dragging Movements) | Dragging a titlebar is functionality that needs a single-pointer alternative, so `movable` adds a `move-button` part (an addition to SPEC §7.1's parts). Activating it starts move mode: the arrow keys move the window by 8px (32px with Shift), a click anywhere puts the window's titlebar center at that point, Enter confirms, and Escape cancels. This also gives keyboard users a way to move it. Dragging stays, and is the quick way for a pointer. |
| 9 | Modal mechanics | Native `<dialog>` with `showModal()`, which makes the rest of the document inert and puts the dialog in the top layer. The library adds what the platform leaves out: a reference-counted `overflow: hidden` on `<html>` while any modal is open, initial focus on content rather than on a titlebar button, a restore of focus to the opener, and the Escape rule in decision 10. A backdrop click never closes a modal: these are task surfaces, and an accidental click must not discard work. |
| 10 | Escape (SPEC §9.1: "Escape closes the topmost dismissible overlay") | One module-level stack of open dismissible overlays (§7.2) with one `keydown` listener on `document`, present only while the stack is not empty, as the tooltip does (Phase 1 §8.6). Escape closes the topmost entry and stops propagation. A tooltip is topmost over everything that opened before it. `persistent` dialogs and non-`dismissible` windows join the stack as non-closing entries, so Escape does not fall through them to a window underneath. |
| 11 | Anchors and the ARIA protocol | `punk-popover` finds its trigger as the tooltip does (`for`, else the previous sibling) and sets `aria-expanded`, and `aria-haspopup` for menus. An IDREF cannot reach the inner `<button>` of a `punk-button`, so the Phase 1 `setExternalDescription` protocol grows into one `setExternalAria({ description?, expanded?, haspopup? })`, which `PunkButtonBase` implements (§7.3). `description` is the description's text. The package is unreleased (0.0.0), so `setExternalDescription` is renamed and not kept as an alias: an alias cost about 0.05 kB in every bundle that imports the button base. |
| 12 | Toolbar overflow (SPEC §11: "overflow into a menu supplied by the consumer") | The toolbar has an `overflow` slot for the consumer's trigger. Items that do not fit get `data-punk-overflow` and are hidden; the slot is shown only while some are; and `punk-overflow-change` reports them so the consumer can fill its menu. The toolbar builds no menu. Without an `overflow` slot nothing is hidden, the toolbar scrolls inside itself, and it warns once. Toolbars are an accepted exception to WCAG 1.4.10 reflow. |
| 13 | Arrow-key conflicts in a toolbar | Buttons, icon buttons, checkboxes, switches, and links are in the roving group. A select, text field, number field, and slider use the arrow keys themselves, so each stays its own tab stop outside the group (APG toolbar guidance). |
| 14 | Tab panels | A `punk-tab` names its panel by id in `panel`, resolved in the tab's root node, so a panel can be inside `punk-tabs` or beside it, as in SPEC §8. The tabs component owns `role="tabpanel"`, `aria-labelledby`, `hidden`, and, when the panel has no tabbable content, `tabindex="0"` on the panels it manages, restoring them when a tab is removed, as the slot grid does for its items (Phase 2 §2 decision 5). The tab list wraps and never scrolls sideways. |
| 15 | Toast announcements | The stack renders two persistent live regions, `role="status"` for `info` and `success` and `role="alert"` for `warning` and `danger`, and puts each toast in the matching slot. A live region that is added together with its content is not reliably announced, which is why the regions exist before any toast. The stack stays in the top layer even when empty, since a hidden region is not in the accessibility tree. |
| 16 | Toast timing (WCAG 2.2 SC 2.2.1) | Every toast has a dismiss button. A toast's timer pauses while it is hovered, has focus inside, or the document is hidden, and resumes with the time that was left. Default duration is 5000ms for `info` and `success`, and no timeout for `warning` and `danger` or when the toast has an `action`. A toast shown while a modal is open is inert, like everything outside the dialog; the docs say to put a stack inside the dialog when it must be usable. |
| 17 | Slider | A custom control with `role="slider"` on the host, not a native range input: pointer capture is required (SPEC §9.2) and a native range cannot be styled the same in all three engines. Its keyboard behavior is checked against a native `<input type="range">` in each engine (§10.5). It is operable by click on the track and by keyboard, so it needs no drag. A vertical slider is deferred. `input` and `change` are real `Event`s, as native ones are. |
| 18 | Number field and select | The number field uses a native `<input type="number">`, for its validity, `step` rounding, and spinbutton semantics. Its stepper buttons are for pointers: native buttons with `tabindex="-1"` and `aria-hidden`, since the arrow keys and typing already serve everyone else. The select uses a native `<select>` filled with copies of the host's light DOM `<option>` and `<optgroup>` children, kept current by one `MutationObserver` on the host. The open list is the platform's, and cannot be themed. |
| 19 | Frameworks (SPEC §17: "wrappers or integration guides") | Integration guides, no wrappers. Each guide is backed by a small fixture app in its framework, built in CI and run in a browser, so a guide cannot describe something that does not work (§10.9). The fixtures are the only place React, Vue, and Svelte appear, as dev dependencies. |
| 20 | Visual matrix size | Three groups, run separately as in Phase 2 §2 decision 13: `shell`, `forms`, and `overlays`. Overlays are captured open, each on its own page, since the top layer covers everything else (§10.4). |
| 21 | Localized strings | `localize.ts` gains the keys in §7.6. As before, the English default lives beside the component that renders it. |
| 22 | New tokens | `--punk-z-modal` (`1100`) and `--punk-z-toast` (`1200`), used only where the top layer is not available (§5.4). No new color tokens. `--punk-window-max-width` is a component property (§8.5), not a token. |

## 3. Constraints Carried Over

The toolchain, package contract, and conventions of Phase 1 §3 to §5 and §7, and of Phase 2, apply unchanged. These findings from the earlier phases shape this one:

- **Test for the three engines on Linux**, in the pinned image, from a Linux `npm ci` (Phase 1 §10.1). Emulation commands wait for the frame to report the change, `focusWithKeyboard` focuses the window first, and a test that toggles `prefers-reduced-motion` has its own file.
- **Every gate is mutation-checked.** A new test is run against a deliberately broken implementation first (Phase 1 §10.7).
- **Reflow, forced colors, and RTL are tested from the start** through the shared gallery, not left to hardening (Phase 1 §10.7).
- **Roles, tab stops, and states that a parent owns are written as attributes**, and given back when the owner lets go (Phase 2 §7.3).
- **Names come from text in the shadow tree** (Phase 2 §2 decision 6). A name that must reach a control inside a shadow root is copied, never referenced.
- **Phase 2's baseline note stands:** committed baselines are written by CI. Phase 2 generated its baselines locally in the pinned image because the CI-made ones already passed there unchanged; Phase 3 follows that practice only if the same check still passes, and says so.
- **Sizes are measured before limits are set** (Phase 2 §10.6). Entries are at most 5 kB gzip, an exception needs a documented reason, and the shared runtime stays at or below 12 kB.
- **Dev warnings are once per occurrence** and gated by the development export condition (Phase 1 §5.4).
- **Declare each tag with `@tagname`**, and each event, slot, part, and CSS property in JSDoc, so the manifest gates and the API tables find them (Phase 1 §9).
- **A control's host is not always its focus target.** Phase 1 learned this with `punk-button`; every roving or anchoring protocol in this phase asks the control, instead of assuming `tabindex` on the host.

## 4. Repository Layout

Additions to Phase 1 §4 and Phase 2 §4:

```text
packages/core/src/
  internal/
    form-control.ts           PunkFormControl: form association, validity, reset, restore
    modal.ts                  ModalController: showModal, focus in and out, scroll lock
    overlay-stack.ts          the Escape stack (§7.2), with no DOM types so node can test it
    overlays.ts               the page's one stack, bound to `document`
    anchor.ts                 anchor resolution and setExternalAria (§7.3), shared with the tooltip
    fieldset.ts               whether a disabled <fieldset> disables an element, for buttons and fields
    roving.ts                 RovingController: one tab stop, arrow keys, in either direction
    roving-keys.ts            pure: next enabled index for a key, with no DOM types
    tab-navigation.ts         pure: next tab for a key, from a list of tab states (work package 3)
    slider-math.ts            pure: clamp, snap to step, key to value, pointer to value
    window-position.ts        pure: clamp a window's translation to the viewport
    toast-timer.ts            pure: a pausable countdown, driven by an injected clock
    ids.ts                    uid('punk') for ARIA relationships
  styles/
    close-button.ts           the native close or dismiss button drawn by windows and toasts
    status-shape.ts           the five status shapes, moved out of status-light
    field.ts                  the inset field surface, boundary, label, hint, and message
  components/
    stack/  cluster/  accordion/  tabs/  toolbar/  window/  dialog/  popover/  toast/
    checkbox/  switch/  slider/  select/  text-field/  number-field/
      <name>.ts, <name>.styles.ts, index.ts, register.ts, <name>.test.ts, <name>.registration.test.ts
packages/core/test/
  tab-navigation.test.ts      node:test, no browser
  roving.test.ts              node:test, no browser
  slider-math.test.ts         node:test, no browser
  window-position.test.ts     node:test, no browser
  toast-timer.test.ts         node:test, no browser
  overlay-stack.test.ts       node:test, no browser
  browser/
    forms.test.ts             form participation across every control (§10.5)
    focus.test.ts             modality, focus return, and the Escape order (§10.6)
    perf-shell.test.ts        observer and listener gates (§10.7)
    fixtures/gallery.ts       gains the shell, forms, and overlays groups
  visual/
    overlays.spec.ts          open overlays, one page each (§10.4)
  frameworks/
    react/  vue/  svelte/     fixture apps for the guides (§10.9)
  package/
    src/shell.ts              the SPEC §8 assembler, built from the registration entries
apps/storybook/src/
  stories/                    a stories file for each family, the Application shell example, the guides
  stories/integration-*.mdx   one guide each for React, Vue, and Svelte
```

## 5. Package Contract

### 5.1 Exports and Registration

Each entry follows Phase 1 §5.1 and §5.2: a class entry with no side effects, and a `register.js` that defines the elements.

| Entry | Tags |
|-------|------|
| `stack` | `punk-stack` |
| `cluster` | `punk-cluster` |
| `accordion` | `punk-accordion`, `punk-accordion-item` |
| `tabs` | `punk-tabs`, `punk-tab` |
| `toolbar` | `punk-toolbar` |
| `window` | `punk-window` |
| `dialog` | `punk-dialog` |
| `popover` | `punk-popover` |
| `toast` | `punk-toast-stack`, `punk-toast` |
| `checkbox` | `punk-checkbox` |
| `switch` | `punk-switch` |
| `slider` | `punk-slider` |
| `select` | `punk-select` |
| `text-field` | `punk-text-field` |
| `number-field` | `punk-number-field` |

`check-package.ts` gains a sentinel string for each tag and requires that no entry registers a tag outside its own row (decision 3). The tooltip stays registered by `icon-button/register.js` only, as in Phase 1.

The package root exports the classes (`PunkStack`, `PunkCluster`, `PunkAccordion`, `PunkAccordionItem`, `PunkTabs`, `PunkTab`, `PunkToolbar`, `PunkWindow`, `PunkDialog`, `PunkPopover`, `PunkToastStack`, `PunkToast`, `PunkCheckbox`, `PunkSwitch`, `PunkSlider`, `PunkSelect`, `PunkTextField`, `PunkNumberField`), their option types, and the event types:

```ts
export type PunkCloseReason = 'escape' | 'close-button' | 'method' | 'action' | 'outside' | 'tab';
export type PunkCloseDetail = { reason: PunkCloseReason; returnValue?: string };
export type PunkMoveDetail = { x: number; y: number };
export type PunkTabChangeDetail = { value: string; tab: HTMLElement; panel: HTMLElement | null };
export type PunkToggleDetail = { expanded: boolean };
export type PunkOverflowDetail = { hidden: HTMLElement[] };
export type PunkDismissDetail = { reason: 'user' | 'timeout' | 'method' | 'limit' };

declare global {
  interface HTMLElementEventMap {
    'punk-open': CustomEvent<undefined>;
    'punk-close': CustomEvent<PunkCloseDetail>;
    'punk-move-start': CustomEvent<PunkMoveDetail>;
    'punk-move-end': CustomEvent<PunkMoveDetail>;
    'punk-tab-change': CustomEvent<PunkTabChangeDetail>;
    'punk-toggle': CustomEvent<PunkToggleDetail>;
    'punk-overflow-change': CustomEvent<PunkOverflowDetail>;
    'punk-dismiss': CustomEvent<PunkDismissDetail>;
  }
}
```

The fixture consumer (Phase 1 §10.4) gains a typed listener for each of these, so a missing declaration fails type checking under both supported TypeScript versions.

### 5.2 Naming

Class names are `Punk` followed by the PascalCase tag name without the prefix, as in §5.1.

### 5.3 Development Warnings

Each warns once per occurrence when:

- a window or dialog has no `heading` and no `aria-label`; a toolbar, tabs, or accordion with no accessible name where one is required (toolbar and tabs: `aria-label`); a form control with no name (decision 5);
- a `punk-tab` names a panel that does not exist, or two tabs name the same one;
- a `punk-popover` has no resolvable trigger, or a `menu` popover has no `menuitem` descendants;
- a toolbar's items overflow and it has no `overflow` slot content (decision 12), or an item in it cannot take focus;
- a dialog has no focusable content, and it is not `persistent` (a touch user could not dismiss it);
- `value`, `min`, `max`, or `step` are inconsistent on a slider or number field (clamped), or a `punk-select` has no options;
- a toast has no text.

### 5.4 Top Layer and Fallbacks

Windows and dialogs use `<dialog>`, popovers and the toast stack use the Popover API, and all of them therefore sit in the top layer. Where `showModal` or `showPopover` is missing, the surface is `position: fixed` with `--punk-z-modal`, `--punk-z-overlay`, or `--punk-z-toast`, and the tests disable the API to cover that path, as the tooltip's do.

## 6. Contrast and Tokens

### 6.1 Tokens

`--punk-z-modal` (`1100`) and `--punk-z-toast` (`1200`) join the base tokens (§2 decision 22). The tokens test that every theme has the same names is unaffected, since these are not color tokens.

### 6.2 Contrast Gate

`check-contrast.ts` already holds these for every theme, so work package 1 added no rule, only a test that the placeholder rule fails when `text-muted` is lost on `panel-inset`. The rules this phase depends on:

- `text-muted` against `panel-inset` is at least 4.5:1 (7:1 in `high-contrast`), for a placeholder and a hint on a field. It was added in Phase 2 with the other muted-text surfaces.
- `text` against `panel-inset` stays covered by the existing text rule, which also covers validation messages and the toast text on its lens (decision 7).
- `control-edge` against the four surfaces is already gated (Phase 2 §6.3), and covers every field boundary, checkbox box, switch track, and slider track.
- `accent` against `panel-inset` is already gated (Phase 2 §6.3), and covers the slider fill and the checked checkbox fill.

Disabled controls are exempt (Phase 2 §2 decision 1). If `text-muted` fails on a theme, the token is changed, not the rule.

## 7. Shared Internals

### 7.1 `PunkFormControl`

The base of the six form controls. It sets `static formAssociated = true` and holds an `ElementInternals`, and provides:

- `name`, `disabled`, and `required` properties, the read-only `form`, `labels`, `validity`, `validationMessage`, `willValidate`, and `isDisabled` (the control's own `disabled`, or a disabled `<fieldset>` around it), and `checkValidity()`, `reportValidity()`, and `setCustomValidity(message)`, with the behavior of a native control. `type` is left to each control, since the text field's is the input type.
- `value` handling through each subclass's `formValue()`, passed to `setFormValue` whenever it changes. A control with no `name`, or that is disabled, adds nothing to the form.
- `formResetCallback()`, which restores the **default**: the `checked` or `value` attribute as it was authored, not the live property. `formDisabledCallback(disabled)`, which reflects a disabled ancestor `<fieldset>` without touching the control's own `disabled`. `formStateRestoreCallback(state)`, which restores a value the browser kept across navigation.
- A `touched` flag, set on blur, on `invalid`, and on `reportValidity()`, so a message is not shown before the user has had a chance to type. Validation is always run, and the message is only shown when touched.
- The name protocol of decision 5: `aria-label` mirroring and the `internals.labels` fallback.

Subclasses implement `formValue()`, `validate()` (which calls `setValidity` with an anchor inside the shadow tree, so `reportValidity` focuses and scrolls to the right element), `resetToDefault()`, and `restoreState()`. They call `commit()`, which hands the browser the value and validity, as soon as the value changes, so a `FormData` read straight afterward is current; the base also calls it after every update.

A control does not reflect its live value to the attribute that holds the default. Reset restores the attribute as the author wrote it, as native controls do, and a reflected attribute would turn it into the current value. So `checked` (checkbox and switch) and `value` (slider) do not reflect, and the tables in §8.9 and §8.10 say so; a control styles itself from classes in its shadow tree, not from `:host([checked])`.

### 7.2 Modal Behavior and the Escape Stack

`ModalController` (`modal.ts`) is a reactive controller for a component with a `<dialog>` in its shadow tree. It owns:

- opening: `showModal()` or `show()`, and the fallback in §5.4;
- the reference-counted `overflow: hidden` on `<html>`, which restores the author's inline value, not an empty one;
- initial focus: an element marked `autofocus`, else the first tabbable element of the body and footer, else the dialog itself with `tabindex="-1"`. Never a titlebar button;
- restoring focus to the element that was focused when it opened, if it is still connected, else to `document.body`;
- turning a native `cancel` event into a `punk-close` with reason `escape`, or cancelling it for a persistent dialog;
- `punk-open` and `punk-close`, once each per change.

The component gives it `dialog()`, `modal()`, `dismissible()`, `contentRoots()` (the author's content, searched for `autofocus` and the first tabbable element), and `onOpen`/`onClose` callbacks, and calls `open()`, `close(reason, returnValue)`, and `dispose()` (on disconnect: lets go of the lock and the stack entry without events or moving focus). The platform already returns focus when it closes a `<dialog>`, so the controller's own return is tested on the fallback path, where it is the only one.

`overlay-stack.ts` is a pure module with `push(entry)`, `remove(entry)`, and `top()`, built by `createOverlayStack(target)`; `overlays.ts` binds the one page stack to `document`. Entries have `{ dismissible, close() }`. While the stack has an entry it holds one capturing `keydown` listener on the target that, on Escape, calls `stopPropagation()` and `preventDefault()` (so a native `<dialog>` beneath does not also close) and closes the topmost entry if it is dismissible; a non-dismissible entry still stops Escape from reaching entries beneath it. With an empty stack there is no listener. The tooltip is on this module, with its Phase 1 tests unchanged.

### 7.3 Anchors and `setExternalAria`

`anchor.ts` exports `resolveAnchor(host)` (the `for` rule of Phase 1 §8.6), and the wiring that adds and removes ARIA on an anchor and puts back only what it added. It extracts what `punk-tooltip` does today, and the tooltip uses it afterward. `setExternalAria({ description, expanded, haspopup })` is implemented by `PunkButtonBase` (so `punk-button` and `punk-icon-button`) by writing to the inner `<button>`. For any other anchor the wiring writes to the anchor itself.

### 7.4 `RovingController`

Used by tabs, the toolbar, and accordion headers. `new RovingController({ host, items, orientation })` listens on `host` after `connect()`; `refresh()` recomputes the one tab stop when the items or their disabled state change, `focus(item)` moves it and focus together, `current` is the item that holds it, and `disconnect()` gives every item its own tab stop back. It moves focus with the arrow keys (swapping in `rtl`, found with `:dir(rtl)`), `Home` and `End`, skips disabled and hidden items, ignores keys with Ctrl, Alt, or Meta, and follows focus that arrives another way. An item takes part by implementing `{ isDisabled, focusItem(), setTabStop(on) }`, where `setTabStop(null)` hands control back; `PunkButtonBase` implements it, since its host is not the focus target. A native `button` or link is adapted by writing `tabindex` and restoring the author's. It reads no layout and creates no observers.

`roving-keys.ts` is the pure part, `nextRovingIndex(key, from, disabled, { orientation, rtl })`, which does not wrap, as the slot grid does not (Phase 2 §7.2). `tab-navigation.ts` (work package 3) builds on it and adds automatic and manual activation.

### 7.5 Ids

`uid(prefix)` returns a document-unique id for ARIA relationships that stay inside one tree: a tab and its panel, a toast's label, a window's title. Ids the author set are kept.

### 7.6 Localization

`localize.ts` gains these keys. English defaults live beside the component:

| Key | Default | Used by |
|-----|---------|---------|
| `close` | `Close` | window |
| `dismiss` | `Dismiss` | toast |
| `moveWindow` | `Move window` | window |
| `moving` | `Moving. Use the arrow keys, Enter to place, Escape to cancel.` | window |
| `increase` | `Increase` | number field (the visible stepper, not announced) |
| `decrease` | `Decrease` | number field |
| `notifications` | `Notifications` | toast stack |
| `invalidField` | `invalid` | text field, number field, select (a prefix to a message) |
| `moreActions` | `More` | none by default; the toolbar's overflow trigger is supplied by the consumer |

Validation messages come from the browser (`validationMessage`), so they follow the browser's language. A consumer message set with `setCustomValidity` is shown as given.

### 7.7 Shared Styles

- `close-button.ts` is the native button with a drawn X, a 2px focus ring from `hostFocusRing`-style rules, a 40px hit area under a coarse pointer, and forced-colors rules. It carries the localized label as `aria-label`.
- `status-shape.ts` holds the five shapes now inside `punk-status-light`: ring, diamond, circle, triangle, square, with their forced-colors rules. The status light, the toast, and a field message use it.
- `field.ts` is the inset surface and boundary for text, number, and select fields, the label, hint, and message layout, and the states (hover, focus, invalid, disabled, read-only). The checkbox, switch, and slider reuse its boundary.

## 8. Components

All components follow Phase 1 §8 and Phase 2 §8: Shadow DOM, logical properties, tokens only, complete JSDoc with `@tagname`, and reduced-motion handling. None uses continuous animation.

### 8.1 `punk-stack` and `punk-cluster`

Layout primitives with no industrial decoration, no role, and no parts.

| Tag | Property | Attribute | Type | Default |
|-----|----------|-----------|------|---------|
| `punk-stack` | `gap` | `gap` | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'` | `'2'` |
| `punk-stack` | `align` | `align` | `'start' \| 'center' \| 'end' \| 'stretch'` | `'stretch'` |
| `punk-cluster` | `gap` | `gap` | as above | `'2'` |
| `punk-cluster` | `justify` | `justify` | `'start' \| 'center' \| 'end' \| 'between'` | `'start'` |
| `punk-cluster` | `align` | `align` | `'start' \| 'center' \| 'end' \| 'baseline' \| 'stretch'` | `'center'` |

- **Slots:** default.
- **CSS properties:** `--punk-stack-gap` and `--punk-cluster-gap`, which override `gap`. The gap values map to `0` and `--punk-space-1` to `--punk-space-5`, so density follows.
- The host is the flex container. A stack is a column; a cluster is a row that wraps. Children may shrink below their content (`min-inline-size: 0`), so a long word breaks and nothing forces horizontal scrolling.
- Both reflect their properties and ignore unknown values.

### 8.2 `punk-accordion` and `punk-accordion-item`

An etched disclosure group.

`punk-accordion`:

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `multiple` | `multiple` | `boolean` | `false` | yes |

- **Slots:** default (`punk-accordion-item` children).
- **Parts:** `accordion`.
- Single mode: expanding an item collapses the others. If several are expanded at connection, the first stays and the rest collapse, with one warning. The user may collapse the open item, so none can be open.
- **Keyboard** (on a header trigger): `Up` and `Down` move focus between enabled triggers without wrapping, `Home` and `End` go to the first and last. Enter and Space are native.

`punk-accordion-item`:

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `heading` | `heading` | `string` | `''` | yes |
| `level` | `level` | `number` (1 to 6) | `3` | yes |
| `expanded` | `expanded` | `boolean` | `false` | yes |
| `disabled` | `disabled` | `boolean` | `false` | yes |

- **Slots:** default (the panel), `heading` (rich heading content, replacing the property), `icon`.
- **Parts:** `item`, `heading`, `trigger`, `indicator`, `panel`.
- **Events:** `punk-toggle` with `{ expanded }`, sent for changes the user makes and not when the application sets `expanded`, as `punk-selection-change` is not (Phase 2 §8.3).
- The heading is an `<h{level}>` that holds a native `<button aria-expanded>`. The panel is `role="region"` with `aria-labelledby` the button; both are in the item's shadow tree, so the references work. A collapsed panel is `hidden`. There is no height animation.
- The indicator is a plus when collapsed and a minus when expanded, so state is a shape and not a color. A disabled item uses the native `disabled` on the button.
- An out-of-range `level` is clamped and warns once.

### 8.3 `punk-tabs` and `punk-tab`

`punk-tabs`:

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `orientation` | `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | yes |
| `activation` | `activation` | `'auto' \| 'manual'` | `'auto'` | yes |
| `value` | none | `string` | selected tab's `panel` | no |

- **Slots:** `tab` (the tabs), default (panels, optionally).
- **Parts:** `tablist`.
- **Events:** `punk-tab-change` with `{ value, tab, panel }` for changes the user makes.
- The tab list is `role="tablist"` with `aria-orientation`, and the tabs are its flattened children. The application supplies `aria-label` on `punk-tabs`, which the component copies to the tab list, and a missing one warns.
- The first enabled tab is selected when none is. A removed selected tab selects the nearest enabled one.
- The list wraps onto more rows and never scrolls sideways (decision 14).

`punk-tab`:

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `panel` | `panel` | `string` | `''` | yes |
| `selected` | `selected` | `boolean` | `false` | yes |
| `disabled` | `disabled` | `boolean` | `false` | yes |

- **Slots:** default (the label), `icon`.
- **Parts:** `tab`, `icon`, `label`.
- The host is `role="tab"`, with `aria-selected`, `aria-controls` (the panel's id), and a roving `tabindex` written by `punk-tabs`. A tab with no id gets one from `uid`. The name is its text.
- The selected tab uses an inset surface with an `accent` bar along the edge facing the panel, 3px against 0 for the others, so it differs without color.

Keyboard (the horizontal keys swap in `rtl`; vertical tabs use `Up` and `Down`):

| Key | Effect |
|-----|--------|
| `Left`, `Right` (or `Up`, `Down`) | Move focus to the previous or next enabled tab; in `auto`, also select it. No wrapping |
| `Home`, `End` | First and last enabled tab; in `auto`, also select it |
| `Enter`, `Space` | In `manual`, select the focused tab |
| `Tab` | From a tab, moves to the selected panel if it has tabbable content or `tabindex`, else past the tabs |

Panels: the selected tab's panel is shown, the rest are `hidden`, and each panel the tabs manage has `role="tabpanel"` and `aria-labelledby`. A panel with no tabbable content gets `tabindex="0"`. Everything written to a panel is put back when its tab is removed or the tabs element disconnects.

### 8.4 `punk-toolbar`

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `wrap` | `wrap` | `boolean` | `false` | yes |

- **Slots:** default (items and separators), `overflow` (the consumer's overflow trigger).
- **Parts:** `toolbar`.
- **Events:** `punk-overflow-change` with `{ hidden }`, the items now hidden, in order.
- `role="toolbar"`, `aria-orientation="horizontal"`, a fixed-height strip with a minimum, and the application's `aria-label` copied from the host. A missing one warns.
- **Items** are direct children that are a `punk-button`, `punk-icon-button`, `punk-checkbox`, `punk-switch`, `button`, or `a[href]`, or that have `data-punk-toolbar-item`. A `punk-divider`, `hr`, or `[role="separator"]` is a separator and is skipped. A select, text field, number field, and slider are tab stops of their own (decision 13). Anything else is ignored.
- **Roving:** `RovingController` keeps one tab stop among the items, moves with `Left` and `Right` (swapped in `rtl`), `Home`, and `End`, and does not wrap. Tab enters at the item that last had focus, else the first. The key handling reads no layout.
- **Overflow:** unless `wrap`, one `ResizeObserver` on the toolbar and a measurement on `slotchange` decide which trailing items do not fit; they get `data-punk-overflow` and are hidden and left out of the roving group, and the `overflow` slot is shown. Items never reorder. `wrap` lets the strip grow taller, with no observer.
- A hidden item that has focus when it overflows hands focus to the overflow trigger.
- Slotted `punk-button` and the other roving items are asked, not assumed (§7.4).

### 8.5 `punk-window`

A titled application window, optionally modal, movable, and dismissible.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `heading` | `heading` | `string` | `''` | yes |
| `open` | `open` | `boolean` | `false` | yes |
| `modal` | `modal` | `boolean` | `false` | yes |
| `movable` | `movable` | `boolean` | `false` | yes |
| `dismissible` | `dismissible` | `boolean` | `false` | yes |

- **Slots:** `icon`, default, `footer`.
- **Parts:** `window`, `titlebar`, `title`, `close-button`, `move-button`, `body`, `footer`.
- **CSS properties:** `--punk-window-max-width` (default `640px`). The window is `max-inline-size: min(100%, var(--punk-window-max-width))` (SPEC §11).
- **Events:** `punk-open`, `punk-close` with `{ reason }`, `punk-move-start` and `punk-move-end` with `{ x, y }`, the translation from the window's layout position.
- **Methods:** `show()`, `close()`, `resetPosition()`.

Structure and semantics:

- The window is a `<dialog>`, with `aria-labelledby` the title, which is `heading`. Modal windows call `showModal()` through the `ModalController`, and non-modal ones call `show()`, so they stay in the flow of the page and its container. A closed window renders nothing.
- `dismissible` adds the close button (a native button, localized `close`) and joins the Escape stack as a closing entry. Without it the window joins as a non-closing entry (decision 10), and a modal's `cancel` is prevented.
- Content wider than the window wraps. The body scrolls when it is taller than the window allows, and becomes a focusable scroll region (`tabindex="0"`) when it does, checked on open and on window resize while open.
- A modal window is at most the viewport height less 2 times `--punk-space-4`, so it fits at 200% zoom.
- At container widths of 480px and below the footer stacks its actions, full width and in order, by container query on the window.
- Opening a window while another modal is open is allowed, and the top layer stacks them.

Moving (`movable`):

- Dragging starts on the titlebar with pointer capture and `touch-action: none`, and never from `button`, `a`, `input`, `select`, `textarea`, `[tabindex]`, `[contenteditable]`, or `[data-punk-no-drag]` descendants. The window moves by `translate` and is clamped each move by `window-position.ts` so its rectangle stays in the viewport, and on an axis where it is larger than the viewport its start edge is pinned, so the titlebar stays reachable.
- The `move-button` (localized `moveWindow`, `aria-pressed`) starts move mode (decision 8). Entering it announces `moving` through a visually hidden status. Arrow keys move by 8px, 32px with Shift; a click moves the titlebar center to the pointer; Enter places the window; Escape returns it to where it was.
- A `resize` listener exists only while the window has a nonzero offset, and re-clamps it.
- A focused movable window is raised over its siblings with `z-index`; the application owns any stacking beyond that.

Details: opening a window that is already open does nothing; setting `open` before the element is defined opens it when it is; a window removed while open releases the scroll lock and its Escape entry.

### 8.6 `punk-dialog`

A modal confirmation or task surface. It is not movable and has no titlebar close button; its actions are in its footer.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `heading` | `heading` | `string` | `''` | yes |
| `open` | `open` | `boolean` | `false` | yes |
| `persistent` | `persistent` | `boolean` | `false` | yes |
| `alert` | `alert` | `boolean` | `false` | yes |

- **Slots:** default, `footer`.
- **Parts:** `dialog`, `header`, `title`, `body`, `footer`.
- **CSS properties:** `--punk-dialog-max-width` (default `480px`).
- **Events:** `punk-open`, `punk-close` with `{ reason, returnValue }`.
- **Methods:** `show()`, `close(returnValue?)`, and a `returnValue` property.
- It traps focus through the native modal and restores it on close. It labels itself from `heading`; `alert` makes it `role="alertdialog"` and describes it by its body.
- Escape closes it unless `persistent`, which also keeps Escape from reaching anything beneath it. A backdrop click does nothing.
- An element in the light DOM with `data-punk-close` closes the dialog on click and sets `returnValue` to its `data-punk-close` value (reason `action`). Application code can call `close()` instead.
- The footer stacks its actions at container widths of 480px and below, as the window's does.
- A dialog with no focusable content warns when it is not `persistent`.

### 8.7 `punk-popover`

An interactive anchored surface.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `for` | `for` | `string` | `''` | no |
| `placement` | `placement` | `'top' \| 'bottom' \| 'start' \| 'end'` | `'bottom'` | yes |
| `mode` | `mode` | `'content' \| 'menu'` | `'content'` | yes |
| `open` | `open` | `boolean` | `false` | yes |

- **Slots:** default.
- **Parts:** `surface`.
- **CSS properties:** `--punk-popover-max-width` (default `min(320px, 100vw - 16px)`), `--punk-popover-offset` (default `8px`).
- **Events:** `punk-open`, `punk-close` with `{ reason }`.
- **Methods:** `show()`, `hide()`, `toggle()`.
- The trigger is resolved as the tooltip's anchor is and is wired with `setExternalAria` (`aria-expanded`, and `aria-haspopup="menu"` in menu mode). A click, Enter, or Space on the trigger toggles the popover, and `ArrowDown` opens it in menu mode.
- The surface is `popover="auto"`, so it is in the top layer and light-dismissed by Escape and by a press outside. Where unsupported, §5.4 applies, with the same light dismissal implemented by one `pointerdown` and the Escape stack while open. Positioning is `computePosition` (Phase 1 §8.6), with the same flip, shift, and listeners only while open.
- **Focus in content mode:** a pointer open leaves focus where it is. A keyboard open (Enter, Space, or an arrow on the trigger) moves focus to an `autofocus` element, else the first tabbable element, else the surface (`tabindex="-1"`). Closing from inside returns focus to the trigger.
- **Focus in menu mode:** the host is `role="menu"`, and opening always moves focus to the first enabled `menuitem`, `menuitemcheckbox`, or `menuitemradio` (set by the application). `Up`, `Down`, `Home`, and `End` move among them without wrapping, `Escape` closes and returns focus to the trigger, and `Tab` closes (below). Activating an item does not close the menu by itself; the application calls `hide()`, or sets `data-punk-close-on-activate` on the popover to close on any item's click.
- **Tab** inside the popover at its last tabbable element (or `Shift+Tab` at its first) closes it and puts focus on the trigger before the default action, so the next Tab continues from the trigger.
- Inside a modal, a popover's trigger must be inside the same dialog; this is documented, since the rest of the page is inert.

### 8.8 `punk-toast-stack` and `punk-toast`

`punk-toast-stack`:

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `placement` | `placement` | `'top-start' \| 'top-end' \| 'bottom-start' \| 'bottom-end'` | `'bottom-end'` | yes |
| `limit` | `limit` | `number` | `5` | yes |
| `label` | `label` | `string` | `''` | yes |

- **Slots:** `polite` and `assertive` are filled by the stack, and the default slot takes `punk-toast` children, which the stack moves to the right slot by writing `slot` (decision 15) and gives back when a toast leaves.
- **Parts:** `stack`.
- **Methods:** `show(options)`, which creates and appends a toast and returns it (`options`: `message`, `heading`, `variant`, `duration`, `action` as an element), and `clear()`.
- The stack is `popover="manual"`, shown while connected, `pointer-events: none` apart from the toasts, and placed in the corner by `placement`. Its region is labeled with `label`, or the localized `notifications`.
- Past `limit`, the oldest toast is dismissed with reason `limit`. The newest is nearest the screen edge.

`punk-toast`:

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `variant` | `variant` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` | yes |
| `duration` | `duration` | `number` (ms) | see below | yes |
| `heading` | `heading` | `string` | `''` | yes |

- **Slots:** default (the message), `action`.
- **Parts:** `toast`, `indicator`, `heading`, `content`, `action`, `dismiss-button`.
- **Events:** `punk-dismiss` with `{ reason }`.
- **Methods:** `dismiss()`.
- The variant is shown by the status shape on an inset lens, never by color alone, and the text is in `text` (decision 7). The dismiss button is a native button with the localized `dismiss` label.
- **Duration:** unset means 5000 for `info` and `success`, and none for `warning`, `danger`, or a toast with an `action`. `0` means none. The countdown is `toast-timer.ts`: it pauses on hover, on focus inside, and while the document is hidden, resumes with the time left, and uses one timer. A paused or finished toast leaves no timer behind.
- A toast with no text warns once. Entering and leaving are a short fade that reduced motion removes.

### 8.9 `punk-checkbox` and `punk-switch`

Both extend `PunkFormControl`.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `checked` | `checked` | `boolean` | `false` | no (the attribute is the default that reset restores, §7.1) |
| `indeterminate` | `indeterminate` | `boolean` | `false` | yes (checkbox only) |
| `disabled` | `disabled` | `boolean` | `false` | yes |
| `required` | `required` | `boolean` | `false` | yes |
| `name` | `name` | `string` | `''` | yes |
| `value` | `value` | `string` | `'on'` | yes |

- **Slots:** default (the label).
- **Parts:** `control`, `box` (checkbox) or `track` and `thumb` (switch), `mark`, `label`.
- **Events:** native `input` (composed) and `change` on a user toggle, and `click`.
- The host is `role="checkbox"` or `role="switch"`, with `aria-checked` (`mixed` while `indeterminate`), `aria-required`, `aria-disabled`, and `tabindex="0"`, removed while disabled. The name is the default slot's text. A control with no text and no `aria-label` warns.
- `Space` toggles, on key up as a native control does, and never scrolls. A switch also toggles on `Enter`. A click on the label text toggles. A click on a disabled control does nothing.
- A click on an indeterminate checkbox clears `indeterminate` and toggles `checked`, as native does. `indeterminate` is never submitted.
- **Form:** when checked and enabled it submits `value` under `name`. `required` and unchecked is `valueMissing`. Reset restores the authored `checked`. `formStateRestoreCallback` restores `checked`.
- **Look:** the box and the track have a `control-edge` boundary (decision 6). A checked box shows a check mark, an indeterminate one a dash, an unchecked one nothing; a switch shows its thumb at the end with an "on" bar when on, and at the start with an "off" ring when off. Under forced colors the marks use `CanvasText` and `Highlight`, so on and off stay apart.

### 8.10 `punk-slider`

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `min` | `min` | `number` | `0` | yes |
| `max` | `max` | `number` | `100` | yes |
| `step` | `step` | `number` | `1` | yes |
| `value` | `value` | `number` | `min` | no (the attribute is the default that reset restores, §7.1) |
| `disabled` | `disabled` | `boolean` | `false` | yes |
| `showValue` | `show-value` | `boolean` | `false` | yes |
| `ticks` | `ticks` | `boolean` | `false` | yes |
| `label` | `label` | `string` | `''` | yes |
| `name` | `name` | `string` | `''` | yes |

- **Parts:** `header`, `label`, `value`, `track`, `fill`, `thumb`, `tick`.
- **Events:** native `input` while the value changes and `change` when a gesture or key press ends with a changed value.
- The host is `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-orientation="horizontal"`, and `tabindex="0"`. `aria-valuetext` is the host's own if it set one, else the number formatted with `Intl.NumberFormat` for the nearest `lang`. The name is the `label`, with an `aria-label` fallback.
- Values clamp to the range and snap to `step` from `min`, using the decimals of `step` to avoid floating-point drift. An inverted or non-finite range is repaired (0 to 100) and warns once.
- **Keys** (horizontal; in `rtl` the end of the range is on the left): `Right` and `Up` increase by `step`, `Left` and `Down` decrease, `PageUp` and `PageDown` change by the larger of `step` and 10% of the range snapped to `step`, and `Home` and `End` go to `min` and `max`. The arrow, `Home`, and `End` results match a native `<input type="range">` in the same direction, in every engine, except `Left` and `Right` in right-to-left text in WebKit, whose native range does not swap them (§11.7).
- **Pointer:** pointer capture on the track and thumb. `pointerdown` reads the track rectangle once, and every move computes from it, so dragging reads no layout. A click on the track sets the value and starts a drag. `touch-action: pan-y` keeps page scrolling.
- `ticks` draws a mark at every whole number of steps when there are 20 or fewer, and otherwise every `ceil(steps / 20)` steps.
- **Form:** submits `value` under `name`. Reset restores the authored `value`.
- The track is an inset trough with a `control-edge` boundary; the fill is `accent`; the thumb is a raised block with a visible boundary, so the position is read from the thumb, not from color.

### 8.11 `punk-text-field`

Extends `PunkFormControl` and renders a native `<input>` in the shadow tree with `delegatesFocus`.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `label` | `label` | `string` | `''` | yes |
| `value` | `value` | `string` | `''` | no |
| `type` | `type` | `'text' \| 'email' \| 'password' \| 'search' \| 'tel' \| 'url'` | `'text'` | yes |
| `name` | `name` | `string` | `''` | yes |
| `placeholder` | `placeholder` | `string` | `''` | yes |
| `disabled`, `readonly`, `required` | same | `boolean` | `false` | yes |
| `minlength`, `maxlength` | same | `number` | none | yes |
| `pattern` | `pattern` | `string` | none | yes |
| `autocomplete`, `inputmode` | same | `string` | none | yes |

- **Slots:** `prefix`, `suffix`, `hint`.
- **Parts:** `field`, `label`, `control`, `prefix`, `suffix`, `hint`, `message`.
- **Events:** native `input` (composed), and `change`, which the field re-dispatches on the host, since a native one does not cross the shadow boundary. `invalid` follows native rules.
- **Methods:** `focus()`, `select()`, plus those of §7.1.
- `value` is a property only, like a native input's current value; the `value` attribute is the default that reset restores.
- The label is rendered text with `<label for>` inside the shadow tree, and the `hint` is the inner control's `aria-describedby`, with the message when it shows. A missing name warns (decision 5).
- **Validation message:** once touched and invalid, the message part shows `validationMessage` with the triangle shape, and the inner control has `aria-invalid="true"` and the message in its description. The message is `text`, the frame is `danger` on `panel-inset` (decision 7).
- Paste is never blocked, and `autocomplete` is passed through (WCAG 3.3.8).
- **Look:** an inset field with a `control-edge` boundary, the prefix and suffix inside it, and a hover edge that gains contrast. The placeholder meets 4.5:1 (§6.2).

### 8.12 `punk-number-field`

Extends `PunkFormControl` and renders a native `<input type="number">`.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `label`, `name`, `placeholder` | same | `string` | `''` | yes |
| `value` | `value` | `string` | `''` | no |
| `min`, `max`, `step` | same | `number` | none, none, `1` | yes |
| `disabled`, `readonly`, `required` | same | `boolean` | `false` | yes |
| `hideSteppers` | `hide-steppers` | `boolean` | `false` | yes |

- **Slots:** `prefix`, `suffix` (for example a unit), `hint`.
- **Parts:** `field`, `label`, `control`, `prefix`, `suffix`, `hint`, `message`, `stepper`.
- **Events:** as the text field; and `valueAsNumber` is a read-only property.
- **Keys:** the native ones: `Up` and `Down` step, `PageUp` and `PageDown` where the engine supports them.
- The steppers call the native `stepUp()` and `stepDown()`, so rounding and bounds are the platform's, and fire `input` and `change`. Pressing and holding repeats after 400ms every 80ms, and stops on release, leave, or blur. They are `tabindex="-1"` and `aria-hidden` (decision 18) and are 40px wide under a coarse pointer, with the arrow keys as the equivalent control (WCAG 2.2 SC 2.5.8).
- The native spinner is hidden. Validity (`rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput`, `valueMissing`) is native's, passed to `setValidity`.
- A `min` above `max`, or a `step` that is not above 0, is repaired and warns once.
- Parsing and display of the number follow the engine and the user's locale settings, which differ between engines, so the docs say it is not formatted by the component.

### 8.13 `punk-select`

Extends `PunkFormControl` and renders a native `<select>`.

| Property | Attribute | Type | Default | Reflects |
|----------|-----------|------|---------|----------|
| `label`, `name` | same | `string` | `''` | yes |
| `value` | `value` | `string` | the first enabled option | no |
| `disabled`, `required` | same | `boolean` | `false` | yes |
| `selectedIndex` | none | `number` | `0` | no |

- **Slots:** `hint`. The `<option>` and `<optgroup>` children are not slotted: with no slot in the shadow tree they are not rendered, and the host reads them.
- **Parts:** `field`, `label`, `control`, `arrow`, `hint`, `message`.
- **Events:** native `input` and `change` on the host.
- The options are copied into the inner `<select>` when it renders, and when one `MutationObserver` on the host (child list, text, and the `value`, `disabled`, `selected`, `label` attributes) reports a change, which is disconnected with the element. The user's choice is written back to the light DOM option's `selected` property, so the host stays the source of truth.
- Single selection only (decision in §1.2). The arrow is drawn in CSS over `appearance: none`; the open list is the platform's.
- **Form:** submits the selected option's value. A `required` select whose first option has an empty value and is the chosen one is `valueMissing`, which is the native rule and how a placeholder option works. Reset restores the options' authored `selected`.
- A select with no options warns once.

## 9. Documentation Workbench

Additions to Phase 2 §9:

1. **A docs page and story set for each family**, with a playground, every state, the theme by density matrix, keyboard tables, and the manifest's API table. Overlays have stories that open them with a button, and the playground controls `open`.
2. **Application shell** example (`Overview / Application shell`): the SPEC §8 markup, completed. A window with tabs (Production, Modules, Settings), a toolbar, a recipe and progress bar, a slot grid of item stacks, a settings panel built from the form controls with a live display of the submitted `FormData`, a dialog that confirms a destructive action, a popover menu, and toasts. It is the SPEC §19 scenario, and the first screen stays the Inventory overview (SPEC §15).
3. **Responsive layouts guide:** the window at 375px and at 200% zoom, a footer that stacks, and a settings row (label beside its control above 480px, and above it below) built from `punk-stack`, `punk-cluster`, and a container query. The guide's examples are the same code as the fixtures that the tests render.
4. **Forms guide:** association, `FormData`, reset, validation and when messages appear, disabled fieldsets, labels (decision 5), and the autofill limit in §14.
5. **Focus and overlays guide:** modal behavior, focus return, Escape order (decision 10), why backdrop clicks do nothing, toast announcements and their limit in a modal, popover focus modes, and the move mode for windows.
6. **Accessibility guide** (Phase 1 §10.7, Phase 2 §9) gains each component's keyboard model, forced-colors cues, and the rule on error text (decision 7).
7. **Integration guides:** the plain HTML guide gains forms, and there is one guide each for React, Vue, and Svelte, each saying how to pass properties versus attributes, listen for `punk-` events and native `input` and `change`, bind a value, and type the elements. Each guide's code is the fixture's code (§10.9).
8. The workbench's smoke test (Phase 1 §12.8) covers every new entry with no console error or warning.

## 10. Testing and CI

### 10.1 Logic Tests

`tab-navigation.test.ts`, `slider-math.test.ts`, `window-position.test.ts`, `toast-timer.test.ts`, and `overlay-stack.test.ts` run under `node --test` with no browser. They cover every key and orientation in §8.3 and in RTL; clamping, snapping, floating-point steps, Page keys, and pointer mapping, including RTL, for the slider; windows larger than the viewport, on each axis, and at the corners; the toast countdown with an injected clock through pause, resume, and zero time left; and the stack's push, remove, and top, including non-closing entries. Each is mutation-checked.

### 10.2 Component Tests

Each component has `*.test.ts` and `*.registration.test.ts` as in Phase 1, covering the criteria in §12, on all three engines. These apply to the whole phase:

- **Accessibility tree.** Roles, names, and states are asserted with Playwright's ARIA snapshot, in the style of Phase 2 `aria.spec.ts`, for each family: tabs with a panel, an accordion item expanded and collapsed, a toolbar, a window and a dialog open, a popover in each mode, a toast stack with one of each variant, and each form control in each state.
- **Keyboard.** Every key table in §8, in `ltr` and `rtl`.
- **Both directions of every property**: set before and after connection, and an attribute added and removed.
- **Ownership.** Whatever a component writes to children it does not own (tab panels, toast `slot`, toolbar items) is restored when they leave or it disconnects.
- **Each state against its non-color cue**, by forcing all colors to one value and requiring the states to stay different: checked, indeterminate, on and off, invalid, selected tab, expanded, and each toast variant.

### 10.3 Accessibility

The shared gallery gains the three groups. The axe suite covers them in all themes and both densities, with no serious or critical violation: overlays are opened in their own fixtures, the form controls are named, tabs are checked with a panel, and `aria-required-children` and `aria-allowed-attr` are checked for the `tablist`, `toolbar`, `listbox`-free popover menu, and the live regions. The reflow test (Phase 1 §10.7) covers every in-flow component at 187 to 512px, and a separate test covers each overlay against the viewport.

### 10.4 Visual Regression

The matrix of Phase 1 §10.3 and Phase 2 §10.4 applies, with these changes:

- The gallery exports `shellNames`, `formNames`, and `overlayNames`, and `galleryGroups` gains `shell`, `forms`, and `overlays`. `componentNames` stays the union, for the axe, manifest, and reflow suites.
- **`shell`** renders the stack and cluster, an accordion with an expanded and a collapsed item, tabs in both orientations and both activation modes, a toolbar with and without overflow, and a non-modal window. **`forms`** renders every control in every state: idle, hover, focus-visible, active, checked, indeterminate, disabled, read-only, invalid, with a message, and a slider with ticks. A select is captured closed, since its list is the platform's.
- **`overlays`** renders each overlay open, on its own page selected by `component`: a modal window, a dialog, a popover in each mode, and a toast stack with one toast of each variant. They run at the four themes, both densities, both containers, and both zooms, in the `short` and `rtl` contents only, and the page behind them is a fixed neutral so only the overlay varies.
- Interaction states are driven with real input, as in Phase 2: hover, a keyboard-opened focus ring, and active on each control, and a window mid-move.
- The forced-colors project covers each group at one theme.
- Each group's baseline folder is its own, as Phase 2 §10.4 does. If a group passes 25 MB after its first run, the content variants are cut for it, and the spec says so.

### 10.5 Form Participation

`forms.test.ts` runs, for every control, on all three engines:

- `FormData` has the control's value under its `name` when enabled and named, and nothing when disabled or unnamed; a `form="id"` attribute places a control outside the form in it.
- A disabled ancestor `<fieldset>` disables the control for submission and for interaction, without changing its own `disabled`.
- `form.reset()` restores authored defaults (`checked`, `value`, the authored `selected` option), not the live value.
- `required` and `valueMissing`, `form.checkValidity()`, `reportValidity()` focusing the control, `setCustomValidity`, and each native constraint of the text and number fields.
- `formStateRestoreCallback` is called with a saved state and restores the value.
- `labels` are populated for a `<label for>`, a click on the label focuses the control, and the name fallback of decision 5 applies.
- **Slider parity:** every arrow, `Home`, and `End` key gives the same value as a native `<input type="range">` with the same range, step, and direction, in each engine.

### 10.6 Focus and Modality

`focus.test.ts` covers, on all three engines:

- a modal window and a dialog make the rest of the page inert, put initial focus where §7.2 says, trap Tab and Shift+Tab inside, and restore focus to the opener, including when the opener has moved in the DOM and when it was removed;
- the scroll lock counts: two modals open and closed in either order leave `<html>`'s inline `overflow` as the author had it;
- Escape closes only the topmost: a tooltip over a popover over a window, then each in turn; `persistent` and non-`dismissible` entries absorb it;
- a backdrop click closes nothing;
- popover focus rules in each mode, including the keyboard open, Tab at the boundary, and focus return;
- a window mid-move, in move mode with the keyboard, with a click, and with Escape; dragging never starts on a titlebar control;
- a toast's timer pauses on hover and on focus and resumes with the time left, and an `alert` toast sits in the `alert` region and an `info` toast in the `status` region, checked in the accessibility tree.

### 10.7 Performance and Listener Gates

`perf-shell.test.ts` checks what keeps the shell cheap, deterministically:

- With every overlay closed, the library has added no listener to `document` or `window`, and has created no observer. (A hook counts `addEventListener` calls on those targets, and the observer constructors.)
- An open popover, window, or dialog adds the Escape listener once, and removes it on the last close; a popover adds its scroll and resize listeners and its `ResizeObserver` while open only.
- A toolbar that is not `wrap` creates one `ResizeObserver` and no more however many items it has; a `wrap` toolbar creates none. An arrow key in it reads no layout.
- A slider drag reads the track rectangle once, at `pointerdown`, not on each move.
- A toast stack of ten toasts holds at most ten timers, and none while they are paused.
- Informational, not asserted: the time to render a form of fifty controls, in the CI log.

### 10.8 Size and Packaging

The gates of Phase 2 §10.6 apply, with each entry measured on its own, gzip-compressed, before any limit is set. The shared form base, the modal controller, and the field styles each get their own size-limit entry. `check-package.ts` requires that no entry brings a tag of another family (§5.1), and that tree-shaken imports of one entry do not include another's component. The forms and the window are the likeliest to pass 5 kB; if one does, the shared base is split before a limit is raised, and any exception is documented with its reason, as Phase 2's was. The icon button's limit is 7.5 kB after work package 1 (§11.1), the tabs' is 6 kB after work package 3 (§11.3), the window's is 7 kB after work package 4 (§11.4), and the popover's is 5.5 kB after work package 5 (§11.5), and the toast family's is 6 kB after work package 6 (§11.6), and the slider's is 5.5 kB after work package 7 (§11.7), and the text field's is 5.5 kB, the number field's 6.5 kB, and the select's 6 kB after work package 8 (§11.8).

### 10.9 CI and Framework Fixtures

The stages of Phase 1 §10.5 are unchanged. `test/frameworks/` holds a React, a Vue, and a Svelte app, each a few components long and bundled with esbuild in a script that `npm run check:frameworks` runs after `build`, in Chromium. Each app renders a form with a text field, a switch, and a slider, a tabs and window example, and a dialog; it binds values, handles `input`, `change`, `punk-tab-change`, and `punk-close`, submits the form, and reports what it received, which the script compares with what it expected. The guides show this code. A broken guide breaks CI. The fixtures' framework versions are held back from automatic updates in the way Playwright's are, since each bumps its own conventions for custom elements, and Dependabot groups them in one pull request.

The consumer check (`check-consumer.ts`) gains `test/package/src/shell.ts`: the SPEC §8 assembler built from the registration entries for window, tabs, slot grid, item stack, recipe, progress bar, button, and a form control, with typed listeners for every event in §5.1, under TypeScript 5.0 and the newest. It checks, in a browser, that the window is open and named, a tab switch changes the visible panel, and a control submits with its form. This is SPEC §19.

## 11. Work Packages

Packages are ordered by dependency.

| # | Package | Depends on | Output |
|---|---------|------------|--------|
| 1 | Shared internals | Phase 2 | `form-control`, `modal`, `overlay-stack` (the tooltip moved onto it), `anchor` and `setExternalAria`, `roving` and the roving protocol on `PunkButtonBase`, `ids`, `status-shape` moved out of the status light, `close-button`, `field` styles, the tokens, localization keys, a test of the contrast rule; logic and browser tests. Done (§11.1). |
| 2 | Layout and disclosure | 1 | `punk-stack`, `punk-cluster`, `punk-accordion`, `punk-accordion-item`, tests. Done (§11.2). |
| 3 | Tabs and toolbar | 1 | `punk-tabs`, `punk-tab`, `punk-toolbar`, `tab-navigation`, tests. Done (§11.3). |
| 4 | Window and dialog | 1 | `punk-window`, `punk-dialog`, `window-position`, the modal and Escape tests. Done (§11.4). |
| 5 | Popover | 1 | `punk-popover`, both focus modes, tests. Done (§11.5). |
| 6 | Toast | 1 | `punk-toast-stack`, `punk-toast`, `toast-timer`, tests. Done (§11.6). |
| 7 | Toggles and slider | 1 | `punk-checkbox`, `punk-switch`, `punk-slider`, `slider-math`, the parity test. Done (§11.7). |
| 8 | Text, number, and select | 1, 7 | `punk-text-field`, `punk-number-field`, `punk-select`, tests. Done (§11.8). |
| 9 | Test infrastructure | 2 to 8 as they land | Three gallery groups, axe and reflow coverage, ARIA snapshots, the visual matrix and `overlays.spec.ts`, `forms.test.ts`, `focus.test.ts`, `perf-shell.test.ts`, consumer typing and the shell fixture, baselines |
| 10 | Workbench | 2 to 8 as they land | Stories and docs per family, the Application shell example, the three guides |
| 11 | Integration | 7, 8, 10 | The React, Vue, and Svelte fixtures and guides, `check:frameworks` |
| 12 | Hardening | 9 | Forced-colors, RTL, 200% zoom, and 375px review of every render; size tuning; docs polish; `SPEC.md` updated |

Packages 2 to 8 can proceed in parallel after package 1, except that 8 reuses the toggles' boundary styles. The gallery in package 9 is extended as each family lands, so each package's own tests already run against it.

### 11.1 Work Package 1 Notes

What was built, and what implementation changed from the text above:

- **Files:** `ids`, `overlay-stack` and `overlays`, `anchor`, `fieldset`, `roving` and `roving-keys`, `form-control`, and `modal` in `internal/`; `status-shape`, `close-button`, and `field` in `styles/`. Node tests: `overlay-stack.test.ts` and `roving.test.ts` (13 tests). Browser tests, beside the code, for the modal controller (24), the form control base (17), the roving controller, the anchor module and the button protocol, the page stack, and the shared styles (13).
- **Tooltip** moved onto `anchor.ts` and the Escape stack. Its Phase 1 tests pass, with one rename: a test's fake anchor now implements `setExternalAria`.
- **`setExternalDescription` is gone, not an alias.** The package is 0.0.0, and the alias and a fallback for old anchors cost about 0.05 kB in every bundle that imports the button base. The button tests that called it use `setExternalAria({ description })`.
- **The contrast rule already existed.** `text-muted` against `panel-inset` was added in Phase 2 with the other muted-text surfaces, so no rule was added; a test now fails when it is lost.
- **Escape also calls `preventDefault()`**, so the platform does not close a native `<dialog>` that sits beneath the overlay that took the key.
- **Pure code has no DOM types.** The node-tested modules are `overlay-stack.ts` and `roving-keys.ts`; the code that touches `document` is in `overlays.ts` and `roving.ts`.
- **`status-shape` was extracted unchanged** (the status light's 18 tests and all 164 inventory baselines are as before); the status light now imports `statusLensStyles` and `statusShapeStyles`.
- **Sizes** (gzip). New entries: form control base and field styles 4.44 kB, modal controller and overlay stack 1.54 kB, roving controller and anchor 1.67 kB, close button and status shapes 3.31 kB, each against 5 kB. The shared runtime is 8.37 kB (was 8.28). The button grew from 4.38 to 4.54 kB, the tooltip from 4.44 to 4.68 kB, and the icon button from 6.94 to 7.32 kB, past its 7 kB limit. Nothing was left to split, since the icon button's entry is the button base and the tooltip, so its exception is back at 7.5 kB, the figure Phase 1 had before it tightened it (Phase 1 §10.4). The rest of the code is in shared modules that windows, popovers, and the fields reuse.
- **Mutation checks:** 16 mutations of the new code were each caught by a test, after two weak tests were fixed: the focus return, which the platform also does on a native `<dialog>`, is now tested on the fallback path, and the fieldset rule has its own test.

### 11.2 Work Package 2 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/stack`, `cluster`, and `accordion` (the accordion directory holds both tags, with one `register.ts` that defines both, as §5.1 says), and `styles/gap.ts`, the one helper that maps `gap` `0` to `5` to the spacing tokens for the stack and the cluster. Each component has its class, styles, `index.ts`, `register.ts`, and tests, plus a `*.registration.test.ts` that checks the class entry does not define the element.
- **The heading is `role="heading"` with `aria-level`, not `<h{level}>`.** A real `<h1>` to `<h6>` cannot have its level changed without replacing the element, and a heading element inside a shadow tree is not reliably in the page's outline in every engine. The accessibility tree is the same, and the ARIA snapshot checks it.
- **The item tells its accordion, not the other way round.** An item holds `owner`, which the accordion sets on `slotchange` and clears for items that leave. When `expanded` becomes true, whether from the user or from code, the item calls `owner.itemExpanded(this)` and a single-mode accordion collapses the rest. This gives the same result for a click, `item.expanded = true`, and the attribute, with no event listener in the accordion to tell user changes from code changes. Several expanded items at connection, or after `multiple` is turned off, keep the first and warn once.
- **Every enabled heading is a tab stop**, as in the WAI-ARIA accordion pattern, so there is no roving controller. The accordion handles `keydown` on its container and acts only when the event came from an item's trigger, so arrows pressed in a field inside a panel are left alone. It uses the pure `nextRovingIndex` with the vertical orientation, so Up, Down, Home, and End skip disabled items and do not wrap. They behave the same in `rtl`.
- **Stack children are clamped to the stack's width** (`max-inline-size: 100%` as well as `min-inline-size: 0`). With only `min-inline-size: 0` a child sized to its content in a column with `align` `start`, `center`, or `end` still took the width of its longest word. The cluster needs no clamp, since flex items shrink and wrap; a test for it passed without one, so none was added.
- **State is a shape.** The indicator is a plus whose vertical bar, drawn with `::after`, disappears when expanded, leaving a minus; a test reads its `display`. Under forced colors the heading is a bordered button.
- **Gallery and visual group:** a `shell` group (`stack`, `cluster`, `accordion`, `accordion-item`) in the gallery, so the manifest, axe, and reflow suites cover it, and 148 baselines in `__screenshots__/<project>/shell/` (Chromium 128, forced colors 16, Firefox 2, WebKit 2). The 324 foundation and inventory baselines are byte-identical. The folder is 67 MB in all. `aria.spec.ts` has an accordion snapshot.
- **Consumer typing:** the fixture `app.ts` constructs a stack, cluster, accordion, and item, with a `@ts-expect-error` on a gap outside the union and on a field not in the `punk-toggle` detail. The probe clicks a heading and checks the event, under TypeScript 5.0 and the newest. The dedicated `shell.ts` fixture of §10 stays with work package 9.
- **Workbench:** stories for the three components (Playground, States, and the theme and density matrix), their order in the sidebar, and an accordion keyboard section in the accessibility guide. The smoke test renders 75 entries (was 63).
- **Sizes** (gzip, against 5 kB): stack 1.61 kB, cluster 1.67 kB, accordion with both tags 4.03 kB. `styles/gap.js` is left out of the shared entry so that stays at 8.37 kB.
- **Tests:** stack 22, cluster 24, accordion and item 37 (browser). The full run in Chromium, Firefox, and WebKit on Linux is 144 files, 2451 tests passed, 27 skipped; node tests 122; `test:visual` 496 passed.
- **Mutation checks:** five mutations were each caught: single mode not collapsing the others, keeping the last instead of the first expanded item, not clearing `owner` for a removed item, ignoring Shift, and removing the stack clamp. The same mutation of the cluster's clamp survived, so the clamp was removed from the cluster.

### 11.3 Work Package 3 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/tabs` (both tags, with one `register.ts`) and `components/toolbar`, and `internal/tab-navigation.ts`, the pure part: `navigateTabs` (what a key does, for `auto` and `manual` activation, in either direction) and `resolveSelection` (the enabled tab nearest a preferred one, forward first). `test/tab-navigation.test.ts` has 14 node tests; the node suite is 136.
- **Tabs do not use `RovingController`.** The key table needs `Enter` and `Space` in `manual` activation and a selection with each arrow in `auto`, which the controller has no place for, so `punk-tabs` handles `keydown` itself with `navigateTabs`, and `punk-tab` implements the roving item protocol (`isDisabled`, `focusItem`, `setTabStop`) so the tab stop is written the same way. The toolbar uses the controller as §8.4 says.
- **The tab stop** is the selected tab, moves to a tab when it gets focus (so a `manual` arrow press keeps it there), and a disabled tab has no `tabindex`.
- **The tab tells its tabs**, as an accordion item does: `owner` and `tabChanged`, set on `slotchange`. A tab that is upgraded after the tabs rendered gets no `slotchange`, so it calls `refreshTabs()` when it connects; `tabs.upgrade.test.ts` covers it. Selecting from code (`tab.selected`, `tabs.value`) sends no event; a `value` assigned before any tab exists is applied when they arrive.
- **No observer for panels.** A panel after the tabs in the markup may not be parsed when the tabs are, so a missing panel is not reported while `document.readyState` is `loading`, and the tabs look again on `DOMContentLoaded`. A panel whose tab has left, or whose tab's `panel` changed, is given back as the author wrote it, which can show a panel the tabs had hidden.
- **Look:** the selected tab is pressed in and has a 3px `accent` bar on the edge that faces the panel (`::before`, on the inline end for vertical tabs). Under forced colors the selected tab has a `Highlight` border and bar, and a disabled one `GrayText`.
- **Toolbar overflow.** The strip is the `role="toolbar"` element. One `ResizeObserver` on it (none with `wrap`, created after the first render) and `slotchange` call the measure. It shows every child, reads each width once, reserves the trigger and a gap, and hides the trailing children that do not fit, so a separator never ends the visible run and is never in `detail.hidden`. Focus in an item that goes away moves to the trigger, found before the item is hidden. Without `overflow` content it scrolls and warns once. The measure runs on resize and on child changes, not when an item's own content changes, and the docs say so.
- **Wrap lets items shrink** (`flex: 0 1 auto`, `max-inline-size: 100%`). WebKit in the Linux image showed a 3px horizontal scroll at 187px with a long native button label; Chromium and macOS WebKit did not, so only the pinned image found it. A test with a long native button covers it.
- **Gallery:** `shell` gains `tabs`, `tab`, and `toolbar` (seven names), with ids prefixed `g-tabs-` and a toolbar narrow enough to overflow. The toolbar's native `button` became a `punk-button`, since WebKit's axe run flagged an unstyled native button on a dark page; native items are the application's to style, and the component tests use them. `aria.spec.ts` has a tabs snapshot (panels inside and beside, a disabled tab) and a toolbar snapshot, in all three engines.
- **Baselines:** the 148 `shell` baselines were written again, and the foundation and inventory ones are byte-identical. `maxDiffPixelRatio` is 0.002, so `update` leaves alone a baseline that changed only in a small example; the group's folder is deleted first when an example changes. The folder is 73 MB.
- **Consumer typing:** the fixture `app.ts` builds tabs, panels, and a toolbar, with a `@ts-expect-error` on an activation outside the union and on fields not in the `punk-tab-change` and `punk-overflow-change` details. The probe clicks the second tab and checks the event, under TypeScript 5.0 and the newest.
- **Workbench:** stories for both (Playground, States, and the theme and density matrix), their place in the sidebar, and a tabs and toolbar keyboard table in the accessibility guide. The smoke test renders 83 entries (was 75).
- **Sizes** (gzip): tabs with both tags 5.4 kB, over 5 kB, with a limit of 6 kB; toolbar 3.92 kB. The tabs exception has a reason: it holds two components, the panel ownership and activation logic, and the tab and tab list styles, none of which another entry shares, so there was no shared base to split. The shared runtime is 8.37 kB.
- **Tests:** tabs 45 and toolbar 25 (browser). The full run in Chromium, Firefox, and WebKit on Linux is 159 files, 2706 tests passed, 27 skipped; `test:visual` 502 passed.
- **Mutation checks:** 17 mutations were each caught: the disabled and selection hooks, the event, auto activation, the rtl swap, forward-first resolution, restoring `hidden`, the `tabindex` rule, the once-only warning, `aria-selected`, the disabled `tabindex`, the focus handoff, the trailing separator, the observer with `wrap`, its disconnect, the trigger reserve, the scroll rule, and the wrap shrink rule.

### 11.4 Work Package 4 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/window` and `components/dialog`, and three shared files the layout in §4 did not list: `internal/modal-surface.ts`, the base class of both (`heading`, `open`, the `aria-label` copy, the `ModalController` wiring, `punk-open` and `punk-close`, the scroll region, and the footer); `styles/modal-surface.ts`, their shared surface, container query, and fallback; and `internal/window-position.ts`, the pure part (`clampOffset`, `offsetForCenter`, `keyboardStep`). `test/window-position.test.ts` has 11 node tests; the node suite is 147. The base is in the manifest globs, so the inherited attributes are documented.
- **The `<dialog>` is always in the shadow tree**, so the controller can find it, and a closed one is `display: none`: nothing is shown and nothing is in the accessibility tree. `open` is the source of truth. Setting it from code, from the attribute, or removing it closes with the reason `method`, and `punk-open` and `punk-close` are each sent once for every change however it happened.
- **A removed opener leaves focus on the page.** The controller used to leave focus on the hidden dialog's content when the opener was gone; `focus.test.ts` found it, and it now blurs focus that was inside the host.
- **Escape in move mode** is handled by putting a second entry on the overlay stack for as long as the mode lasts, so Escape puts the window back before it reaches the window's own entry, and a second Escape closes the window. A click anywhere (including inside the window) places the titlebar's center there, stops the click from reaching what was under it, and ends the mode; Enter or the move button ends it too. `punk-move-start` and `punk-move-end` are sent for a drag and for move mode, and a cancelled move reports the offset it went back to.
- **No layout reads while moving.** The window and titlebar rectangles are read once, when a drag or move mode starts, and every step is arithmetic on them (the rectangle with the current translation taken out). A `resize` listener exists while the window has an offset, and the base's own is there while it is open, for the scroll region; both are gone when it closes.
- **Footer stacking is a container query on the dialog**, so it follows the width the window has, not the viewport. A modal dialog's width follows the viewport, so its test checks only the stacked case, and the window's test checks both.
- **Look:** the move button reuses the close button's surface with a cross glyph, and while pressed it is `accent`, and `Highlight` under forced colors. The titlebar is an inset strip; under forced colors it has a border in place of the bevel.
- **Gallery:** `shell` gains `window`: three open, non-modal windows (plain, dismissible and movable with an icon and actions, and a 320px one). `dialog` is in the default gallery closed, since an open modal makes the rest of the page inert, which would hide everything else from the axe and reflow runs; the manifest still finds all its parts, because they are rendered while it is closed. The new `overlays` group (`dialog` and `window`) builds with `open`, which makes each a single open modal. The matrix page blurs whatever focus the overlay took, so no ring is in a baseline.
- **Visual and axe for overlays:** `matrix.spec.ts` renders the `overlays` group as one page for each overlay, in `short` and `rtl` content only, which makes 152 baselines (about 2 MB); the 148 `shell` baselines were written again, and the foundation and inventory ones are byte-identical. `overlays-a11y.test.ts` scans each open overlay on its own page, in every theme, density, and content variant (64 scans). `aria.spec.ts` has a snapshot of an open window and an alert dialog. The "window mid-move" capture of §10.4 is not in yet.
- **Consumer typing:** the fixture `app.ts` builds a window and a dialog with `@ts-expect-error` on a field not in the move detail and on a close reason outside the union. The probe is now async: it opens a dialog from code and checks that `punk-close` reports `method` and the `returnValue`.
- **Workbench:** stories for the window (Playground, States, a Modal that opens from a button, and the matrix) and the dialog (Playground, Alert, Persistent), their place in the sidebar, and a windows and dialogs section in the accessibility guide. The smoke test renders 92 entries (was 83).
- **Sizes** (gzip): dialog 4.88 kB, against 5 kB; window 6.88 kB, with a limit of 7 kB. The window's exception has a reason: the shared surface, controller, and styles are about the dialog's whole size, and the window adds the close button, dragging, and move mode on top; the shared part is counted in each entry, so splitting it out would not make either smaller. The shared runtime is 8.37 kB, with the surface styles left out of it.
- **Tests:** window 36, dialog 32, `focus.test.ts` 16 (browser). The full run in Chromium, Firefox, and WebKit on Linux is 177 files, 3180 tests passed, 27 skipped; `test:visual` 657 passed.
- **Mutation checks:** 22 mutations were each caught: the close hook, the open event, `open` clearing itself, disposing on removal, the scroll region, the resize listener, the once-only warning, the removed-opener blur, dragging without `movable`, the no-drag controls, clamping, the move entry on the stack, restoring on Escape, the resize listener only while moved, ending move mode when the window closes, the placing click's listener, the Shift step, the `action` reason, `persistent`, the fallback rule, and the footer breakpoint. One survived at first, the placing click's listener after move mode ended, and a test now covers it.
- **Left for later packages:** the popover over the window in the Escape order (work package 5), and the listener gates of §10.7 and `perf-shell.test.ts` (work package 9).

### 11.5 Work Package 5 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/popover` (`popover.ts`, `popover.styles.ts`, `index.ts`, `register.ts`) with `popover.test.ts` and `popover.registration.test.ts`. It builds on the shared `anchor`, `overlays`, `roving-keys`, `modal` (`isTabbable`), and `position` modules; none of them changed.
- **`popover="manual"` with its own light dismissal**, not `auto`. The native `auto` mode closes other popovers and ignores the overlay stack, so Escape would not follow the order of §8.3 and the reason of a close could not be told. The popover listens for `pointerdown` outside, `focusin` outside, and Escape (through `overlayStack`) only while it is open, and closes with `escape`, `outside`, `tab`, `action` (a click on a menu item), or `method`.
- **Keyboard opening** is told from a pointer click by `click` with `detail === 0`, so Enter and Space on the trigger put focus into the popover and a pointer click does not. Arrow Down on the trigger opens a menu popover with the first item focused.
- **Roles:** `role="menu"` is on the surface only while it is open in `menu` mode, and the trigger gets `aria-haspopup` and `aria-expanded` from `wireAnchorState`. The surface has no `tabindex` in menu mode, since axe reports `aria-required-children` on a focusable menu with no focused item; content mode keeps `tabindex="-1"` as the focus target.
- **Tab leaves cleanly.** Tab moves focus to the trigger and closes with `tab`, and the update runs synchronously (`performUpdate`), because Firefox runs the key's default action before Lit's microtask, and the content was still tabbable. The explicit `trigger.focus()` in the handler is only caught by a Firefox run; a mutation that removes it survives in Chromium.
- **Listeners and observers exist only while open**, the same rule as the window; `perf` gates for it are in work package 9.
- **Gallery:** `popover` is in the default gallery closed (the trigger is a `punk-button`); the `overlays` group has a page with a content popover and a menu popover open. That is 76 new baselines, 228 in the group, and the folder is about 80 MB. The foundation, inventory, and shell baselines are byte-identical.
- **Axe:** the overlay scan now includes the popover (96 scans). `aria.spec.ts` has a snapshot of an open content popover and an open menu.
- **Consumer typing:** the fixture `app.ts` builds a popover with a `@ts-expect-error` on a `mode` outside the union and a typed `punk-close` detail; the probe opens it from code, closes it, and reads the reason.
- **Workbench:** stories (Playground, Menu, States, and the theme and density matrix), their place in the sidebar, and a popovers section in the accessibility guide. The smoke test renders 97 entries (was 92).
- **Sizes** (gzip): the popover 5.21 kB, with a limit of 5.5 kB. The reason: the anchor wiring, the two focus modes, the menu keys, and light dismissal are all in the one component, and the shared modules it imports are about 2.5 kB of it; there is no shared base left to split.
- **Tests:** popover 41 and `focus.test.ts` 19 (browser), which now checks Escape for a popover on a window. The full run in Chromium, Firefox, and WebKit on Linux is 183 files, 3423 tests passed, 27 skipped; `test:visual` 736 passed, and its self-test passes.
- **Mutation checks:** 20 mutations were tried and 19 were caught: the trigger wiring, the open and close events, each close reason, the keyboard-open test, the menu role, the surface `tabindex`, the Tab handler, the synchronous update, the listeners' removal, and the Escape entry. The one that survived is the explicit `trigger.focus()` in the Tab handler, explained above.
- **Left for later packages:** the listener gates of §10.7 and `perf-shell.test.ts` (work package 9), and the "window mid-move" capture of §10.4.

### 11.6 Work Package 6 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/toast` (`toast.ts`, `toast-stack.ts`, `toast.styles.ts` with the styles of both tags, `index.ts`, and one `register.ts`), with `toast.test.ts`, `toast-stack.test.ts`, `toast.reduced-motion.test.ts`, and `toast.registration.test.ts`; and `internal/toast-timer.ts`, the pure part, with `test/toast-timer.test.ts` (13 node tests; the node suite is 160).
- **The timer** (`createToastTimer`) keeps its holds by reason, `hover`, `focus`, and `hidden`, so it resumes only when every one is released, and a hold placed before `start()` delays the count. It has at most one timer, none while held, and none once it has elapsed. The clock is injected (`TimerClock`), so the node tests drive it with a fake that also counts what is pending.
- **A toast sends `punk-dismiss` before it goes, and the event can be cancelled.** `dismiss(reason)` takes the reason, `method` by default, since the stack needs `limit`. Unless cancelled the toast fades and removes itself. A framework that owns the toast cancels the event and removes it in its own way, which the guide says. A cancelled toast has no countdown left, and can be dismissed again.
- **The fade waits on `getAnimations()`, not on a timer.** The toast marks itself leaving, awaits the `finished` promise of its animations, and removes itself. Under reduced motion there is no animation, so it goes at once. This keeps the number of timers to the countdowns, which §10.7 counts.
- **Pausing.** A mouse or pen over the toast pauses it; a touch does not, because a touch makes a pointer enter and leave at once. Focus inside pauses it. Focus moving between a toast's own parts is a `focusout` and a `focusin` in the same task, so it needs no check of its own. A hover or focus that exists when the countdown is rebuilt (the duration or variant changed under the pointer) is held again. A toast created while the document is hidden starts held. The `visibilitychange` listener exists only while a countdown does.
- **The stack's regions are not atomic.** `role="status"` and `role="alert"` both imply `aria-atomic="true"`, which would read out every toast showing whenever one arrives, so both regions have `aria-atomic="false"`. The name of the stack (`label`, else the localized `notifications`) is on a `role="region"` around them.
- **Placing.** A toast has an `owner`, as an accordion item has, and the stack writes its `slot` (`polite` or `assertive`) and gives the author's back when the toast leaves. `show()` places the toast before it is appended. A toast added in markup is found on `slotchange` of the default slot, which is rendered hidden for that purpose. The two named slots are documented, since the manifest test lists every slot a component renders.
- **Order and spacing.** Each region is its own column, so the toasts of the two regions are not interleaved by when they arrived. Within a region the newest is nearest the screen edge, and the alert region is nearer the edge than the status region. Slotted toasts have half the gap as margin, so the gap is the same between any two and nothing is added to an empty stack.
- **Top layer.** The surface is `popover="manual"` and shown on connect, and again when it is moved. Without the Popover API it is `position: fixed` with `--punk-z-toast`. It is click-through (`pointer-events: none`), and each toast takes clicks back. Toasts do not join the Escape stack. A stack outside a modal is inert while the modal is open, a stack inside the dialog is usable, and Escape closes the dialog and is not taken by the stack, each tested in `focus.test.ts` (22 tests).
- **`show()` treats the message as text**, never as markup.
- **Look:** a raised surface with the status shape in an inset lens, a heading in bold, the message and the action under it, and the dismiss button at the end. A short fade in and out, which reduced motion removes. Gallery toasts have `duration="0"` and an outside `::part(toast)` rule that removes the fade, so axe and the screenshots never see a toast part way through it.
- **Gallery:** `toast-stack` and `toast` join `componentNames`, so the manifest, axe, and reflow suites cover them. The stack is empty in the default gallery, since it is always in a corner of the top layer; the inline `toast` shows one of each variant, with a heading and an action. `overlayNames` gains `toast-stack`, whose page is the stack with one toast of each variant. That is 76 new baselines and 304 in the `overlays` group, and the folder is 82 MB. The foundation, inventory, and non-forced shell baselines are byte-identical. The overlay axe scan is now 128 scans, and `aria.spec.ts` has a snapshot of a stack with a status toast and an alert toast.
- **A defect from work package 4 was found by looking at the new forced-colors baseline.** The close and move glyphs of a window are drawn as backgrounds, which forced colors erase, so both buttons were blank. They are now drawn in `ButtonText` (`HighlightText` on the pressed move button), by `closeButtonStyles`, which the toast shares. The window and toast tests compare the glyph's color with the button's, and fail without the rule. The 8 forced-colors overlay baselines of the window and the 16 forced-colors shell baselines were written again. The window is at its 7 kB limit again, with a few bytes to spare.
- **The status light's sentinel changed in `check-package.ts`.** It was `variant-neutral`, which the shared status shapes now carry into every bundle that uses them; it is the `"announce"` property now.
- **Consumer typing:** the fixture `app.ts` builds a stack with a `@ts-expect-error` on a placement outside the union, on a reason outside the union, and on `show()` without a message. The probe shows a danger toast, checks that it is in the `assertive` slot, dismisses it, and reads the reason.
- **Workbench:** stories (Playground, Stack, States, and the theme and density matrix), their place in the sidebar, and a toasts section in the accessibility guide. The Stack story has buttons, since a stack covers a corner. The smoke test renders 102 entries (was 97).
- **Sizes** (gzip): the pair 5.76 kB, over 5 kB, with a limit of 6 kB. The exception has a reason: it holds two components in one entry, with the countdown, the shapes, the close button, and both sets of styles, and as with the window the shared parts are counted in each entry, so there was nothing to split out.
- **Tests:** toast 50, stack 39, and 2 under reduced motion (browser). The full run in Chromium, Firefox, and WebKit on Linux is 195 files, 3840 tests passed, 27 skipped; `test:visual` 815 passed, and its self-test passes.
- **Mutation checks:** 46 mutations were tried. 45 were caught, after tests for four were added or strengthened: the hover and focus a rebuilt countdown must keep, the limit not counting a toast that is leaving, the order of the two regions, and the glyph under forced colors. The one left, the check that focus stayed inside the toast in `focusout`, was equivalent, so the check was removed.
- **Left for later packages:** the ten-toast timer gate of §10.7 and `perf-shell.test.ts` (work package 9), and manual screen reader checks of the live regions, which §14 already names.

### 11.7 Work Package 7 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/checkbox`, `switch`, and `slider`, and three files the layout in §4 did not list: `internal/toggle-base.ts`, the base class of the checkbox and the switch, with `toggle-base.styles.ts` and `toggle-base.test.ts`; and `internal/slider-math.ts`, the pure part (`snapValue`, `keyToValue`, `valueFromPointer`, `ratioOf`, `tickRatios`, `normalizeRange`, `formatValue`). `test/slider-math.test.ts` has 33 node tests; the node suite is 193. `form-control.ts` and `toggle-base.ts` are in the manifest globs, so the inherited attributes are documented.
- **The checkbox and the switch share one base.** It owns `checked`, `value`, the click and key handling, the host attributes, and the form methods; the two classes add their role, the render, and (for the checkbox) `indeterminate`. The base is counted in each entry, as the window and dialog's is.
- **Roles and states are host attributes, written before the first render** (`role`, `aria-checked`, `aria-required`, `aria-disabled`, `tabindex`), so tools see what users get at once. `tabindex` is taken away while disabled, a disabled `<fieldset>` included.
- **One path for every toggle.** Space on key up and Enter on a switch call the host's own `click()`, and the click handler toggles and sends `input` (composed) and `change`. A click on a link or field inside the label is left alone, and a click that reaches a disabled control is stopped before the application hears it. A toggle calls `commit()` itself, so a `FormData` read straight afterward is current, which the tests read without waiting.
- **They implement the roving protocol** (`isDisabled`, `focusItem`, `setTabStop`), so the toolbar's group holds the one tab stop and the arrow keys move among a button, a checkbox, and a switch, and a slider stays its own stop.
- **Validation.** `required` and unchecked is `valueMissing`, with the message the engine gives its own checkbox, read from a detached native one. The validation anchor is the control in the shadow tree, and `reportValidity()` also focuses the host. In Chromium the engine focuses it anyway, so that override is the one mutation not caught there.
- **A checkbox that is `indeterminate` submits by `checked` alone**, as a native one does. The click clears it, then toggles.
- **The slider's `value` is an accessor.** A plain property cannot be "`min` until it is set", wherever `min` is, so `value` is stored raw, and read back clamped and snapped to the current range, which is also what `aria-valuenow` shows. An attribute, a property, a reset, and a restored state all go through it; the `value` attribute is the default a reset goes back to.
- **The name of a slider is written on the host.** An id reference cannot cross the shadow boundary, and axe reads attributes, so `label` is copied to `aria-label`, and the formatted number to `aria-valuetext`, unless the author set their own, which always wins and is left alone. What the slider wrote is taken away again when the label goes.
- **Pointer.** A press reads the track once and every move is arithmetic on it. The press keeps the page from selecting text and focuses the slider itself. The thumb's width is in the styles (`--_thumb`) and repeated in the code. A press with another button, or on a disabled slider, does nothing.
- **The parity test found an engine difference.** A native range in right-to-left text swaps Left and Right in Chromium and Firefox but not in WebKit, though all three draw it reversed. The slider swaps them, since its end is on the left, so the arrow keys, Home, and End match the native range in every engine and direction except Left and Right in right-to-left text in WebKit, where the test leaves those two keys out, and says why. The Page keys are not compared, since §8.10 does not ask for it.
- **Look:** the box and the track have a `control-edge` boundary, and a checked or mixed box is filled with `accent` with the mark in `accent-text`; the mark is a check, a dash, or nothing. A switch is a thumb at the end with a bar on an `accent` track, or at the start with a ring, in a short slide that reduced motion removes. A slider has an inset trough, an `accent` fill, and a raised thumb with its own boundary. Under forced colors the marks and fills are system colors, which, unlike `currentColor`, are kept.
- **Gallery:** `formNames` (`checkbox`, `switch`, `slider`) and a `forms` group, which is in flow, so one page holds every state in the `shell` way: 148 baselines, and 16 for the hover and keyboard-focus screenshots driven with real input. The group is 88 MB with the rest. The manifest, axe, and reflow suites cover all three; the ARIA snapshot covers each state, but Playwright does not print a slider's value, so the value attributes are read in the component tests.
- **`forms.test.ts`** is the form participation suite of §10.5, for these three for now: the value under the name, nothing when disabled or unnamed, a `form` attribute, a disabled `<fieldset>`, reset to the authored default in both directions, `formStateRestoreCallback`, labels, `required`, custom errors, and a blocked `requestSubmit`. The text, number, and select fields joined its list in work package 8 (§11.8).
- **Consumer typing:** the fixture `app.ts` builds a form with a checkbox, a switch, and a slider, with a `@ts-expect-error` on a string for `checked` and for `value`. The probe clicks the checkbox, presses End on the slider, and reads what the form submits.
- **Workbench:** stories for each (Playground, States, and the theme and density matrix), their place in the sidebar, and a section with a key table in the accessibility guide. The smoke test renders 114 entries (was 102).
- **Sizes** (gzip): checkbox 4.41 kB, switch 4.46 kB, and slider 5.34 kB with a limit of 5.5 kB. The slider's reason is that the form base, the pointer and key handling, and the host-attribute ownership are all its own, and nothing is left to split out; the form base is about a third of it.
- **Tests:** the checkbox and switch together 64 in `toggle-base.test.ts`, checkbox 12, switch 7 and 1 under reduced motion, slider 53, and `forms.test.ts` 44 (browser). The full run in Chromium, Firefox, and WebKit on Linux is 222 files, 4446 tests passed, 36 skipped; `test:visual` 982 passed, and its self-test passes.
- **Mutation checks:** 49 mutations were tried, and 48 were caught, after six tests were strengthened: a disabled click that is dispatched and not made, the press's `preventDefault`, the ring of an off switch, the fill's width away from the middle, a `max` that is not on a step, and a form read before the update. The one left is the `reportValidity()` focus above.
- **Left for later packages:** the slider's single read of the track in `perf-shell.test.ts` (work package 9; the component test already counts it), and the text, number, and select fields, which work package 8 did (§11.8).

### 11.8 Work Package 8 Notes

What was built, and what implementation changed from the text above:

- **Files:** `components/text-field`, `number-field`, and `select`, and `internal/field-base.ts` with `internal/field-base.test.ts`, which the layout in §4 did not list. `form-control.ts`, `toggle-base.ts`, and `field-base.ts` are in the manifest globs, so the inherited attributes are documented. `styles/field.ts` gained the `.word` rule for the capitalized "invalid", and the affix and control sizing below.
- **The three share one base.** `PunkFieldBase` extends `PunkFormControl` and owns `label`, `delegatesFocus`, the label, hint, and message markup (`renderField`), the ARIA written on the native control (`ariaBindings`: its name when there is no label, `aria-describedby`, `aria-invalid`), the validity read from the native control with the control as the anchor, and the host `change` that is re-sent. The message is always rendered, with `hidden`, since the manifest test needs every documented part to appear. Validity is set after the render that reads it, so a message that has just become due asks for one more update. The base is counted in each entry, as the toggles' is.
- **The name.** The label is rendered text tied to the control with `for`; without one the control gets `aria-label` from the host's, else the text of a `<label for>` pointing at the host, which is read on connect and on `focusin` and is not live. The shared `labelsText` of the form base is what carries that.
- **`live()` for the value binding.** A plain `.value=${this.value}` writes what the user typed back to the input after each update, and a script-set value ends the native "user edit" state that `minlength` and `maxlength` need: `tooShort` was never true. `live()` compares with what the input holds, so typing is left alone. The text field and the number field use it.
- **Affixes.** `prefix` and `suffix` are `flex: none` with `max-inline-size: 50%` and wrap inside it; the control has `min-inline-size: 3ch`. Without the cap, a long German unit pushed the box past 187px (the reflow test found it), and with `flex-shrink` and `overflow-wrap: anywhere` the unit was cut mid-word at normal widths.
- **The hint is checked on three surfaces.** `text-muted` is required on canvas, panel, and panel-inset and not on panel-raised (Phase 1 §6), where it is 3.43:1 in two themes, so the shared test of the hint covers those three, and the placeholder on the field's own inset surface in every theme.
- **A number field read before it renders.** `valueAsNumber` asked the control, whose render root did not exist yet; the consumer check, which reads it before the element is connected, found it. The lookup tolerates that and `valueAsNumber` is `NaN` until then.
- **Number field.** The two steppers are native buttons drawn in the shadow tree, `tabindex="-1"` and `aria-hidden`. A press prevents the focus change, focuses the input, steps at once, repeats after 400ms every 80ms, and stops on release, leave, cancel, blur, and disconnect; `input` is sent on each step and `change` when the press ends. They are 28px wide, and 40px under a coarse pointer, and each is half the field's height, so the keys are the equivalent control under WCAG 2.2 SC 2.5.8. The step goes through `stepUp()` and `stepDown()`, so rounding and bounds are the platform's, and `0.1` steps do not drift.
- **Select.** The options are not slotted, so there is no default slot to document: children with no slot to go to are not rendered, and the host reads them. The one observer is made on the first connect and reused, watches the child list, text, and the `value`, `disabled`, `selected`, and `label` attributes of the whole subtree, and is disconnected with the element. The choice is the `selected` property of the light options, and `value` and `selectedIndex` read it. A `value` with no option yet is kept until one arrives. A reset puts back each option's `selected` attribute, not the host's `value` attribute, which sets the first choice only. A `required` select is missing a value by the native rule: its first option has an empty value and is the one chosen.
- **Gallery:** `formNames` has six entries. A field marked `data-touched` is sent a `focusout` after it is built, so its message shows in the screenshots, the axe run, and the reflow run: a required empty field of each kind, an out-of-range number, and an invalid email. The group has 148 baselines and 32 for the hover and keyboard-focus screenshots (eight in each of the four projects), against 16 before. The folder is 100 MB with the rest. The manifest, axe, and reflow suites cover all six; the ARIA snapshots give the role and name of each (`textbox`, `searchbox`, `spinbutton`, `combobox`), and `toHaveAccessibleDescription` the hint and the message, since the snapshot does not print descriptions.
- **`forms.test.ts`** now lists the text, number, and select fields as well as the three controls: each descriptor has a way to change it as a user does (typing into the native input, picking in the native select), the default of the other kind it resets to, and what a click on its label does. It has 89 tests, and 3 skipped.
- **Consumer typing:** the fixture `app.ts` builds a text field (a `@ts-expect-error` on an unknown `type`), a number field (one on a numeric `value`), and a select (one on `selectedIndex`), and puts them in the form. The probe types, steps with a stepper, and picks, and reads `callsign`, `thrust`, and `squadron` from the form. The expected tags of the page are `punk-number-field`, `punk-select`, and `punk-text-field` more.
- **Workbench:** stories for each (Playground, States, and the theme and density matrix), their place in the sidebar, a section on the fields with a key table in the accessibility guide, and a form example and the three translation keys in the integration guide. The length controls of the text field are text controls: Storybook's empty number control passes `NaN` to an attribute and the smoke test caught the console warning. The smoke test renders 126 entries (was 114).
- **Sizes** (gzip): text field 5.21 kB with a limit of 5.5 kB, number field 6.04 kB with a limit of 6.5 kB, select 5.69 kB with a limit of 6 kB. The form base and the field styles are about 4.4 kB of each, so the entries are over 5 kB because the base is counted in each; the number field's steppers and repeat logic, and the select's observer and option copying, are the rest, and there was nothing left to split out.
- **Tests:** text field 17, number field 25, select 21, the shared field suite 60 (20 for each of the three), registration 2 each, and `forms.test.ts` 89 (browser). The full run in Chromium, Firefox, and WebKit on Linux is 243 files, 5013 tests passed, 36 skipped; `test:visual` 1004 passed (982 before), and its self-test passes. Firefox reports an empty `autocomplete` property for a token it does not fill, so that test reads the attribute.
- **Mutation checks:** 63 mutations were tried, and 62 were caught, after tests were added or strengthened for six: the delay before a stepper repeats, a stepper stopping on leave, cancel, and blur, a select option changed in place or inside a group, the observer being the same one after a reconnect, a disabled group, and what a select falls back to when its chosen option is removed. A redundant `change` handler on the select that the `input` one made unneeded was removed. The one left, `disconnectedCallback` stopping the repeat, is equivalent in Chromium, where removing the focused input fires the `blur` that stops it too; a field that is not focused cannot be repeating, since a press focuses it.
- **Left for later packages:** the text field in the framework fixtures of §10.9, and the listener gates of §10.7 for these three.

## 12. Acceptance Criteria

### 12.1 Shared Internals

1. The tooltip behaves as before on the Escape stack and `anchor` module: all of its Phase 1 tests pass unchanged.
2. `punk-button` and `punk-icon-button` implement `setExternalAria` and the roving protocol.
3. With the stack empty there is no `keydown` listener on `document`; with one entry there is exactly one.
4. The contrast gate passes, and fails when a theme's `text-muted` is changed to a color below 4.5:1 on `panel-inset`; this was already so before the phase, and a test now says so.

### 12.2 Stack and Cluster

1. Each gap value maps to its spacing token, follows density, and `--punk-stack-gap` or `--punk-cluster-gap` overrides it.
2. A cluster wraps; a stack never forces horizontal scrolling, with a long word, down to 187px.
3. The alignment and justification values do what they say in `ltr` and `rtl`, and unknown values are ignored.
4. Neither has a role, a part, or a visual treatment of its own.

### 12.3 Accordion

1. A trigger is a native button inside a heading of the given `level`, with `aria-expanded`, and the panel is a `region` labeled by it, in the accessibility tree.
2. In single mode expanding an item collapses the others; in `multiple` mode it does not; several expanded at connection collapse to the first with one warning.
3. `Up`, `Down`, `Home`, and `End` move between enabled triggers without wrapping.
4. `punk-toggle` is sent once per user change and not when the application sets `expanded`.
5. Expanded and collapsed differ by the plus and minus shapes with all colors forced to one value, and under forced colors.
6. A disabled item cannot be toggled or focused.

### 12.4 Tabs

1. The roles, `aria-selected`, `aria-controls`, `aria-labelledby`, and `hidden` match §8.3, in the accessibility tree, with the panel inside `punk-tabs` and beside it.
2. Every key in the table works in `ltr` and `rtl`, in horizontal and vertical orientation, with automatic and manual activation, skipping disabled tabs without wrapping.
3. One tab is the tab stop; Tab from it goes to the panel when the panel has tabbable content or a `tabindex`, else past the tabs; a panel without tabbable content gets `tabindex="0"`.
4. A tab with no panel, and two tabs with one panel, each warn once.
5. Adding, removing, and disabling tabs keeps one selected tab and one tab stop; what was written to the panels is restored when the tabs leave.
6. The tab list wraps and never scrolls sideways at 187px; the selected tab differs from the rest with all colors forced to one value.

### 12.5 Toolbar

1. It is `role="toolbar"` with the application's label; a missing label warns.
2. One item is the tab stop; the arrow keys, `Home`, and `End` move among the items without wrapping, swap in `rtl`, skip separators and disabled items, and read no layout.
3. A select, text field, number field, and slider are their own tab stops, outside the group.
4. When items do not fit, the trailing ones get `data-punk-overflow` and are hidden, the `overflow` slot shows, and `punk-overflow-change` lists them; when they fit again it hides the slot. It creates one `ResizeObserver`, or none with `wrap`.
5. Focus on an item that overflows moves to the overflow trigger.
6. With no `overflow` slot content nothing is hidden, the toolbar scrolls inside itself, and it warns once.

### 12.6 Window

1. It is a `dialog` named by its `heading`; `open` shows and hides it, `modal` makes the page inert, and a closed window renders nothing.
2. A modal window traps focus, starts focus on content (never the close or move button), restores it on close, and holds the scroll lock, as §10.6 checks.
3. `dismissible` adds the close button and Escape closes it; without it neither does, and a modal's Escape does nothing and does not reach a window beneath.
4. Dragging by the titlebar moves it, stays inside the viewport (and pins the start edge of an axis it is larger than), and never starts on a titlebar control.
5. Move mode works with the keyboard and with a single click, `Escape` cancels it, and the move button's state is in `aria-pressed` (WCAG 2.5.7).
6. `punk-open`, `punk-close` with a reason, `punk-move-start`, and `punk-move-end` with the offset are each sent once.
7. At container widths of 480px and below the footer stacks its actions; at 200% zoom and 375px a modal fits the viewport and the body scrolls with a focusable scroll region.
8. A window with no name warns once.

### 12.7 Dialog

1. It is a modal `dialog` (or `alertdialog` with `alert`) named by `heading`, traps focus, and restores it to the opener.
2. Escape closes it unless `persistent`, and a `persistent` dialog also keeps Escape from reaching anything beneath; a backdrop click closes nothing.
3. A `data-punk-close` element closes it with the reason `action` and sets `returnValue`; `close(value)` does too.
4. `punk-open` and `punk-close` are each sent once.
5. A dialog with no focusable content, and not `persistent`, warns once.

### 12.8 Popover

1. The trigger gets `aria-expanded`, and `aria-haspopup="menu"` in menu mode, including a `punk-button` and `punk-icon-button` trigger, where the inner button gets them.
2. It opens and closes from the trigger, light-dismisses on Escape and an outside press, and returns focus to the trigger when the focus was inside.
3. In content mode a pointer open leaves focus alone and a keyboard open moves it in; in menu mode focus always moves to the first item, and `Up`, `Down`, `Home`, and `End` move among the items.
4. Tab at the last tabbable element, and Shift+Tab at the first, close it and continue from the trigger.
5. It stays inside the viewport with the tooltip's flip and shift rules, in `ltr` and `rtl`.
6. With every popover closed there are no listeners or observers (§10.7); with the Popover API disabled it still works.
7. A missing trigger, and a menu with no items, each warn once.

### 12.9 Toast

1. The stack has an `alert` region and a `status` region before any toast exists, and a `warning` or `danger` toast is placed in the first and an `info` or `success` toast in the second.
2. A toast's timer pauses on hover, on focus inside, and while the document is hidden, and resumes with the time left; the default durations are as in §8.8, and a toast with an action has none.
3. The dismiss button works with the keyboard and a pointer, and `punk-dismiss` carries the reason.
4. Past `limit` the oldest toast is dismissed with the reason `limit`.
5. Each variant differs by shape with all colors forced to one value and under forced colors, and the text meets 4.5:1 on its lens.
6. The stack stays in the top layer when empty and does not block clicks beneath it.
7. Ten toasts hold at most ten timers, and none while paused.

### 12.10 Checkbox and Switch

1. The role, `aria-checked` (with `mixed`), `aria-required`, and the name from the default slot match §8.9, in the accessibility tree.
2. `Space` toggles on key up without scrolling, a switch also toggles on `Enter`, a click toggles, and a disabled control does nothing and is not focusable.
3. `input` and `change` are sent once per user toggle and not when the application sets `checked`.
4. The form rules of §10.5 hold: the value is submitted only when checked, enabled, and named; reset restores the authored `checked`; `required` and unchecked is `valueMissing`.
5. The box and the track have a boundary that meets 3:1 on each surface in every theme, read from the render.
6. Checked, indeterminate, and unchecked, and on and off, differ by shape with all colors forced to one value, and under forced colors.

### 12.11 Slider

1. The role, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` match §8.10, and the name is the label.
2. Arrow, `Home`, and `End` keys give the value a native range gives, in `ltr` and `rtl`, in every engine; `PageUp` and `PageDown` follow §8.10.
3. Values clamp and snap to `step` without floating-point drift (`0.1` steps over `0` to `1`).
4. A pointer press on the track sets the value, a drag follows it, and `input` and `change` follow §8.10; a drag reads the track rectangle once.
5. A click on the track and the keyboard are enough to operate it (WCAG 2.5.7).
6. `ticks`, `show-value`, and the formatted value follow the page's language.
7. The form rules of §10.5 hold, and a bad range is repaired with one warning.

### 12.12 Text Field

1. The inner control is named by the label, `aria-label`, or the `labels` fallback, in that order, and a missing name warns.
2. Every native constraint (`required`, `minlength`, `maxlength`, `pattern`, and the type's own, such as `email`) shows in `validity` and `validationMessage`, and the message appears only once the field has been touched.
3. A shown message has the triangle, the `danger` frame, `aria-invalid`, and the message in the control's description; it is `text` colored and meets 4.5:1 on its surface.
4. `input` is composed, `change` is re-dispatched on the host, and `focus()` and `select()` reach the inner control.
5. The prefix, suffix, and hint slots render and are described correctly; the placeholder meets 4.5:1; the boundary meets 3:1.
6. The form rules of §10.5 hold; paste is never blocked.

### 12.13 Number Field

1. It is a spinbutton named as in §12.12, with `min`, `max`, and `step` honored by the native control.
2. The steppers step by `step`, respect the bounds, repeat on press and hold, stop on release, and are not in the tab order or the accessibility tree.
3. `badInput`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, and `valueMissing` show in `validity` as native reports them.
4. `valueAsNumber` matches the native value, and a bad `min`, `max`, or `step` is repaired with one warning.
5. `hide-steppers` removes them; the form rules of §10.5 hold.

### 12.14 Select

1. It is a combobox or listbox button as the engine exposes a native select, named by the label or `aria-label`.
2. The options and groups from the light DOM appear, and adding, removing, disabling, relabeling, and selecting an option later keeps the control in step.
3. `value`, `selectedIndex`, and the user's choice agree, `input` and `change` are sent once per change, and the choice is written back to the light DOM option.
4. The form rules of §10.5 hold, including `required` with an empty-valued choice.
5. The arrow and boundary meet their contrast rules, and the observer is disconnected with the element.

### 12.15 Cross-Cutting

1. The manifest assertions (Phase 1 §10.1) pass for every new component: parts, slots, attributes, CSS properties, events, and descriptions.
2. The reflow test passes for every in-flow component in every theme, density, and content variant at 187 to 512px, and each overlay fits the viewport at 375px and at 200% zoom.
3. Axe finds no serious or critical violation in any group.
4. The visual matrix passes in all three engines against CI baselines.
5. Every component supports the default and `industrial-light` themes, both densities, and their combination, with no loss of function.
6. Every `register.js` registers only its own family, and the sizes are within §10.8.

### 12.16 Workbench and Integration

1. Every new component has a docs page with a state matrix, keyboard instructions, and an API table from the manifest, and the three new guides exist.
2. The Application shell example renders the SPEC §8 assembler and works with the keyboard.
3. The story smoke test loads every entry with no error or console warning.
4. The React, Vue, and Svelte fixtures build and pass in CI, and each guide shows that fixture's code.

## 13. Definition of Done

Phase 3 is complete when:

1. All acceptance criteria in §12 pass.
2. All gates in Phase 1 §10, Phase 2 §10, and §10 above pass in CI, with Chromium, Firefox, and WebKit green.
3. Each new component can be imported on its own from plain HTML and from the TypeScript fixture, with the event types resolving under TypeScript 5.0 and 6.0, and no `register.js` brings a tag from another family.
4. The SPEC §19 scenario is built and checked by `shell.ts` in the consumer check.
5. The owner has confirmed decisions 2, 8, and 12 of §2, and `SPEC.md` is updated for them: §7.1 (`open`, the move button, window events), §7.3 (tabs and toolbar behavior), §7.5 (toast regions and timing), §8 (the markup's `open`), and §17 (the phase text, with accordion, stack, and cluster named).
6. Every script runs as `node <file>.ts` on Node 26, and `npm ls typescript` reports exactly one version, 6.0.x.
7. No asset or code in the package or the workbench is derived from Factorio files.
8. The SPEC §18 items that Phase 3 can finish are checked and recorded: item 1 for sections 7.1 to 7.3 and 7.5 and the form controls of 7.2, item 4 for every pattern in this phase, item 6 (consumption from plain HTML and TypeScript), and item 7 (tree-shaken imports).

## 14. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Password managers and autofill do not reliably fill an input inside a shadow root | Named as a limit in the Forms guide and in each field's JSDoc, with `autocomplete` passed through. An application that needs autofill uses a native input in the light DOM. Not fixable inside the component |
| A form-associated element inside a shadow tree is not found by some tools that walk `form.elements` | Covered by the tests in §10.5, which use `FormData` and `form.elements`; `ElementInternals` is the supported route in all three engines |
| Live regions that hold slotted content may be announced differently by screen readers | The structure is tested in the accessibility tree in all three engines (§10.6); manual screen reader testing is recorded in the workbench, and the polite-or-assertive choice per variant can change without an API change |
| Toasts are inert while a modal is open (decision 16) | Documented, with the stack-inside-the-dialog pattern in the Focus and overlays guide; the toast timers are not paused, which the guide also says |
| The move mode (decision 8) is more code than a drag, and an overlay with several modes is where focus bugs hide | It is a separate, tested piece: `window-position.ts` is pure, and §10.6 covers each path. If it cannot be made to work in every engine, the owner decides between dropping `movable` and shipping it with only the keyboard path |
| Native `<dialog>` focus and `inert` behavior differs between engines and versions | The tests in §10.6 run on the Linux image on all three engines, and the library does only what the platform leaves out (§7.2) |
| A select's open list cannot be themed | Said in the docs (decision 18). The closed control is themed, and a custom combobox is deferred by SPEC §7.2 |
| `<input type="number">` parses and displays differently between engines and locales | Said in the docs. Validity and stepping are the platform's, and a text field with `inputmode` is the alternative |
| The shell group adds many baselines, since overlays are captured per combination | Overlays run in two content variants, groups have their own folders, and the size is checked after the first run (§10.4) |
| Fifteen new entries could grow the shared runtime | Shared code is measured on its own (§10.8), and the base is split before a limit is raised |
| Framework fixtures add dependencies that change often | The fixtures use each framework's stable API, are held back from automatic updates, and are updated by hand with the guides |
| Moving the tooltip onto the Escape stack and the anchor module could change it | Its Phase 1 tests must pass unchanged (§12.1), and that is checked before any new overlay is built on the modules |
| Eighteen tags in one phase is a lot to review | The work packages (§11) land in order, each with its own gates, and the parent spec's definition of done is checked at the end, not assumed |
