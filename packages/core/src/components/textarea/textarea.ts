import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { textareaStyles } from './textarea.styles.ts';

/**
 * A field for several lines of text, with a native `<textarea>` in its shadow tree that takes the
 * focus. It takes part in a form as a text field does: it submits `value` under `name`, a form
 * reset puts `value` back to the attribute the markup had, and `required`, `minlength`, and
 * `maxlength` are its native constraints.
 *
 * `label` is its name, else `aria-label`, else the text of a `<label for>` that points at it. The
 * user can drag it taller. With `autogrow` it grows with its text instead, where the browser
 * supports `field-sizing`, and elsewhere stays `rows` lines tall and scrolls. `show-count` shows how
 * many characters there are, out of `maxlength` when it is set; the count describes the field.
 *
 * @tagname punk-textarea
 *
 * @slot hint - Help below the field. It describes the field for assistive technology.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native textarea.
 * @csspart count - The character count, while `show-count` is set.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @cssprop [--punk-textarea-max-height=20lh] - The tallest an `autogrow` field gets before it scrolls.
 *
 * @fires input - The user typed. Sent by the native textarea and crossing the shadow boundary.
 * @fires change - The user committed a change, from the host.
 */
export class PunkTextarea extends PunkFieldBase {
  static override styles = textareaStyles;

  /** The text. The `value` attribute is the default a form reset goes back to. */
  @property() value = '';

  /** Shown while the field is empty. It is not a name. */
  @property({ reflect: true }) placeholder = '';

  /** The text can be selected and copied, and not changed. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /** The fewest characters the user may leave. */
  @property({ type: Number, reflect: true }) minlength: number | null = null;

  /** The most characters the user may type. */
  @property({ type: Number, reflect: true }) maxlength: number | null = null;

  /** How many lines tall it is, and the least an `autogrow` field shrinks to. Below 1 is 1. */
  @property({ type: Number, reflect: true }) rows = 3;

  /** Grows with the text, up to `--punk-textarea-max-height`, where the browser supports it. */
  @property({ type: Boolean, reflect: true }) autogrow = false;

  /** Shows the number of characters, out of `maxlength` when it is set. */
  @property({ type: Boolean, reflect: true, attribute: 'show-count' }) showCount = false;

  /** What a password manager or the browser may fill in, as the native attribute. */
  @property({ reflect: true }) autocomplete: string | null = null;

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
    this.value = (event.target as HTMLTextAreaElement).value;
    this.commit();
  };

  protected override render() {
    const aria = this.ariaBindings();
    const rows = Number.isFinite(this.rows) ? Math.max(1, Math.floor(this.rows)) : 3;
    const limit = (value: number | null) =>
      value !== null && Number.isFinite(value) && value >= 0 ? value : undefined;
    const max = limit(this.maxlength) ?? null;
    const described = [
      this.showCount ? 'count' : '',
      this.presence.has('hint') ? 'hint' : '',
      this.messageVisible ? 'message' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return this.renderField({
      affixes: false,
      readonly: this.readonly,
      control: html`<textarea
        part="control"
        class="control"
        id="control"
        rows=${rows}
        style="--_rows: ${rows}"
        .value=${live(this.value)}
        placeholder=${ifDefined(this.placeholder || undefined)}
        minlength=${ifDefined(limit(this.minlength))}
        maxlength=${ifDefined(max ?? undefined)}
        autocomplete=${ifDefined(this.autocomplete ?? undefined)}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        aria-label=${aria.label}
        aria-describedby=${ifDefined(described || undefined)}
        aria-invalid=${aria.invalid}
        @input=${this.#onInput}
        @change=${this.forwardChange}
      ></textarea>`,
      after: html`<span part="count" class="count" id="count" ?hidden=${!this.showCount}
        >${this.value.length}${max === null ? '' : `/${max}`}</span
      >`,
    });
  }
}
