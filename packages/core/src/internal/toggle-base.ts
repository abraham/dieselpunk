import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { PunkFormControl } from './form-control.ts';
import type { FormValue, Validation } from './form-control.ts';
import { focusItem, itemDisabled, setTabStop } from './roving.ts';
import { SlotPresence } from './slot-presence.ts';
import { requiredMark } from '../styles/required-mark.ts';

// What the engine says about an unchecked required checkbox, in the user's language.
let requiredProbe: HTMLInputElement | undefined;
function requiredMessage(): string {
  requiredProbe ??= Object.assign(document.createElement('input'), {
    type: 'checkbox',
    required: true,
  });
  return requiredProbe.validationMessage || 'Check this box';
}

// A click on a link or a field inside the label is for it, as with a native label.
const INTERACTIVE = 'a[href], button, input, select, textarea, [contenteditable="true"]';

/**
 * What `punk-checkbox` and `punk-switch` share: a form control that is a checked state with a
 * label, with its role, state, and tab stop written as attributes on the host, so tools see what
 * users get. The name is the text in the default slot, or `aria-label`.
 *
 * `checked` is not reflected: the attribute is the default that a form reset restores.
 */
export abstract class PunkToggleBase extends PunkFormControl {
  static override properties: PropertyDeclarations = {
    checked: { type: Boolean },
    value: { reflect: true },
  };

  /** Whether it is on. The `checked` attribute is the default a form reset goes back to. */
  checked = false;

  /** What it submits under `name` while it is checked. */
  value = 'on';

  protected abstract readonly toggleRole: 'checkbox' | 'switch';

  /** A switch also toggles on Enter. */
  protected readonly toggleOnEnter: boolean = false;

  protected readonly slots = new SlotPresence(this, ['']);
  #tabStop: boolean | null = null;
  #spaceDown = false;

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('keyup', this.#onKeyUp);
    this.addEventListener('blur', () => {
      this.#spaceDown = false;
    });
  }

  /**
   * Roving protocol: whether a roving group's arrow keys skip it.
   * @internal
   */
  get [itemDisabled](): boolean {
    return this.isDisabled;
  }

  /**
   * Roving protocol: moves focus to the host.
   * @internal
   */
  [focusItem](): void {
    this.focus();
  }

  /**
   * Roving protocol: `true` is the group's one tab stop, `false` is skipped by Tab, `null` hands control back.
   * @internal
   */
  [setTabStop](on: boolean | null): void {
    this.#tabStop = on;
    this.requestUpdate();
  }

  override reportValidity(): boolean {
    const valid = super.reportValidity();
    if (!valid) this.focus();
    return valid;
  }

  /** `aria-checked`: a checkbox adds `mixed`. */
  protected get checkedState(): string {
    return this.checked ? 'true' : 'false';
  }

  /** Called as the user toggles, before `checked` changes. */
  protected beforeToggle(): void {}

  protected override formValue(): FormValue {
    return this.checked ? this.value : null;
  }

  protected override resetToDefault(): void {
    this.checked = this.hasAttribute('checked');
  }

  protected override restoreState(state: FormValue): void {
    this.checked = typeof state === 'string';
  }

  protected override validate(): Validation | null {
    if (this.required && !this.checked) {
      return {
        flags: { valueMissing: true },
        message: requiredMessage(),
        anchor: this.renderRoot.querySelector<HTMLElement>('.control') ?? undefined,
      };
    }
    return null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncHost();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#syncHost();
    this.warnIfUnnamed(this.resolveName(this.slots.has('') ? 'text' : null));
  }

  #syncHost(): void {
    const disabled = this.isDisabled;
    this.#set('role', this.toggleRole);
    this.#set('aria-checked', this.checkedState);
    this.#set('aria-required', this.required ? 'true' : null);
    this.#set('aria-disabled', disabled ? 'true' : null);
    this.#set('tabindex', disabled ? null : this.#tabStop === false ? '-1' : '0');
  }

  #set(name: string, value: string | null): void {
    if (value === null) this.removeAttribute(name);
    else if (this.getAttribute(name) !== value) this.setAttribute(name, value);
  }

  #toggle(): void {
    this.beforeToggle();
    this.checked = !this.checked;
    this.commit();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  readonly #onClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    const inner = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
    if (inner && inner !== this && this.contains(inner)) return;
    this.#toggle();
  };

  // Space toggles on key up, as a native control does, and never scrolls the page.
  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== this || this.isDisabled) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === ' ') {
      event.preventDefault();
      this.#spaceDown = true;
    } else if (event.key === 'Enter' && this.toggleOnEnter && !event.repeat) {
      event.preventDefault();
      this.click();
    }
  };

  readonly #onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || !this.#spaceDown) return;
    this.#spaceDown = false;
    if (this.isDisabled) return;
    event.preventDefault();
    this.click();
  };

  /** The label, hidden while there is no text so an empty one takes no room. */
  protected renderLabel() {
    return html`<span part="label" class="label" ?hidden=${!this.slots.has('')}
      ><slot @slotchange=${this.slots.handleSlotChange}></slot>${requiredMark(this.required)}</span
    >`;
  }
}
