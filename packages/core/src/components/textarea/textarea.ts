import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { textareaStyles } from './textarea.styles.ts';

let emptyStrings: TemplateStringsArray | undefined;

/** The strings with the last expression replaced by `text`, escaped, as a new array. */
function bake(strings: TemplateStringsArray, text: string): TemplateStringsArray {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // The parser drops one newline right after `<textarea>`, so exactly one is put there to drop.
  const joined = [
    ...strings.slice(0, -2),
    `${strings.at(-2)?.trimEnd()}\n${escaped}${strings.at(-1)}`,
  ];
  return Object.assign(joined, { raw: joined }) as unknown as TemplateStringsArray;
}

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
 * `monospace` sets the text in the monospace font, without spell checking, and breaks long words
 * anywhere: with `readonly`, a selectable block of code or data. The first `value` is the native
 * textarea's content, so a server-rendered field shows its text before scripts load.
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

  /** Monospaced text, without spell checking, that breaks long words anywhere. */
  @property({ type: Boolean, reflect: true }) monospace = false;

  // A textarea's content can be neither a binding nor, on the server, a property, so the first
  // value is baked into this element's own strings. Lit caches templates in WeakMaps keyed on them.
  #strings: TemplateStringsArray | undefined;

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
    const control = html`<textarea
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
      spellcheck=${ifDefined(this.monospace ? 'false' : undefined)}
      ?disabled=${this.isDisabled}
      ?readonly=${this.readonly}
      ?required=${this.required}
      aria-label=${aria.label}
      aria-describedby=${ifDefined(described || undefined)}
      aria-invalid=${aria.invalid}
      @input=${this.#onInput}
      @change=${this.forwardChange}
    >
${''}</textarea>`;
    this.#strings ??= this.value
      ? bake(control.strings, this.value)
      : (emptyStrings ??= bake(control.strings, ''));
    return this.renderField({
      affixes: false,
      readonly: this.readonly,
      control: { ...control, strings: this.#strings, values: control.values.slice(0, -1) },
      after: html`<span part="count" class="count" id="count" ?hidden=${!this.showCount}
        >${this.value.length}${max === null ? '' : `/${max}`}</span
      >`,
    });
  }
}
