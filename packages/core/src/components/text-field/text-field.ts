import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { textFieldStyles } from './text-field.styles.ts';

export type TextFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

const types: readonly string[] = ['text', 'email', 'password', 'search', 'tel', 'url'];

/**
 * A field for a line of text, with a native `<input>` in its shadow tree that takes the focus. It
 * takes part in a form: it submits `value` under `name`, a form reset puts `value` back to the
 * attribute the markup had, and the native constraints (`required`, `minlength`, `maxlength`,
 * `pattern`, and the ones the `type` brings, such as `email`) are its validity.
 *
 * `label` is its name. Without one the field takes `aria-label`, and failing that the text of a
 * `<label for>` that points at it, read when it renders and when it gets focus, which is not live.
 * A field with no name warns in development. A message appears once the user has left the field,
 * or a form reported it, and it is drawn in the text color, with a triangle and a frame, since the
 * danger color is below 3:1 on the panel surfaces. Paste is never blocked, and `autocomplete` is
 * passed through, though a password manager may not fill a field inside a shadow root.
 *
 * It has no `list`: an input in a shadow root cannot reach a `<datalist>` in the page. For free
 * text with suggestions, use `punk-combobox` with `allow-custom`.
 *
 * @tagname punk-text-field
 *
 * @slot prefix - Inside the field before the text, such as an icon.
 * @slot suffix - Inside the field after the text, such as a unit.
 * @slot hint - Help below the field. It describes the field for assistive technology.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native input.
 * @csspart prefix - The wrapper around the prefix.
 * @csspart suffix - The wrapper around the suffix.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user typed. Sent by the native input and crossing the shadow boundary.
 * @fires change - The user committed a change, from the host.
 */
export class PunkTextField extends PunkFieldBase {
  static override styles = textFieldStyles;

  static override properties: PropertyDeclarations = {
    value: {},
    type: { reflect: true },
    placeholder: { reflect: true },
    readonly: { type: Boolean, reflect: true },
    minlength: { type: Number, reflect: true },
    maxlength: { type: Number, reflect: true },
    pattern: { reflect: true },
    autocomplete: { reflect: true },
    inputmode: { reflect: true },
  };

  /** The text. The `value` attribute is the default a form reset goes back to. */
  value = '';

  /** The kind of text. Unknown values use `text`. */
  type: TextFieldType = 'text';

  /** Shown while the field is empty. It is not a name. */
  placeholder = '';

  /** The text can be selected and copied, and not changed. */
  readonly = false;

  /** The fewest characters the user may leave. */
  minlength: number | null = null;

  /** The most characters the user may type. */
  maxlength: number | null = null;

  /** A regular expression the whole value must match. */
  pattern: string | null = null;

  /** What a password manager or the browser may fill in, as the native attribute. */
  autocomplete: string | null = null;

  /** The keyboard a touch screen shows, as the native attribute. */
  inputmode: string | null = null;

  protected override formValue(): FormValue {
    return this.value;
  }

  protected override resetToDefault(): void {
    this.value = this.getAttribute('value') ?? '';
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
  }

  readonly #onInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value;
    this.commit();
  };

  protected override render() {
    const aria = this.ariaBindings();
    return this.renderField({
      affixes: true,
      readonly: this.readonly,
      // `live` compares with what the input holds, so typing is never written back: a script-set
      // value would end the native user-edit state that `minlength` and `maxlength` depend on.
      control: html`<input
        part="control"
        class="control"
        id="control"
        type=${types.includes(this.type) ? this.type : 'text'}
        .value=${live(this.value)}
        placeholder=${ifDefined(this.placeholder || undefined)}
        minlength=${ifDefined(this.minlength ?? undefined)}
        maxlength=${ifDefined(this.maxlength ?? undefined)}
        pattern=${ifDefined(this.pattern ?? undefined)}
        autocomplete=${ifDefined(this.autocomplete ?? undefined)}
        inputmode=${ifDefined(this.inputmode ?? undefined)}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        aria-label=${aria.label}
        aria-describedby=${aria.describedby}
        aria-invalid=${aria.invalid}
        @input=${this.#onInput}
        @change=${this.forwardChange}
      />`,
    });
  }
}
