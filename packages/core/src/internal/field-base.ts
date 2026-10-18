import { msg } from './localize.ts';
import { LocaleWatcher } from './locale-watch.ts';
import { LitElement, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkFormControl } from './form-control.ts';
import type { Validation } from './form-control.ts';
import { SlotPresence } from './slot-presence.ts';

export type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** What a field renders around its native control. */
export interface FieldParts {
  /** The native control, with `part="control" class="control" id="control"` and the ARIA from `controlAria`. */
  control: TemplateResult;
  /** Rendered inside the box after the control, such as an arrow or the steppers. */
  after?: TemplateResult | typeof nothing;
  /** Whether the `prefix` and `suffix` slots exist. */
  affixes: boolean;
  readonly?: boolean;
}

/**
 * What the text field, the number field, and the select share: a native control in the shadow
 * tree that takes the focus, a label and hint, and a message that waits until the user has had a
 * chance to type. The label is rendered text in the shadow tree, so it names the control; without
 * one the control takes `aria-label`, or the text of a `<label>` that points at the host.
 */
export abstract class PunkFieldBase extends PunkFormControl {
  readonly #localeWatcher = new LocaleWatcher(this);

  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /** The name of the field, and the text above it. Without it, use `aria-label`. */
  @property({ reflect: true }) label = '';

  protected readonly presence = new SlotPresence(this, ['prefix', 'suffix', 'hint']);
  #messageShown = false;

  /** The native control in the shadow tree. */
  protected get control(): FieldControl | null {
    // Before the first render there is no render root, and a number field may be asked its value.
    return this.renderRoot?.querySelector<FieldControl>('.control') ?? null;
  }

  /** Selects the text of the field. */
  select(): void {
    (this.control as HTMLInputElement | null)?.select?.();
  }

  /** Focuses the control inside the field. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options);
  }

  // Text typed into the server's control before the upgrade becomes the value, with no event.
  protected override keepServerInput(root: ShadowRoot): void {
    const control = root.querySelector<HTMLInputElement>('input.control,textarea.control');
    const self = this as { value?: unknown };
    if (control && typeof self.value == 'string' && control.value !== control.defaultValue) {
      self.value = control.value;
    }
  }

  protected override validate(): Validation | null {
    const control = this.control;
    if (!control || control.validity.valid || !control.willValidate) return null;
    const v = control.validity;
    return {
      flags: {
        valueMissing: v.valueMissing,
        typeMismatch: v.typeMismatch,
        patternMismatch: v.patternMismatch,
        tooLong: v.tooLong,
        tooShort: v.tooShort,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        stepMismatch: v.stepMismatch,
        badInput: v.badInput,
      },
      message: control.validationMessage,
      anchor: control,
    };
  }

  /** The browser re-dispatches nothing across the shadow boundary for `change`, so the host does. */
  protected readonly forwardChange = (): void => {
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.warnIfUnnamed(this.resolveName(this.label));
    // Validity is set after the render that reads it, so a message that just became due draws now.
    if (this.messageVisible !== this.#messageShown) {
      this.#messageShown = this.messageVisible;
      this.requestUpdate();
    }
  }

  protected renderField({ control, after, affixes, readonly }: FieldParts): TemplateResult {
    const shown = this.messageVisible;
    return html`
      <div
        part="field"
        class=${classMap({
          field: true,
          invalid: shown,
          disabled: this.isDisabled,
          readonly: Boolean(readonly),
        })}
      >
        <label part="label" class="label" for="control" ?hidden=${!this.label}>${this.label}</label>
        <div class="box">
          ${
            affixes
              ? html`<span part="prefix" class="prefix" ?hidden=${!this.presence.has('prefix')}
                  ><slot name="prefix" @slotchange=${this.presence.handleSlotChange}></slot
                ></span>`
              : nothing
          }
          ${control}
          ${
            affixes
              ? html`<span part="suffix" class="suffix" ?hidden=${!this.presence.has('suffix')}
                  ><slot name="suffix" @slotchange=${this.presence.handleSlotChange}></slot
                ></span>`
              : nothing
          }
          ${after ?? nothing}
        </div>
        <div part="hint" class="hint" id="hint" ?hidden=${!this.presence.has('hint')}>
          <slot name="hint" @slotchange=${this.presence.handleSlotChange}></slot>
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
      </div>
    `;
  }

  /** The `aria-*` attributes the native control needs, as bindings: its name when there is no label, what describes it, and whether it is invalid. */
  protected ariaBindings() {
    const name = this.resolveName(this.label);
    const described = [
      this.presence.has('hint') ? 'hint' : '',
      this.messageVisible ? 'message' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return {
      label: ifDefined(this.label ? undefined : (name ?? undefined)),
      describedby: ifDefined(described || undefined),
      invalid: ifDefined(this.messageVisible ? 'true' : undefined),
    };
  }
}
