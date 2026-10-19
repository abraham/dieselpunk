# Forms

**Scope:** how controls take part in native forms: association, values and defaults, validation and messages, names and labels, and events; and the fourteen form controls and the fieldset.
**Code:** `src/internal/form-control.ts`, `toggle-base.ts`, `field-base.ts`, `date-time-field.ts`, `fieldset.ts`, `slider-math.ts`; `src/styles/field.ts`, `date-time-field.ts`; `src/components/checkbox/`, `switch/`, `slider/`, `text-field/`, `number-field/`, `select/`, `radio-group/`, `textarea/`, `combobox/`, `fieldset/`, `date-field/`, `time-field/`, `file-field/`, `range-slider/`.

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

- `checked` (checkbox, switch) and `value` (slider, text field, number field, select, date and time fields) do not reflect. The attribute holds what the author wrote, and `form.reset()` restores it.
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
- **No `list`.** An input in a shadow root cannot reach a light-DOM `<datalist>` by ID, and a mirrored one would be the engine's unstyled popup beside the package's own. Free text with suggestions is `punk-combobox` with `allow-custom` ([§14](#14-combobox)): the text is the value, the options filter as the user types, and choosing one makes its `value` the value.

## 10. Number field

A native `<input type="number">` with `min`, `max`, `step`, `readonly`, `placeholder`, and the read-only `valueAsNumber` (`NaN` until it has rendered).

- Keys are the native ones.
- **Steppers** are native buttons in the shadow tree, `tabindex="-1"` and `aria-hidden`, since the arrow keys and typing serve everyone else. They call `stepUp()` and `stepDown()`, so rounding and bounds are the platform's. A press focuses the input, steps at once, and repeats after 400ms every 80ms until release, leave, cancel, blur, or disconnect; `input` is sent on each step and `change` when the press ends. Each is half the field's height, 28px wide, and 40px under a coarse pointer. `hide-steppers` removes them. The native spinner is hidden.
- A `min` above `max`, or a `step` neither above 0 nor `any`, is repaired and warns.
- **`step="any"`** is passed to the input, so any number is valid (no `stepMismatch`). `stepUp()` throws for it, so the steppers move by 1 from the value (0 when empty), keep the value's decimals, and stop at `min` and `max`. The arrow keys are the engine's.
- Parsing and display follow the engine and the user's locale settings, which differ between engines; the component does not format the number, and the docs say so.

## 11. Select

A native `<select>` filled with copies of the host's light-DOM `<option>` and `<optgroup>` children. Single selection only.

- The children are not slotted, so they do not render; the host reads them. One `MutationObserver` on the host (child list, text, and the `value`, `disabled`, `selected`, and `label` attributes of the subtree), created on first connect, reused on reconnect, and disconnected with the element, keeps the copy current.
- The user's choice is written back to the light-DOM option's `selected` property, so the host's options stay the source of truth, and `value` and `selectedIndex` read them. A `value` assigned before a matching option exists is kept until one arrives.
- `required` with an empty-valued first option chosen is `valueMissing`, which is how a placeholder option works natively.
- The closed control is themed; the arrow is CSS over `appearance: none`. The open list is the platform's.
- **Warning:** no options.

## 12. Radio group

`punk-radio-group` is the form control; its `punk-radio` children are its choices. It extends `PunkFormControl`, and the radios are owned children ([component-model.md §8](component-model.md)).

- **Semantics.** The radios sit in a `role="radiogroup"` element in the shadow tree, named by `label` (rendered above it and referenced by id) or by the host's `aria-label` copied to it, and described by the hint and the message. Each radio host is `role="radio"` with `aria-checked` and `aria-disabled`, named by its text.
- **Value.** The chosen radio's `value`, or an empty string. A `value` assigned before a matching radio exists is kept until one arrives. The host's `value` attribute sets the first choice; the default a form reset restores is the radios marked `checked` (the last one, as a native group does). It submits the chosen value under `name`, and nothing when none is chosen.
- **Keyboard.** One tab stop: the chosen radio, else the first enabled one. The arrow keys move to the next or previous enabled radio and choose it, without wrapping (the library's rule, [keyboard-and-selection.md §1](keyboard-and-selection.md), not the APG's wrap); Left and Right swap in `rtl`. Space on key up and a click choose. A click on a `<label for>` focuses the tab stop, as does `focus()`.
- **Validation.** `required` with nothing chosen is `valueMissing`, with the message the engine gives its own radio, anchored on the tab stop. `reportValidity()` focuses it.
- **Disabled.** A disabled group (or a disabled fieldset around it) disables every radio for the user and removes the tab stop, without touching the radios' own `disabled`.
- **Events.** `input` and `change` from the group, once per choice the user makes.
- **Look.** A ring with the `control-edge` boundary and a dot while checked. `orientation="horizontal"` lays the radios in a wrapping row; the arrow keys work in both directions either way.
- **Warnings:** no name; two radios with the same `value`.

## 13. Textarea

`punk-textarea` is a field ([§8](#8-field-base)) with a native `<textarea>`: `value`, `placeholder`, `readonly`, `minlength`, `maxlength`, `rows` (below 1 is 1), and `autocomplete`, with the `hint` slot and no affixes.

- The value binding writes only when it differs from what the textarea holds, as the text field's does.
- The user can drag it taller. **`autogrow`** grows it with its text up to `--punk-textarea-max-height`, through `field-sizing: content`, where the engine supports it; elsewhere it keeps `rows` lines and scrolls. **Why** no script measurement: a keypress reads no layout ([performance.md §3](performance.md)).
- **`show-count`** shows the number of characters, out of `maxlength` when it is set, inside the box at its end. The count joins the textarea's description.
- **`monospace`** sets the text in `font-mono`, turns off spell checking, and breaks long words anywhere, so a long encoded string wraps. With `readonly` it is a selectable block of code or data.
- **Server text.** Lit cannot render a binding inside `<textarea>`, and Lit SSR does not write a textarea's `.value`, so the first `value` is baked, escaped, into the element's own copy of the template as the textarea's content (its `defaultValue`), after one newline for the parser to drop. A server-rendered field shows its text before scripts load, and the server, hydrating, and client trees agree. Later values go through the `.value` binding. Lit caches templates in `WeakMap`s keyed on the strings, so the copy is freed with the element; an empty first value shares one copy.

## 14. Combobox

`punk-combobox` is a field with a native `<input role="combobox" aria-autocomplete="list" aria-controls="listbox">` and a `role="listbox"` popup in its shadow tree, so `aria-activedescendant` refers inside one tree ([accessibility.md §4](accessibility.md)). The options are copies of the host's light-DOM `<option>` children, as in a select.

- **Filtering.** Typing opens the list of options whose label contains the text, case-insensitively. With `filter="none"` every option shows, and the application filters by replacing the options on `input`. The text is the user's: options that change before the combobox's own `input` handler runs do not put back the previous text. Options that arrive after a keystroke found none open the list, as long as the field keeps focus.
- **Groups and rich options.** `<optgroup label>` puts its options in a `role="group"` named by the label, under a heading hidden from assistive technology; a disabled group disables its options. An element with `slot="start"` or `slot="end"` inside an `<option>` (an icon, a `punk-badge`) is copied once into the row, before or after the text, and is left out of the label that filtering, matching, and the field use. The copy lives in the shadow tree, so page classes do not reach it: it is styled inline, by custom properties, or through a `part` it carries.
- **The list** is a `popover="manual"` surface below the field, as wide as it, positioned with `computePosition`. While it shows, and only then, it holds an Escape-stack entry, a frame-throttled `scroll` and a `resize` listener, and one `MutationObserver` on the host's options ([performance.md §3](performance.md)); the observer also runs while the user types with no option shown, until focus leaves. Escape closes the list and leaves the text, and does not reach an overlay beneath.
- **Keys.** Down opens the list on the chosen option (or the first) and moves down; Alt+Down opens it without moving; Up opens it on the last option and moves up; Alt+Up closes it. Moves skip disabled options and do not wrap. Enter chooses the active option, or with none settles the text. Home and End are the text field's.
- **Pointer.** A press on the list keeps focus in the field; a click chooses. The arrow button at the end opens and closes the list and is not a tab stop (`tabindex="-1"`, `aria-hidden`), since the keys serve everyone else.
- **Value.** The chosen option's `value`. Leaving the field (or Enter with nothing active) settles the text: an option whose label matches it exactly is chosen, empty text clears the value, and other text goes back to the chosen option's label. With **`allow-custom`** the text is the value, as it is typed. It submits `value` under `name`, and the `value` attribute is the default a form reset restores.
- **Events.** Native `input` while typing; `change` from the host once for each value the user commits.
- The active option is inset with an `accent` bar and the chosen one is bold with a check, so neither rests on color.
- **Warning:** no options.

## 15. Fieldset

`punk-fieldset` groups controls under a title. It is not a form control: it renders a native `<fieldset>` and `<legend>` in its shadow tree around a default slot, so in the flat tree it is a `group` named by its legend (`label`, then the `legend` slot).

- **Description.** The `hint` slot and the `error` slot (an error summary the application writes, shown with the warning triangle) describe the group while they have content.
- **Disabled.** A shadow fieldset does not disable light-DOM controls, so `disabled` does what a native fieldset would by writing: it sets `disabled` on every native control (`button`, `input`, `select`, `textarea`, `fieldset`) and form-associated custom element inside it, except inside the `legend` slot, remembers which it changed, and enables exactly those again when it is enabled, when they leave, or when it disconnects ([component-model.md §8](component-model.md)). Unlike a native fieldset, the controls' own `disabled` reads `true` meanwhile. Controls added deeper inside while it is disabled are found when its own children change.
- **Look.** An etched frame with the legend set into its top edge.
- **Warning:** no legend.

## 16. Date and time fields

`punk-date-field` and `punk-time-field` are fields ([§8](#8-field-base)) around a native `<input type="date">` and `<input type="time">`, on one base, `PunkDateTimeFieldBase` (`internal/date-time-field.ts`): `value`, `min`, `max`, `step`, `readonly`, and `autocomplete`, with the `prefix`, `suffix`, and `hint` slots.

- **The picker is the platform's.** How the value is shown and typed, the calendar or clock that opens, and a 12- or 24-hour display are the engine's, in the browser's language. **Why:** they are accessible in every engine, and a calendar grid of the library's own is a large accessibility surface ([components.md §5](components.md)).
- **Values** are the input's formats, whatever the display: `YYYY-MM-DD` for a date, `HH:MM` or `HH:MM:SS` for a time. Before each render a detached input of the same type parses an assigned value: one it cannot parse is cleared and warns once, and one it normalizes is taken as normalized, so the field never disagrees with its input. `step` is in days for a date and seconds for a time; below 60 a time takes seconds.
- **Form and validity** as the text field: `value` under `name`, the `value` attribute as the reset default, and `valueMissing`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, and `badInput` (a value the user left incomplete) from the input.
- **Look.** The field's frame. Chromium's picker button is an image in a fixed color, so it is redrawn as a mask filled with the text color (a calendar or a clock), and with `ButtonText` under forced colors. The other engines draw their own, which follows the theme's `color-scheme`.

## 17. File field

`punk-file-field` is a field ([§8](#8-field-base)) around a native `<input type="file">`: `accept`, `multiple`, `drop-zone`, and the read-only `files`, with the `hint` slot and no affixes.

- **Choosing.** The input's own button opens the platform's chooser, so the keyboard and every pointer can always choose. Its text and "No file chosen" are the browser's; the button is drawn raised through `::file-selector-button`.
- **The list.** The chosen files' names and sizes, as a list below the input inside the box. Sizes are in the largest unit that keeps them at 1 or more, formatted for the nearest `lang` (`file-kinds.ts`, pure).
- **Drop zone.** With `drop-zone` the box is taller and dashed, says the localized "or drop files here", and turns solid `accent` while files are dragged over it. A drop takes the files `accept` names (extensions, MIME types, or `type/*`), only the first unless `multiple`, into the input through a `DataTransfer`, and sends `input` and `change` as a choice does. A drop it takes nothing from is still stopped, so the browser does not open the file in place of the page. It is an enhancement, never the only way ([accessibility.md](accessibility.md)). A disabled field takes no drops.
- **Form.** Each chosen file is submitted under `name` (a `File`, or a `FormData` for several), and nothing when none is chosen or there is no name. **Why** nothing rather than the empty file a native input submits: a form-associated element has no way to submit an entry with an empty filename that servers read as "no file". A reset clears the choice; the browser keeps no files across navigation, so there is no state to restore. `required` with no file is `valueMissing`.
- The field base reads validity only while the control is being validated, since a disabled file input still reports `valueMissing` with no message.

## 18. Range slider

`punk-range-slider` is a form control with two thumbs on one track: `low` and `high`, `min`, `max`, `step`, `show-value`, and `label`.

- **Semantics.** The thumbs are two `role="slider"` elements in the shadow tree, in a `group` named by `label` (rendered above it) or the host's `aria-label`. Each is named by the localized "Minimum" or "Maximum", with `aria-valuenow`, `aria-valuetext` (the number formatted for the nearest `lang`), and a range that ends at the other thumb, so neither can pass the other. The host is not a tab stop; it delegates focus, and `focus()` reaches the low thumb. While disabled, the group and both thumbs are `aria-disabled` and the thumbs leave the tab order. **Why** two sliders and not one control with two values: each end is set and announced on its own, which is the APG multi-thumb slider.
- **Values** are the slider's arithmetic (`slider-math.ts`): inside the range and on a step, with the same repair and warning. `low` defaults to `min` and `high` to the last step; a value from code past the other end is held at it.
- **Keys** are the slider's for the focused thumb, in both directions. **Pointer:** a press on the track moves the nearer thumb there and focuses it (two thumbs at one value part toward the press, and at the top the low one moves) and a drag follows the pointer, reading the track once. `input` while a value changes; `change` when a key press or a drag ends with a change.
- **Form.** It submits `low` and then `high` under `name`, as two entries, and nothing without a name. The `low` and `high` attributes are the defaults a reset restores, and a kept state restores both.
- **Look.** The slider's trough and thumbs, with the `accent` fill between the thumbs.
- **Warning:** no name.

## Verification

- Node: `slider-math.test.ts`.
- `test/browser/forms.test.ts`, for every control in all three engines (the radio group, textarea, and combobox included): `FormData` under the name when enabled and named and nothing otherwise, the `form` attribute, a disabled fieldset, reset to the authored default in both directions, state restore, `labels` and label clicks, the name fallback, `required` and each native constraint, `setCustomValidity`, `reportValidity()` focusing the control, and a blocked `requestSubmit`. **Slider parity:** every arrow, Home, and End against a native range with the same range, step, and direction.
- `toggle-base.test.ts`, `field-base.test.ts`, `form-control.test.ts`, and each control's tests: roles and states, keys, events once per user change, steppers and their repeat, the select's observer, messages and their timing, `aria-invalid` and descriptions, contrast of boundaries and placeholders read from the render.
- `radio-group.test.ts`: the tab stop, arrows in both directions skipping disabled radios without wrapping, Space and click, values from code before their radio, group disabling, release of a radio that leaves. `textarea.test.ts`: rows and their repair, the count and its description, `autogrow`. `combobox.test.ts`: filtering, keys, choosing by click without losing focus, Escape absorbed, settling on leave, `allow-custom`, `filter="none"` with changing options, listeners only while open. `fieldset.test.ts`: the named and described group, disabling native and form-associated controls and giving back exactly those, the legend exception, added and removed children. `date-field.test.ts` and `time-field.test.ts`: the native type and name, the value both ways, attributes passed through, events, values cleared with a warning, range validity and its message, seconds, the picker rules, and 187px. `file-field.test.ts`: the native input and its attributes, the list and its sizes by language, events, `FormData` for one and several files and without a name, reset, `required` and `reportValidity()`, a disabled fieldset, the drop zone's words and locale, dragging, `accept` and `multiple` on drop, no drop without `drop-zone` or while disabled, and 187px. Node: `file-kinds.test.ts`. `range-slider.test.ts`: the group and the named thumbs, their ranges, formatting and locale, the name fallback and warning, snapping and ordering, the repair, keys stopping at the other thumb in both directions, focus and the disabled state, presses on the track and their ties, a drag that cannot pass, `FormData`, reset and restore, the fill, and forced colors.
- `check:frameworks`: each fixture binds a text field, switch, and slider and submits the form ([workbench.md §4](workbench.md)).

## Gaps

- **The combobox chooses one value.** The catalog's multiple-value combobox (chips for the chosen values) is not built. Closing it: a `multiple` mode that submits each value under `name`, with `punk-tag` for the chosen values ([data-display.md §7](data-display.md)).
- **The textarea does not grow in engines without `field-sizing`.** Closing it waits for the engines, or a measurement on `input` that the performance rules would have to allow.

Platform limits, documented in the Forms guide and not closable inside the library:

- autofill and password managers in shadow roots, the unthemed select list, number parsing by engine and locale, date and time display in the browser's language, `SubmitEvent.submitter` for `punk-button`, and native validation messages in the browser's language;
- WebKit's native range does not swap Left and Right in right-to-left text, though it draws the range reversed. The slider swaps them, as Chromium and Firefox do, so the parity test omits those two keys in WebKit and says why.
