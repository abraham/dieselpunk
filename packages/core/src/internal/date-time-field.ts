import { html } from 'lit';
import { serverValues } from './server-values.ts';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { devWarn } from '../utilities/warn.ts';
import { PunkFieldBase } from './field-base.ts';
import type { FormValue } from './form-control.ts';

/**
 * What the date field and the time field share: a native `<input>` of their type, whose picker
 * and display are the platform's, with `value`, `min`, `max`, and `step` in the input's own
 * formats.
 */
export abstract class PunkDateTimeFieldBase extends PunkFieldBase {
  /** The native input type. */
  protected abstract readonly inputType: 'date' | 'time';

  /** The format `value` takes, for the warning when a value does not fit it. */
  protected abstract readonly valueFormat: string;

  /** The value in the input's format. The `value` attribute is the default a form reset goes back to. */
  @property() value = '';

  /** The earliest value the user may choose, in the same format as `value`. */
  @property({ reflect: true }) min: string | null = null;

  /** The latest value the user may choose, in the same format as `value`. */
  @property({ reflect: true }) max: string | null = null;

  /** The granularity, as the native attribute: days for a date, seconds for a time. */
  @property({ reflect: true }) step: string | null = null;

  /** The value can be read and copied, and not changed. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /** What the browser may fill in, as the native attribute. */
  @property({ reflect: true }) autocomplete: string | null = null;

  #warned = '';
  #probe: HTMLInputElement | undefined;

  protected override formValue(): FormValue {
    return this.value;
  }

  protected override resetToDefault(): void {
    this.value = this.getAttribute('value') ?? '';
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
  }

  // A native input empties a value it cannot parse and may normalize one it can. A detached input
  // of the same type says which, before the render, so the field never disagrees with its input.
  // The server has no input to ask, so the client checks the value when it upgrades.
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (serverValues() || !changed.has('value') || !this.value) return;
    this.#probe ??= Object.assign(document.createElement('input'), { type: this.inputType });
    this.#probe.value = this.value;
    const parsed = this.#probe.value;
    if (parsed === this.value) return;
    if (!parsed && this.#warned !== this.value) {
      devWarn(
        this,
        `"${this.value}" is not a value in the form ${this.valueFormat}, so it is cleared.`,
      );
    }
    this.#warned = this.value;
    this.value = parsed;
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
      control: html`<input
        part="control"
        class="control ${this.value ? '' : 'empty'}"
        id="control"
        type=${this.inputType}
        .value=${live(this.value)}
        min=${ifDefined(this.min ?? undefined)}
        max=${ifDefined(this.max ?? undefined)}
        step=${ifDefined(this.step ?? undefined)}
        autocomplete=${ifDefined(this.autocomplete ?? undefined)}
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
