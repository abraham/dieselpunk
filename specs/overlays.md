# Overlays and Modality

**Scope:** everything that floats above the page or takes it over: the top layer and its fallback, the Escape stack, modal behavior, anchoring and positioning; and the tooltip, popover, window, dialog, and toast.
**Code:** `src/internal/overlay-stack.ts`, `overlays.ts`, `modal.ts`, `modal-surface.ts`, `anchor.ts`, `window-position.ts`, `toast-timer.ts`; `src/utilities/position.ts`; `src/styles/modal-surface.ts`, `close-button.ts`; `src/components/tooltip/`, `popover/`, `window/`, `dialog/`, `toast/`.

## 1. Top layer and fallback

- Windows and dialogs render a `<dialog>` in their shadow tree: `showModal()` for modal, `show()` for non-modal. Tooltips, popovers, and the toast stack use `popover="manual"` and `showPopover()`.
- Where `showModal` or `showPopover` is missing, the surface is `position: fixed` with `--punk-z-overlay` (tooltip, popover), `--punk-z-modal` (window, dialog), or `--punk-z-toast` (toast stack), and the library supplies the behavior the platform would have (light dismissal, Escape, focus return).
- Tests cover the fallback by deleting the API from the prototype.

**Why `manual` and not `auto` popovers:** `auto` closes other popovers and handles Escape itself, which ignores the library's Escape order and hides why a popover closed.

## 2. The Escape stack

One module-level stack of open overlays per page (`createOverlayStack(target)`, bound to `document` in `overlays.ts`).

- Entries are `{ dismissible, close() }`. An overlay pushes its entry when it opens and removes it when it closes or disconnects.
- While the stack is not empty it holds exactly one capturing `keydown` listener on `document`; with an empty stack there is none.
- On Escape the listener calls `stopPropagation()` and `preventDefault()` (so a native `<dialog>` beneath does not also close) and closes the topmost entry if it is dismissible.
- A **non-dismissible** entry (a `persistent` dialog, a window without `dismissible`) absorbs Escape, so it never falls through to an overlay beneath.
- A window in move mode pushes a second entry for as long as the mode lasts, so the first Escape cancels the move and the second closes the window.
- Toasts are not on the stack. A tooltip is, so a tooltip over a popover over a window closes in that order.

## 3. Modality

`ModalController` serves a component with a `<dialog>` in its shadow tree.

- **Open:** `showModal()` or `show()`, or the fallback. A modal makes the rest of the document inert and is in the top layer.
- **Scroll lock:** a reference-counted `overflow: hidden` on `<html>` while any modal is open. The author's inline value is restored when the last one closes, whatever the order.
- **Initial focus:** an element marked `autofocus` in the content; else the first tabbable element of the body and footer; else the dialog itself with `tabindex="-1"`. Never a titlebar button.
- **Focus return:** to the element focused when it opened, if still connected; if the opener is gone, focus inside the host is blurred rather than left on hidden content. The platform already does this for a native `<dialog>`; the controller's own return serves the fallback.
- **Escape:** the native `cancel` event becomes `punk-close` with reason `escape`, or is prevented for a non-dismissible surface.
- **Backdrop clicks close nothing.** Windows and dialogs are task surfaces, and an accidental click must not discard work.
- **Dispose** on disconnect releases the lock and the stack entry, with no events and no focus move.

## 4. Anchoring and positioning

- **Anchor resolution** (`resolveAnchor`): the element whose id is the overlay's `for`, in the overlay's root node; otherwise the overlay's previous element sibling. An overlay is a sibling of its anchor, never a child, so its text never joins the anchor's name.
- **ARIA wiring** (`describeAnchor`, `wireAnchorState`): the overlay adds a description, `aria-expanded`, or `aria-haspopup` through `setExternalAria` when the anchor implements it, and on the anchor itself otherwise; it removes only what it added, on close, disconnect, or a change of anchor ([accessibility.md §4](accessibility.md)). An anchor that is a custom element not yet defined is waited for.
- **Positioning** (`computePosition`, pure): the preferred side, flipped to the opposite side if it does not fit, then shifted along the cross axis to stay 8px inside the viewport. `start` and `end` are logical. When neither side of a horizontal placement fits, it moves above or below as a flip would and clamps on both axes. A surface wider than the viewport pins to the margin.
- **Listeners only while open:** a capturing, passive, frame-throttled `scroll` listener, a `resize` listener, and a `ResizeObserver` on the anchor exist only while the overlay is open.

## 5. Tooltip

- Shows supplemental text for its anchor. It never contains interactive content; focusable content in it warns.
- **Opening:** pointer hover opens after `delay` (default 400ms); keyboard focus that matches `:focus-visible` (read from the composed path, since the anchor may be a shadow host) opens at once; touch never opens it. `show()` opens at once.
- **Warm-up:** at most one tooltip is open; opening one closes the other. If one closed less than 300ms ago, the next opens without delay. `resetTooltipWarmup()` exists for tests.
- **Closing:** when the pointer has left both anchor and tooltip and the anchor has lost focus, after a 100ms grace period that entering the tooltip cancels. Escape closes it and leaves focus where it is.
- **Description:** unless `describe="false"`, the tooltip's host gets `role="tooltip"` and an id, and describes its anchor ([§4](#4-anchoring-and-positioning)). For a button-family anchor the description text is passed through `setExternalAria` and kept current by one `MutationObserver` on the tooltip's own content for as long as it is connected, because the description must exist before the tooltip ever opens.
- The host is `display: contents`; the surface has no role. Width is `min(--punk-tooltip-max-width, 100vw - 16px)`.
- **Warnings:** no anchor; focusable content.

## 6. Modal surfaces

`PunkModalSurface` is the shared base of window and dialog.

- `open` is the source of truth. Setting it by property or attribute, calling `show()` or `close()`, Escape, and the close button all go through it, and `punk-open` and `punk-close` are each sent once per change, with `reason` saying who closed it (`escape`, `close-button`, `method`, or `action`; the popover adds `outside` and `tab`).
- A closed surface is `display: none` and absent from the accessibility tree. Setting `open` before the element is defined opens it when it is.
- The `<dialog>` is labeled by `heading`, or by the host's `aria-label`. A surface with neither warns.
- The body becomes a focusable scroll region (`tabindex="0"`) when its content is taller than the surface allows, checked on open and on resize while open.
- A modal surface is at most the viewport height less twice `--punk-space-4`, so it fits at 200% zoom.
- The footer stacks its actions, full width and in order, by a container query at 480px and below.
- Opening a second modal while one is open is allowed; the top layer stacks them.

## 7. Window

A titled application window: `heading`, `open`, `modal`, `movable`, `dismissible`, with the `icon`, default, and `footer` slots.

- `max-inline-size: min(100%, var(--punk-window-max-width))`. A non-modal window stays in the flow of its container.
- **`dismissible`** adds a native close button (localized "Close") and makes the stack entry dismissible. Without it, Escape does nothing and does not reach a window beneath.
- **Titlebar** wraps: the title has a basis of `9ch`, and where the buttons cannot share its row they go below it at the end, so a title never breaks inside a word to make room for them.
- **Dragging** (`movable`) starts on the titlebar with pointer capture and `touch-action: none`, never from a `button`, `a`, `input`, `select`, `textarea`, `[tabindex]`, `[contenteditable]`, or `[data-punk-no-drag]` descendant. The window moves by `translate`, clamped each step so its rectangle stays in the viewport; on an axis where it is larger than the viewport, its start edge is pinned so the titlebar stays reachable. Rectangles are read once when the drag starts.
- **Move mode** (SC 2.5.7): the `move-button` part (localized "Move window", `aria-pressed`) starts it and announces the instructions through a visually hidden status. Arrow keys move 8px (32px with Shift); a click anywhere moves the titlebar's center to the pointer, is not passed to what was under it, and ends the mode; Enter or the move button ends it; Escape returns the window to where it was.
- `punk-move-start` and `punk-move-end` carry `{ x, y }`, the translation from the layout position, for drags and for move mode; a cancelled move reports where it went back to. `resetPosition()` clears the translation.
- A `resize` listener exists only while the window has a nonzero offset, and re-clamps it.
- A focused movable window is raised above its siblings with `z-index`. Any other window management is the application's.

## 8. Dialog

A modal confirmation or task surface: `heading`, `open`, `persistent`, `alert`, with the default and `footer` slots. It is always modal, never movable, and has no titlebar close button.

- `alert` makes it `role="alertdialog"`, described by its body.
- Escape closes it unless `persistent`. A `persistent` dialog also absorbs Escape.
- A light-DOM element with `data-punk-close` closes it on click, with reason `action`, and sets `returnValue` to the attribute's value. `close(returnValue?)` does the same from script.
- **Warning:** no focusable content and not `persistent`, since a touch user could not dismiss it.

## 9. Popover

An interactive anchored surface: `for`, `placement` (default `bottom`), `mode` (`content` or `menu`), `open`.

- The trigger is resolved and wired as in §4: `aria-expanded`, and `aria-haspopup="menu"` in menu mode. A click, Enter, or Space on the trigger toggles it; ArrowDown opens a menu.
- **Light dismissal** while open: Escape (through the stack), a `pointerdown` outside, and focus moving outside. Reasons are `escape`, `outside`, `tab`, `action`, and `method`.
- **Content mode.** A pointer open leaves focus where it is. A keyboard open (a click with `detail === 0`, or a key) moves focus to an `autofocus` element, else the first tabbable element, else the surface (`tabindex="-1"`).
- **Menu mode.** The surface is `role="menu"` while open and has no `tabindex`. Opening always focuses the first enabled `menuitem`, `menuitemcheckbox`, or `menuitemradio` (which the application marks up). `Up`, `Down`, `Home`, and `End` move among them without wrapping. Activating an item does not close the menu unless the popover has `data-punk-close-on-activate`; otherwise the application calls `hide()`.
- **Tab** at the last tabbable element (or Shift+Tab at the first) closes the popover and puts focus on the trigger before the browser moves it, so the next Tab continues from the trigger. The close is rendered synchronously, because Firefox runs the key's default before a microtask.
- Closing from inside returns focus to the trigger.
- Inside a modal, the trigger must be in the same dialog, since the rest of the page is inert.
- **Warnings:** no trigger; a menu with no menu items.

## 10. Toast stack and toast

### 10.1 Stack

`punk-toast-stack`: `placement` (a corner, default `bottom-end`), `limit` (default 5), `label`.

- Shown in the top layer as soon as it connects, and kept there while empty, because a hidden live region is not in the accessibility tree. It is click-through (`pointer-events: none`) except for its toasts.
- Two live regions exist from the start, inside a `role="region"` named by `label` or the localized "Notifications": `role="status"` for `info` and `success`, `role="alert"` for `warning` and `danger`, both `aria-atomic="false"` ([accessibility.md §11](accessibility.md)). The stack moves each toast into the right region by writing its `slot`, and gives the author's back when it leaves.
- Each region is its own column, newest nearest the screen edge, with the alert region nearer the edge.
- Past `limit` the oldest toast is dismissed with reason `limit`; a toast already leaving does not count.
- `show({ message, heading, variant, duration, action })` creates, places, and appends a toast and returns it. `message` is text, never markup. `clear()` dismisses all.

### 10.2 Toast

`punk-toast`: `variant`, `duration`, `heading`, with the default (message) and `action` slots.

- The variant is a status shape in an inset lens; the text is in `text`. A native dismiss button (localized "Dismiss") is always present.
- **Duration:** unset means 5000ms for `info` and `success`, and none for `warning`, `danger`, or a toast with an action. `0` means none.
- **Countdown** (`createToastTimer`): one timer at most, held by reason (`hover` by mouse or pen, not touch; `focus` inside; `hidden` document), resumed with the time left only when every hold is released. A hold that exists when the countdown is rebuilt is kept. A toast created while the document is hidden starts held. A held or finished toast has no timer, and the `visibilitychange` listener exists only while a countdown does.
- **Dismissal:** `dismiss(reason)` (default `method`) sends `punk-dismiss`, which is cancelable so an application that owns the toast's lifetime can remove it itself. Unless cancelled the toast fades out, waits for its animations' `finished` (not a timer), and removes itself. Under reduced motion it goes at once.
- **Warning:** no text.

## Verification

- Node: `overlay-stack.test.ts`, `window-position.test.ts`, `toast-timer.test.ts`. `computePosition` has its own unit tests in `src/utilities/position.test.ts`.
- Browser: each component's tests, `modal.test.ts`, `anchor.test.ts`, and `test/browser/focus.test.ts` (inertness, initial focus, trapping, focus return including a moved or removed opener, the scroll-lock count, the Escape order across tooltip, popover, and window, absorbing entries, backdrop clicks, move mode, toasts inside and outside a modal).
- `perf-shell.test.ts`: no listener or observer with every overlay closed; one `keydown` listener for any number of open overlays, removed with the last; the popover's listeners and observer only while open; ten toasts hold ten timers, none while hovered.
- `overlays-a11y.test.ts`, the `overlays` visual group (each overlay open on its own page, including a window in move mode), and `aria.spec.ts`.

## Gaps

None in the design. The platform limits (toasts inert under a modal, a popover's trigger inside the same modal) are documented in the Focus and overlays guide.
