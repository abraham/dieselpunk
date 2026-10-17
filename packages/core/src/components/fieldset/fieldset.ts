import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Ledger } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { fieldsetStyles } from './fieldset.styles.ts';

const NATIVE = 'button, input, select, textarea, fieldset';

// What a native fieldset disables: its native controls and form-associated custom elements.
function isControl(element: Element): element is HTMLElement & { disabled: boolean } {
  return (
    element.matches(NATIVE) ||
    (element.constructor as { formAssociated?: boolean }).formAssociated === true
  );
}

/**
 * A titled group of controls: a native `<fieldset>` and `<legend>` in its shadow tree around the
 * slotted controls, so it is a `group` named by its legend. A hint describes the group, and an
 * error summary, from the `error` slot, shows with the warning triangle and also describes it.
 *
 * `disabled` disables every native control and form-associated element inside it, as a native
 * fieldset does, by setting their `disabled`; it remembers which ones it changed and gives exactly
 * those back when it is enabled or they leave. Controls in the `legend` slot stay enabled. Controls
 * added deeper inside while it is disabled are not found until its own children change.
 *
 * @tagname punk-fieldset
 *
 * @slot - The controls.
 * @slot legend - Rich content for the legend, after `label`.
 * @slot hint - Help below the legend. It describes the group.
 * @slot error - A summary of what is wrong in the group. It describes the group while it has content.
 *
 * @csspart fieldset - The native fieldset.
 * @csspart legend - The native legend.
 * @csspart hint - The wrapper around the hint.
 * @csspart content - The wrapper around the controls.
 * @csspart error - The wrapper around the error summary.
 */
export class PunkFieldset extends PunkElement {
  static override styles = fieldsetStyles;

  /** The legend, and the name of the group. */
  @property({ reflect: true }) label = '';

  /** Disables the controls inside it. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  readonly #slots = new SlotPresence(this, ['legend', 'hint', 'error']);
  readonly #ledger = new Ledger();
  #warnedName = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#ledger.restoreAll();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('disabled')) this.#sync();
    const named = Boolean(this.label) || this.#slots.has('legend');
    if (!named && !this.#warnedName) devWarn(this, 'It has no legend. Set `label`.');
    this.#warnedName = !named;
  }

  #sync(): void {
    if (!this.disabled || !this.isConnected) {
      this.#ledger.restoreAll();
      return;
    }
    const legends = [...this.children].filter((child) => child.slot === 'legend');
    const found = new Set<Element>();
    for (const element of this.querySelectorAll('*')) {
      if (!isControl(element) || legends.some((legend) => legend.contains(element))) continue;
      found.add(element);
      this.#ledger.disable(element);
    }
    this.#ledger.restoreAll(found);
  }

  readonly #onSlotChange = (): void => {
    if (this.disabled) this.#sync();
  };

  protected override render() {
    const described = [
      this.#slots.has('hint') ? 'hint' : '',
      this.#slots.has('error') ? 'error' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return html`
      <fieldset
        part="fieldset"
        class="fieldset"
        ?disabled=${this.disabled}
        aria-describedby=${ifDefined(described || undefined)}
      >
        <legend part="legend" class="legend" ?hidden=${!this.label && !this.#slots.has('legend')}>
          ${this.label}<slot name="legend" @slotchange=${this.#onLegendChange}></slot>
        </legend>
        <div part="hint" class="hint" id="hint" ?hidden=${!this.#slots.has('hint')}>
          <slot name="hint" @slotchange=${this.#slots.handleSlotChange}></slot>
        </div>
        <div part="content" class="content"><slot @slotchange=${this.#onSlotChange}></slot></div>
        <div part="error" class="error" id="error" ?hidden=${!this.#slots.has('error')}>
          <span class="indicator variant-warning" aria-hidden="true"
            ><span class="shape"></span
          ></span>
          <span><slot name="error" @slotchange=${this.#slots.handleSlotChange}></slot></span>
        </div>
      </fieldset>
    `;
  }

  readonly #onLegendChange = (): void => {
    this.#slots.handleSlotChange();
    this.#onSlotChange();
  };
}
