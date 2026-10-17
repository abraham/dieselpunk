# Forms

**Scope:** how controls take part in native forms: association, values and defaults, validation and messages, names and labels, and events; and the six form controls.
**Code:** `src/internal/form-control.ts`, `toggle-base.ts`, `field-base.ts`, `fieldset.ts`, `slider-math.ts`; `src/styles/field.ts`; `src/components/checkbox/`, `switch/`, `slider/`, `text-field/`, `number-field/`, `select/`.

## 1. Form association

Every form control extends `PunkFormControl`, a form-associated custom element (`static formAssociated = true`) holding an `ElementInternals`. It behaves as the matching native control does:

- `name`, `disabled`, and `required` properties; the read-only `form`, `labels`, `validity`, `validationMessage`, `willValidate`, and `isDisabled` (its own `disabled`, or a disabled `<fieldset>` around it outside that fieldset's first `<legend>`); and `checkValidity()`, `reportValidity()`, and `setCustomValidity(message)`.
- A control with no `name`, or that is disabled, contributes nothing to `FormData`. A `form="id"` attribute associates a control outside the form.
- `formDisabledCallback` reflects a disabled ancestor fieldset without touching the control's own `disabled`.
- `formStateRestoreCallback` restores a value the browser kept across navigation.
- **`commit()`** hands the browser the current value (`setFormValue`) and validity (`setValidity`, anchored on the element inside the shadow tree that `reportValidity()` should focus). A subclass calls it as soon as its value changes, so a `FormData` read in the same task is current; the base also calls it after every update.

Subclasses implement `formValue()`, `validate()`, `resetToDefault()`, and `restoreState()`.

**Why** form-associated custom elements and not a hidden native input: they are the platform's supported route, `form.elements` and `FormData` see them, and fieldset and reset semantics come for free.

## 2. Values and defaults

As in native controls, **the attribute is the default and the property is the live value.**

- `checked` (checkbox, switch) and `value` (slider, text field, number field, select) do not reflect. The attribute holds what the author wrote, and `form.reset()` restores it.
- A select's default is its options' `selected` attributes, not the host's `value` attribute, which only sets the first choice.
- A control styles itself from state classes in its shadow tree, not from `:host([checked])`, since the attribute is not the state.

## 3. Validation and messages

- Constraint validation always runs. A **`touched`** flag, set on blur, on an `invalid` event, and by `reportValidity()`, decides whether the message shows, so a message never appears before the user has had a chance to type.
- Fields read validity from their native inner control, so every native constraint applies with native messages: `valueMissing`, `tooShort`, `tooLong`, `patternMismatch`, `typeMismatch`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, and `badInput`. The checkbox and switch report `valueMissing` with the message the engine gives its own checkbox.
- A shown message has the triangle shape, the localized word "invalid" before the browser's message, and a `danger` frame on `panel-inset`. Its text is `text`, never `danger` ([visual-system.md §4](visual-system.md)). The inner control gets `aria-invalid="true"` and the message joins its description. The message is `dir="auto"`, since it is in the browser's language, which may differ from the page's direction.
- `setCustomValidity(message)` shows the application's message as given.

## 4. Names and labels

- A field's name is `label` (rendered text, tied to the inner control with `for` in the shadow tree), else the host's `aria-label` copied to the inner control, else the text of an external `<label for>` read on connect and on `focusin`. The last is not live, and the docs recommend `label`.
- A checkbox or switch is named by its default slot's text. A click on that text toggles it.
- A slider copies `label` to its host's `aria-label`.
- An external `<label for>` populates `labels` and focuses the control when clicked.
- A hint (the `hint` slot) is the inner control's description, with the message when it shows.
- A control with no name warns.

## 5. Events

- Native `input` (composed) while the value changes and `change` when a user edit is committed, both real `Event`s. A field re-dispatches the inner control's `change` on its host, since it does not cross the shadow boundary.
- No event for a change made by script or by reset.

## 6. Checkbox and switch

`PunkToggleBase` is the shared base: `checked`, `value` (default `'on'`), click and key handling, the host role and states, and the form methods.

- The host is `role="checkbox"` or `role="switch"`, with `aria-checked` (`mixed` while a checkbox is `indeterminate`), `aria-required`, `aria-disabled`, and `tabindex="0"` (removed while disabled, a disabled fieldset included), all written before the first render.
- **Toggling:** Space on key up and, for a switch, Enter call the host's `click()`; the click handler toggles and sends `input` and `change`. A click on a link or field inside the label is left alone. A click on a disabled control is stopped before the application hears it.
- A click on an indeterminate checkbox clears `indeterminate` and toggles `checked`. `indeterminate` is never submitted.
- **Form:** submits `value` under `name` when checked and enabled. `required` and unchecked is `valueMissing`.
- Both implement the roving item protocol, so they join a toolbar's group ([keyboard-and-selection.md §8](keyboard-and-selection.md)).
- **Look:** the box and the track have a `control-edge` boundary. A checked or mixed box is filled with `accent` with the mark in `accent-text`: a check, a dash, or nothing. A switch is a thumb at the end with a bar on an `accent` track when on, and a thumb at the start with a ring when off, with a short slide that reduced motion removes.

## 7. Slider

A custom control with `role="slider"` on the host, `aria-orientation="horizontal"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` (the number formatted for the nearest `lang`, unless the author set one), and `tabindex="0"`.

**Why not a native range:** pointer capture is required, and a native range cannot be styled alike in the three engines.

- **Values** clamp to the range and snap to `step` from `min`, using the decimals of `step` so `0.1` steps never drift. `value` is stored raw and read back clamped and snapped to the current range; unset, it is `min`. An inverted or non-finite range is repaired to 0 to 100 and warns.
- **Keys** (in `rtl` the end of the range is on the left): `Right` and `Up` increase by `step`, `Left` and `Down` decrease, `PageUp` and `PageDown` change by the larger of `step` and 10% of the range snapped to `step`, and `Home` and `End` go to `min` and `max`. Arrows, Home, and End match a native `<input type="range">` in the same direction.
- **Pointer:** a press on the track or thumb captures the pointer, reads the track rectangle once, sets the value, and starts a drag; every move is arithmetic on that rectangle. The press keeps the page from selecting text and focuses the slider. `touch-action: pan-y` keeps vertical page scrolling. A press with another button, or on a disabled slider, does nothing. A click on the track alone operates it, so no drag is required (SC 2.5.7).
- `input` while the value changes; `change` when a gesture or key press ends with a changed value.
- `ticks` draws a mark at every step when there are 20 steps or fewer, and every `ceil(steps / 20)` steps otherwise. `show-value` shows the formatted value.
- **Look:** an inset trough with a `control-edge` boundary, an `accent` fill, and a raised thumb with its own boundary, so the position reads from the thumb.

## 8. Field base

`PunkFieldBase` is the base of the text field, number field, and select:

- a native control in the shadow tree with `delegatesFocus`;
- the label, hint, and message markup (the message element is always rendered, `hidden` when there is none, so its part exists);
- the ARIA written on the inner control: its name when there is no label, `aria-describedby`, and `aria-invalid`;
- validity read from the native control, with the control as the anchor;
- the re-dispatched `change`.

**Look** (`styles/field.ts`): an inset field with a `control-edge` boundary, a hover edge that gains contrast, prefix and suffix inside the frame, placeholder in `text-muted` (which meets 4.5:1 on `panel-inset`), and states for focus, invalid, disabled, and read-only. Prefix and suffix are `flex: none` with at most half the width and wrap inside it; the control keeps at least `3ch`.

## 9. Text field

A native `<input>` of type `text`, `email`, `password`, `search`, `tel`, or `url`, with `placeholder`, `readonly`, `minlength`, `maxlength`, `pattern`, `autocomplete`, and `inputmode` passed through, and `prefix`, `suffix`, and `hint` slots.

- The value binding writes only when it differs from what the input holds (`live()`), so typing is never overwritten and the native "user edit" state that `minlength` and `maxlength` depend on survives.
- `focus()` and `select()` reach the inner input.
- Paste is never blocked, and `autocomplete` is passed through (SC 3.3.8).

## 10. Number field

A native `<input type="number">` with `min`, `max`, `step`, `readonly`, `placeholder`, and the read-only `valueAsNumber` (`NaN` until it has rendered).

- Keys are the native ones.
- **Steppers** are native buttons in the shadow tree, `tabindex="-1"` and `aria-hidden`, since the arrow keys and typing serve everyone else. They call `stepUp()` and `stepDown()`, so rounding and bounds are the platform's. A press focuses the input, steps at once, and repeats after 400ms every 80ms until release, leave, cancel, blur, or disconnect; `input` is sent on each step and `change` when the press ends. Each is half the field's height, 28px wide, and 40px under a coarse pointer. `hide-steppers` removes them. The native spinner is hidden.
- A `min` above `max`, or a `step` not above 0, is repaired and warns.
- Parsing and display follow the engine and the user's locale settings, which differ between engines; the component does not format the number, and the docs say so.

## 11. Select

A native `<select>` filled with copies of the host's light-DOM `<option>` and `<optgroup>` children. Single selection only.

- The children are not slotted, so they do not render; the host reads them. One `MutationObserver` on the host (child list, text, and the `value`, `disabled`, `selected`, and `label` attributes of the subtree), created on first connect, reused on reconnect, and disconnected with the element, keeps the copy current.
- The user's choice is written back to the light-DOM option's `selected` property, so the host's options stay the source of truth, and `value` and `selectedIndex` read them. A `value` assigned before a matching option exists is kept until one arrives.
- `required` with an empty-valued first option chosen is `valueMissing`, which is how a placeholder option works natively.
- The closed control is themed; the arrow is CSS over `appearance: none`. The open list is the platform's.
- **Warning:** no options.

## Verification

- Node: `slider-math.test.ts`.
- `test/browser/forms.test.ts`, for every control in all three engines: `FormData` under the name when enabled and named and nothing otherwise, the `form` attribute, a disabled fieldset, reset to the authored default in both directions, state restore, `labels` and label clicks, the name fallback, `required` and each native constraint, `setCustomValidity`, `reportValidity()` focusing the control, and a blocked `requestSubmit`. **Slider parity:** every arrow, Home, and End against a native range with the same range, step, and direction.
- `toggle-base.test.ts`, `field-base.test.ts`, `form-control.test.ts`, and each control's tests: roles and states, keys, events once per user change, steppers and their repeat, the select's observer, messages and their timing, `aria-invalid` and descriptions, contrast of boundaries and placeholders read from the render.
- `check:frameworks`: each fixture binds a text field, switch, and slider and submits the form ([workbench.md §4](workbench.md)).

## Gaps

None in the design. Platform limits, documented in the Forms guide and not closable inside the library:

- autofill and password managers in shadow roots, the unthemed select list, number parsing by engine and locale, `SubmitEvent.submitter` for `punk-button`, and native validation messages in the browser's language;
- WebKit's native range does not swap Left and Right in right-to-left text, though it draws the range reversed. The slider swaps them, as Chromium and Firefox do, so the parity test omits those two keys in WebKit and says why.
