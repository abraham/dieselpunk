import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkFormControl } from '../../internal/form-control.ts';
import type { FormValue, Validation } from '../../internal/form-control.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { childChanged, owner, release } from '../../internal/owner.ts';
import { nextRovingIndex } from '../../internal/roving-keys.ts';
import { itemDisabled, setTabStop } from '../../internal/roving.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { PunkRadio } from './radio.ts';
import type { RadioOwner } from './radio.ts';
import { radioGroupStyles } from './radio-group.styles.ts';

export type RadioGroupOrientation = 'vertical' | 'horizontal';

// What the engine says about a required radio group with nothing chosen, in the user's language.
let requiredProbe: HTMLInputElement | undefined;
function requiredMessage(): string {
  requiredProbe ??= Object.assign(document.createElement('input'), {
    type: 'radio',
    required: true,
  });
  return requiredProbe.validationMessage || 'Select one of these options';
}

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/**
 * One choice from a small set of `punk-radio` children, every one of them visible. It takes part
 * in a form: it submits the chosen radio's `value` under `name`, a form reset goes back to the
 * radios marked `checked` in the markup, and `required` with nothing chosen is `valueMissing`.
 *
 * The radios are a `radiogroup` named by `label`, or by `aria-label`, with one tab stop: the chosen
 * radio, else the first enabled one. The arrow keys move to the next or previous enabled radio and
 * choose it, without wrapping; Left and Right swap in right-to-left languages. Space chooses the
 * focused radio, and so does a click. `input` and `change` are sent once for each choice the user
 * makes, and not when `value` is set from code.
 *
 * @tagname punk-radio-group
 *
 * @slot - The `punk-radio` elements.
 * @slot hint - Help below the label. It describes the group.
 *
 * @csspart label - The label above the radios.
 * @csspart hint - The wrapper around the hint.
 * @csspart radios - The `radiogroup` that holds the radios.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user chose a radio.
 * @fires change - The user chose a radio.
 */
export class PunkRadioGroup extends PunkFormControl implements RadioOwner {
  static override styles = radioGroupStyles;

  /** The name of the group, and the text above it. Without it, use `aria-label`. */
  @property({ reflect: true }) label = '';

  /** How the radios are laid out. The arrow keys work in both directions either way. Unknown values use `vertical`. */
  @property({ reflect: true }) orientation: RadioGroupOrientation = 'vertical';

  /**
   * The chosen radio's `value`, or an empty string. Assigned before a matching radio exists, it is
   * kept until one arrives. The host's `value` attribute sets the first choice; a form reset goes
   * back to the radios marked `checked`.
   */
  @property()
  get value(): string {
    return this.#checked()?.value ?? this.#requested ?? '';
  }
  set value(value: string) {
    const old = this.value;
    this.#requested = value ?? '';
    if (this.#built) this.#apply(this.#requested);
    this.requestUpdate('value', old);
  }

  readonly #localeWatcher = new LocaleWatcher(this);
  readonly #slots = new SlotPresence(this, ['hint']);
  #radios: PunkRadio[] = [];
  #requested: string | undefined;
  #built = false;
  #scheduled = false;
  #wasDisabled = false;
  #spaceDown = false;
  #messageShown = false;
  #warnedDuplicate = false;

  constructor() {
    super();
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('keyup', this.#onKeyUp);
    this.addEventListener('click', this.#onClick);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#schedule();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const radio of this.#radios) this[release](radio);
    this.#radios = [];
    this.#built = false;
  }

  override reportValidity(): boolean {
    const valid = super.reportValidity();
    if (!valid) this.focus();
    return valid;
  }

  /** Focuses the radio that holds the tab stop. */
  override focus(options?: FocusOptions): void {
    this.#tabStop()?.focus(options);
  }

  /** @internal A radio's `disabled` or `value` changed. */
  [childChanged](): void {
    this.#schedule();
  }

  /** @internal */
  [release](radio: PunkRadio): void {
    radio[owner] = null;
    radio[setTabStop](null);
  }

  protected override formValue(): FormValue {
    return this.#checked()?.value ?? null;
  }

  protected override resetToDefault(): void {
    this.#requested = undefined;
    const authored = this.#radios.filter((radio) => radio.hasAttribute('checked')).at(-1);
    this.#check(authored);
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
  }

  protected override validate(): Validation | null {
    if (!this.required || this.#checked()) return null;
    return { flags: { valueMissing: true }, message: requiredMessage(), anchor: this.#tabStop() };
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const disabled = this.isDisabled;
    if (disabled !== this.#wasDisabled) {
      this.#wasDisabled = disabled;
      for (const radio of this.#radios) radio.requestUpdate();
      this.#placeTabStop();
    }
    this.warnIfUnnamed(this.resolveName(this.label));
    // Validity is set after the render that reads it, so a message that just became due draws now.
    if (this.messageVisible !== this.#messageShown) {
      this.#messageShown = this.messageVisible;
      this.requestUpdate();
    }
  }

  #checked(): PunkRadio | undefined {
    return this.#radios.find((radio) => radio.checked);
  }

  #tabStop(): PunkRadio | undefined {
    const enabled = this.#radios.filter((radio) => !radio[itemDisabled]);
    return enabled.find((radio) => radio.checked) ?? enabled[0];
  }

  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.isConnected) this.#sync();
    });
  }

  /** Adopts the radios, and chooses the one asked for or the one the markup checked. */
  #sync(): void {
    const found = [...this.children].filter(
      (child): child is PunkRadio => child instanceof PunkRadio,
    );
    for (const radio of this.#radios) if (!found.includes(radio)) this[release](radio);
    for (const radio of found) radio[owner] = this;
    this.#radios = found;
    if (!this.#built && this.#requested === undefined) {
      this.#check(found.filter((radio) => radio.checked).at(-1));
    } else if (this.#requested !== undefined) {
      this.#apply(this.#requested);
    }
    this.#built = true;
    const values = found.map((radio) => radio.value);
    const duplicate = new Set(values).size !== values.length;
    if (duplicate && !this.#warnedDuplicate) {
      devWarn(this, 'Two radios have the same `value`, and only the first can be chosen by it.');
    }
    this.#warnedDuplicate = duplicate;
    this.#placeTabStop();
    this.commit();
  }

  #apply(value: string): void {
    this.#check(value === '' ? undefined : this.#radios.find((radio) => radio.value === value));
  }

  #check(target: PunkRadio | undefined): void {
    for (const radio of this.#radios) radio.checked = radio === target;
    this.#placeTabStop();
  }

  #placeTabStop(): void {
    const stop = this.#tabStop();
    for (const radio of this.#radios) radio[setTabStop](radio === stop);
  }

  /** The user chose `radio`. */
  #choose(radio: PunkRadio): void {
    if (radio.checked || radio[itemDisabled] || this.isDisabled) return;
    this.#requested = undefined;
    this.#check(radio);
    this.commit();
    this.requestUpdate();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #radioFor(event: Event): PunkRadio | undefined {
    return event
      .composedPath()
      .find((node): node is PunkRadio => this.#radios.includes(node as PunkRadio));
  }

  readonly #onClick = (event: MouseEvent): void => {
    // A click on a `<label for>` arrives on the host itself.
    if (event.target === this) return this.focus();
    const radio = this.#radioFor(event);
    if (radio) this.#choose(radio);
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const radio = this.#radioFor(event);
    if (!radio || event.target !== radio || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === ' ') {
      event.preventDefault();
      this.#spaceDown = true;
      return;
    }
    if (!ARROWS.includes(event.key)) return;
    event.preventDefault();
    const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    const from = this.#radios.indexOf(radio);
    const to = nextRovingIndex(
      event.key,
      from,
      this.#radios.map((other) => other[itemDisabled]),
      { orientation: vertical ? 'vertical' : 'horizontal', rtl: this.matches(':dir(rtl)') },
    );
    const target = this.#radios[to];
    if (!target || to === from) return;
    this.#choose(target);
    target.focus();
  };

  readonly #onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || !this.#spaceDown) return;
    this.#spaceDown = false;
    const radio = this.#radioFor(event);
    if (radio) this.#choose(radio);
  };

  protected override render() {
    const shown = this.messageVisible;
    const name = this.resolveName(this.label);
    const described = [this.#slots.has('hint') ? 'hint' : '', shown ? 'message' : '']
      .filter(Boolean)
      .join(' ');
    const orientation = this.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    return html`
      <div part="label" class="label" id="label" ?hidden=${!this.label}>${this.label}</div>
      <div part="hint" class="hint" id="hint" ?hidden=${!this.#slots.has('hint')}>
        <slot name="hint" @slotchange=${this.#slots.handleSlotChange}></slot>
      </div>
      <div
        part="radios"
        class=${classMap({ radios: true, [orientation]: true, disabled: this.isDisabled })}
        role="radiogroup"
        aria-labelledby=${ifDefined(this.label ? 'label' : undefined)}
        aria-label=${ifDefined(this.label ? undefined : (name ?? undefined))}
        aria-describedby=${ifDefined(described || undefined)}
        aria-required=${ifDefined(this.required ? 'true' : undefined)}
        aria-invalid=${ifDefined(shown ? 'true' : undefined)}
        aria-disabled=${ifDefined(this.isDisabled ? 'true' : undefined)}
      >
        <slot @slotchange=${() => this.#schedule()}></slot>
      </div>
      <div part="message" class="message" id="message" ?hidden=${!shown}>
        <span class="indicator variant-warning" aria-hidden="true"
          ><span class="shape"></span
        ></span>
        <span dir="auto"
          ><span class="word"
            >${msg('invalid', { id: 'invalidField', desc: 'A word shown before the message of a field that fails validation, for example: invalid: Please fill out this field.' })}</span
          >: ${shown ? this.validationMessage : ''}</span
        >
      </div>
    `;
  }
}
