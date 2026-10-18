import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { childChanged, owner } from '../../internal/owner.ts';
import type { Owned, Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { focusItem, itemDisabled, setTabStop } from '../../internal/roving.ts';
import type { RovingItem } from '../../internal/roving.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { serverValues } from '../../internal/server-values.ts';
import { radioStyles } from './radio-group.styles.ts';

/** A radio group: it owns its radios' checked state and tab stop, and can disable them all. */
export interface RadioOwner extends Owner<PunkRadio> {
  readonly isDisabled: boolean;
}

/**
 * One choice in a `punk-radio-group`. Its name is the text in its default slot. The group owns its
 * checked state and tab stop; the `checked` attribute is the choice a form reset goes back to.
 *
 * It is `role="radio"` with `aria-checked` and `aria-disabled` written on the host.
 *
 * @tagname punk-radio
 *
 * @slot - The label.
 *
 * @csspart control - The ring and the label together, which take the focus ring.
 * @csspart ring - The ring.
 * @csspart dot - The dot, shown while checked.
 * @csspart label - The wrapper around the label.
 */
export class PunkRadio extends PunkElement implements Owned<PunkRadio>, RovingItem {
  static override styles = radioStyles;

  /** What the group submits while this radio is checked. */
  @property({ reflect: true }) value = '';

  /** Whether it is the chosen one. The `checked` attribute is the default a form reset goes back to. */
  @property({ type: Boolean }) checked = false;

  /** Leaves it out of the arrow keys, and stops it being chosen. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /**
   * The group that owns this radio, set by the group.
   * @internal
   */
  [owner]: RadioOwner | null = null;
  static {
    // The dev transform gives a decorator on a symbol key no key, so the property is made here.
    this.createProperty(owner, { attribute: false });
  }

  readonly #slots = new SlotPresence(this, ['']);
  #tabStop: boolean | null = null;

  /**
   * Roving protocol: whether it, or its group, is disabled.
   * @internal
   */
  get [itemDisabled](): boolean {
    return this.disabled || Boolean(this[owner]?.isDisabled);
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

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncHost();
  }

  protected override updated(changed: PropertyValues<this>): void {
    this.#syncHost();
    if (changed.has('disabled') || (changed.has('value') && changed.get('value') !== undefined)) {
      this[owner]?.[childChanged](this, changed);
    }
  }

  #syncHost(): void {
    const disabled = this[itemDisabled];
    this.setAttribute('role', 'radio');
    this.setAttribute('aria-checked', String(this.checked));
    if (disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
    if (disabled) this.removeAttribute('tabindex');
    else this.setAttribute('tabindex', this.#tabStop === false ? '-1' : '0');
  }

  protected override render() {
    // Its group sets `checked` and may disable it, which the server could not see.
    const server = serverValues();
    return html`<span
      part="control"
      class=${classMap({
        control: true,
        checked: server ? this.hasAttribute('checked') : this.checked,
        disabled: server ? this.disabled : this[itemDisabled],
      })}
      ><span part="ring" class="ring"><span part="dot" class="dot"></span></span
      ><span part="label" class="label" ?hidden=${!this.#slots.has('')}
        ><slot @slotchange=${this.#slots.handleSlotChange}></slot></span
    ></span>`;
  }
}
