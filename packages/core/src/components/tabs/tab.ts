import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { childChanged, owner } from '../../internal/owner.ts';
import type { Owned, Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import type { RovingItem } from '../../internal/roving.ts';
import { focusItem, itemDisabled, setTabStop } from '../../internal/roving.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { uid } from '../../internal/ids.ts';
import { tabStyles } from './tabs.styles.ts';

interface PunkTabsLike extends Element {
  refreshTabs?(): void;
}

/**
 * One tab of a `punk-tabs`. The host is the `role="tab"` element and the focus target, so a
 * tab's tab stop, selected state, and panel are attributes on it. Its name is its text.
 *
 * @tagname punk-tab
 *
 * @slot - The label.
 * @slot icon - An icon before the label.
 *
 * @csspart tab - The tab surface.
 * @csspart icon - The wrapper around the icon.
 * @csspart label - The wrapper around the label.
 */
export class PunkTab extends PunkElement implements RovingItem, Owned<PunkTab> {
  static override styles = tabStyles;

  /** The `id` of the panel this tab shows, looked up in the same tree as the tab. */
  @property({ reflect: true }) panel = '';

  /** Whether the tab is selected. The tabs keep exactly one selected. */
  @property({ type: Boolean, reflect: true }) selected = false;

  /** Stops the tab from being selected or focused. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /**
   * The tabs that manage this tab.
   * @internal
   */
  [owner]: Owner<PunkTab> | null = null;
  static {
    // The dev transform gives a decorator on a symbol key no key, so the property is made here.
    this.createProperty(owner, { attribute: false });
  }

  /** Set by the tabs, for the edge that faces the panel. */
  @property({ attribute: false }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  readonly #slots = new SlotPresence(this, ['icon']);
  #tabStop: boolean | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'tab');
    if (!this.id) this.id = uid('punk-tab');
    // A tab upgraded after its tabs rendered is not announced by a slotchange.
    if (!this[owner]) this.closest<PunkTabsLike>('punk-tabs')?.refreshTabs?.();
  }

  /**
   * Roving protocol: whether the tab can be reached by the arrow keys.
   * @internal
   */
  get [itemDisabled](): boolean {
    return this.disabled;
  }

  /**
   * Roving protocol: moves focus to the tab.
   * @internal
   */
  [focusItem](): void {
    this.focus();
  }

  /**
   * Roving protocol: `true` is the one tab stop, `false` is skipped by Tab, `null` hands control back.
   * @internal
   */
  [setTabStop](on: boolean | null): void {
    this.#tabStop = on;
    this.requestUpdate();
  }

  protected override willUpdate(): void {
    this.setAttribute('aria-selected', this.selected ? 'true' : 'false');
    if (this.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.removeAttribute('tabindex');
    } else {
      this.removeAttribute('aria-disabled');
      this.setAttribute('tabindex', this.#tabStop === false ? '-1' : '0');
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('selected') || changed.has('disabled') || changed.has('panel')) {
      this[owner]?.[childChanged](this, changed);
    }
  }

  protected override render() {
    return html`
      <span part="tab" class="tab ${this.orientation}">
        <span part="icon" class="icon" ?hidden=${!this.#slots.has('icon')}>
          <slot name="icon" @slotchange=${this.#slots.handleSlotChange}></slot>
        </span>
        <span part="label" class="label"><slot></slot></span>
      </span>
    `;
  }
}
