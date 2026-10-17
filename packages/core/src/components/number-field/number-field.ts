import { msg } from '../../internal/localize.ts';
import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { devWarn } from '../../utilities/warn.ts';
import { numberFieldStyles } from './number-field.styles.ts';

const REPEAT_DELAY = 400;
const REPEAT_EVERY = 80;

/**
 * A field for a number, with a native `<input type="number">` in its shadow tree, so validity,
 * rounding to `step`, and the spinbutton role are the platform's. It takes part in a form: it
 * submits `value` under `name`, and a form reset puts `value` back to the attribute the markup had.
 * `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput`, and `valueMissing` are native's.
 *
 * Up and Down step, and typing works as it does in a native field. The two steppers are for a
 * pointer: they step by `step`, hold to repeat after 400ms every 80ms, and are out of the tab order
 * and the accessibility tree, since the keys already serve everyone else. The number is not
 * formatted by the component: parsing and display follow the engine and the user's locale.
 *
 * `label` is the name, then `aria-label`, then the text of a `<label for>` pointing at the host. A
 * `min` above `max`, or a `step` that is not above 0, is repaired and warns once.
 *
 * @tagname punk-number-field
 *
 * @slot prefix - Inside the field before the number.
 * @slot suffix - Inside the field after the number, such as a unit.
 * @slot hint - Help below the field. It describes the field for assistive technology.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native input.
 * @csspart prefix - The wrapper around the prefix.
 * @csspart suffix - The wrapper around the suffix.
 * @csspart stepper - One of the two stepper buttons.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user typed or stepped. From the native input, or from a stepper.
 * @fires change - The user committed a change, or a stepper press ended.
 */
export class PunkNumberField extends PunkFieldBase {
  static override styles = numberFieldStyles;

  /** The number, as the text the user sees. The `value` attribute is the default a form reset goes back to. */
  @property() value = '';

  /** Shown while the field is empty. It is not a name. */
  @property({ reflect: true }) placeholder = '';

  /** The smallest value. */
  @property({ type: Number, reflect: true }) min: number | null = null;

  /** The largest value. */
  @property({ type: Number, reflect: true }) max: number | null = null;

  /** The distance between values, above 0. */
  @property({ type: Number, reflect: true }) step = 1;

  /** The number can be selected and copied, and not changed. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /** Removes the two stepper buttons. */
  @property({ type: Boolean, reflect: true, attribute: 'hide-steppers' }) hideSteppers = false;

  #delay: ReturnType<typeof setTimeout> | undefined;
  #repeat: ReturnType<typeof setInterval> | undefined;
  #stepped = false;
  #warned = false;

  /** The value as a number, or `NaN` while the field is empty or does not hold one. */
  get valueAsNumber(): number {
    return (this.control as HTMLInputElement | null)?.valueAsNumber ?? Number.NaN;
  }

  get #range() {
    const ordered =
      this.min === null ||
      this.max === null ||
      !Number.isFinite(this.min) ||
      !Number.isFinite(this.max)
        ? true
        : this.min <= this.max;
    const stepUsable = Number.isFinite(this.step) && this.step > 0;
    return {
      min: ordered && this.min !== null && Number.isFinite(this.min) ? this.min : undefined,
      max: ordered && this.max !== null && Number.isFinite(this.max) ? this.max : undefined,
      step: stepUsable ? this.step : 1,
      repaired: !ordered || !stepUsable,
    };
  }

  protected override formValue(): FormValue {
    return this.value;
  }

  protected override resetToDefault(): void {
    this.value = this.getAttribute('value') ?? '';
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopRepeat();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.#range.repaired && !this.#warned) {
      this.#warned = true;
      devWarn(this, '`min` is above `max`, or `step` is not above 0, so they are repaired.');
    }
  }

  readonly #onInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value;
    this.commit();
  };

  // The steppers act like the arrow keys, which fire input on each step and change at the end.
  #step(direction: 1 | -1): void {
    const input = this.control as HTMLInputElement | null;
    if (!input || this.isDisabled || this.readonly) return;
    if (direction === 1) input.stepUp();
    else input.stepDown();
    this.value = input.value;
    this.#stepped = true;
    this.commit();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  #startRepeat(direction: 1 | -1): void {
    this.#stopRepeat();
    this.#step(direction);
    this.#delay = setTimeout(() => {
      this.#repeat = setInterval(() => this.#step(direction), REPEAT_EVERY);
    }, REPEAT_DELAY);
  }

  #stopRepeat(): void {
    clearTimeout(this.#delay);
    clearInterval(this.#repeat);
    this.#delay = undefined;
    this.#repeat = undefined;
    if (this.#stepped) {
      this.#stepped = false;
      this.forwardChange();
    }
  }

  #stepper(direction: 1 | -1, label: string) {
    return html`<button
      part="stepper"
      class=${direction === 1 ? 'stepper up' : 'stepper down'}
      type="button"
      tabindex="-1"
      aria-hidden="true"
      title=${label}
      ?disabled=${this.isDisabled}
      @pointerdown=${(event: PointerEvent) => {
        if (event.button !== 0) return;
        // A press must not take focus from the input, or the steppers would be a tab stop in effect.
        event.preventDefault();
        this.control?.focus();
        this.#startRepeat(direction);
      }}
      @pointerup=${() => this.#stopRepeat()}
      @pointerleave=${() => this.#stopRepeat()}
      @pointercancel=${() => this.#stopRepeat()}
    >
      <span class="glyph"></span>
    </button>`;
  }

  protected override render() {
    const aria = this.ariaBindings();
    const range = this.#range;
    return this.renderField({
      affixes: true,
      readonly: this.readonly,
      // `live` compares with what the input holds, so typing is never written back: a script-set
      // value would end the native user-edit state that `minlength` and `maxlength` depend on.
      control: html`<input
        part="control"
        class="control"
        id="control"
        type="number"
        .value=${live(this.value)}
        placeholder=${ifDefined(this.placeholder || undefined)}
        min=${ifDefined(range.min)}
        max=${ifDefined(range.max)}
        step=${range.step}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        aria-label=${aria.label}
        aria-describedby=${aria.describedby}
        aria-invalid=${aria.invalid}
        @input=${this.#onInput}
        @change=${this.forwardChange}
        @blur=${() => this.#stopRepeat()}
      />`,
      after: html`<span class="steppers" ?hidden=${this.hideSteppers}
        >${this.#stepper(1, msg('Increase', { id: 'increase', desc: 'The tooltip of the stepper that raises the value of a number field. It is not announced.' }))}${this.#stepper(
          -1,
          msg('Decrease', {
            id: 'decrease',
            desc: 'The tooltip of the stepper that lowers the value of a number field. It is not announced.',
          }),
        )}</span
      >`,
    });
  }
}
