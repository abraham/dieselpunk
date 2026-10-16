import type { PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { devWarn } from '../utilities/warn.ts';
import { isFieldsetDisabled } from './fieldset.ts';
import { PunkElement } from './punk-element.ts';

export type FormValue = File | string | FormData | null;

export interface Validation {
  flags: ValidityStateFlags;
  /** Required whenever a flag is set. */
  message: string;
  /** An element in the shadow tree, so `reportValidity()` focuses and scrolls to the right place. */
  anchor?: HTMLElement;
}

/**
 * The base of the form controls: a form-associated custom element that submits a value, validates,
 * resets, and restores like a native control.
 *
 * Do not reflect the live value to the attribute that holds the default (`checked`, `value`).
 * `formResetCallback` restores the default, which is the attribute as the author wrote it, and a
 * reflected attribute would turn it into the current value.
 */
export abstract class PunkFormControl extends PunkElement {
  static formAssociated = true;

  /** Submitted with the value. A control with no name adds nothing to the form. */
  @property({ reflect: true }) name = '';

  /** Also true while a disabled `<fieldset>` ancestor disables the control (see `isDisabled`). */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Marks the control as one the form needs a value from. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Mirrors the host `aria-label`, which cannot reach a control in the shadow tree on its own. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  /** Set when the user leaves the control, or when validity is reported, so a message waits for it. */
  @state() protected touched = false;

  @state() private labelsText = '';

  protected readonly internals = this.attachInternals();
  #custom = '';
  #warnedName = false;

  constructor() {
    super();
    this.addEventListener('invalid', () => {
      this.touched = true;
    });
    this.addEventListener('focusout', () => {
      this.touched = true;
    });
    this.addEventListener('focusin', () => this.#readLabels());
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  get labels(): NodeList {
    return this.internals.labels;
  }

  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /** Whether the control or a disabled `<fieldset>` around it is disabled. */
  get isDisabled(): boolean {
    return this.disabled || isFieldsetDisabled(this);
  }

  /** Whether a message should show: it is invalid, and the user has had a chance to type. */
  protected get messageVisible(): boolean {
    return this.touched && !this.internals.validity.valid;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    this.touched = true;
    return this.internals.reportValidity();
  }

  /** An empty message clears the custom error. */
  setCustomValidity(message: string): void {
    this.#custom = message;
    this.commit();
  }

  /** The value to submit, as it is now. */
  protected abstract formValue(): FormValue;

  /** Puts the control back to the default the author wrote. */
  protected abstract resetToDefault(): void;

  /** Restores a value the browser kept across navigation: the state `setFormValue` was given. */
  protected abstract restoreState(state: FormValue): void;

  /** The control's own constraints; a custom error set with `setCustomValidity` comes first. */
  protected validate(): Validation | null {
    return null;
  }

  /**
   * Hands the browser the current value and validity. A subclass calls it as soon as its value
   * changes, so a `FormData` read straight afterward is current; it also runs after each update.
   */
  protected commit(): void {
    this.internals.setFormValue(this.formValue());
    const validation = this.validate();
    if (this.#custom) {
      this.internals.setValidity({ customError: true }, this.#custom, validation?.anchor);
    } else if (validation) {
      this.internals.setValidity(validation.flags, validation.message, validation.anchor);
    } else {
      this.internals.setValidity({});
    }
  }

  /**
   * The name of the control: the control's own label, else `aria-label`, else the text of the
   * `<label>` elements pointing at it, which is read when it renders and on focus and is not live.
   */
  protected resolveName(own: string | null | undefined): string | null {
    return own?.trim() || this.accessibleLabel?.trim() || this.labelsText || null;
  }

  /** Warns once when a control has no name, since a screen reader user would meet it unlabeled. */
  protected warnIfUnnamed(name: string | null): void {
    if (name || this.#warnedName) return;
    this.#warnedName = true;
    devWarn(this, 'It has no accessible name. Set `label` or `aria-label`.');
  }

  formResetCallback(): void {
    this.touched = false;
    this.resetToDefault();
    this.commit();
  }

  /** Called when a disabled `<fieldset>` ancestor, or the control's own attribute, changes. */
  formDisabledCallback(): void {
    this.requestUpdate();
  }

  formStateRestoreCallback(state: FormValue): void {
    this.restoreState(state);
    this.commit();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#readLabels();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.commit();
  }

  #readLabels(): void {
    const text = Array.from(this.internals.labels, (label) => (label.textContent ?? '').trim())
      .filter(Boolean)
      .join(' ');
    if (text !== this.labelsText) this.labelsText = text;
  }
}
