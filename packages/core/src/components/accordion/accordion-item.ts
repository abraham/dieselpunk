import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { accordionItemStyles } from './accordion.styles.ts';

export interface PunkToggleDetail {
  expanded: boolean;
}

declare global {
  interface HTMLElementEventMap {
    'punk-toggle': CustomEvent<PunkToggleDetail>;
  }
}

/** What an accordion lets its items tell it. */
export interface AccordionOwner {
  itemExpanded(item: PunkAccordionItem): void;
}

/**
 * One section of an accordion: a heading that is a button, and a panel it shows and hides. It also
 * works on its own. The heading is a `role="heading"` element with `aria-level`, so the level is a
 * property, and the panel is a `region` labeled by the button.
 *
 * @tagname punk-accordion-item
 *
 * @slot - The panel content.
 * @slot heading - Rich heading content, replacing `heading`.
 * @slot icon - An icon before the heading text.
 *
 * @csspart item - The wrapper around the heading and the panel.
 * @csspart heading - The heading element.
 * @csspart trigger - The button that toggles the panel.
 * @csspart indicator - The plus, or the minus while expanded.
 * @csspart panel - The panel, hidden while collapsed.
 *
 * @fires {CustomEvent<{ expanded: boolean }>} punk-toggle - A user expanded or collapsed it. It is not sent when `expanded` is set from code.
 */
export class PunkAccordionItem extends PunkElement {
  static override styles = accordionItemStyles;

  /** The heading text, and the name of the button. Use the `heading` slot for rich content. */
  @property({ reflect: true }) heading = '';

  /** The heading level for assistive technology, 1 to 6. Out-of-range values are clamped. */
  @property({ type: Number, reflect: true }) level = 3;

  /** Whether the panel is showing. */
  @property({ type: Boolean, reflect: true }) expanded = false;

  /** Stops the heading from being focused or toggled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** The accordion that manages this item, which collapses its other items. */
  @property({ attribute: false }) owner: AccordionOwner | null = null;

  readonly #slots = new SlotPresence(this, ['heading']);
  #warnedLevel = false;
  #warnedHeading = false;

  get isDisabled(): boolean {
    return this.disabled;
  }

  /** Whether `element` is this item's button. */
  isTrigger(element: EventTarget | undefined): boolean {
    return element !== undefined && element === this.renderRoot.querySelector('.trigger');
  }

  focusHeader(): void {
    this.renderRoot.querySelector<HTMLElement>('.trigger')?.focus();
  }

  get #level(): number {
    const level = Math.round(Number(this.level));
    return Number.isFinite(level) ? Math.min(6, Math.max(1, level)) : 3;
  }

  protected override willUpdate(): void {
    if (this.#level !== this.level && !this.#warnedLevel) {
      this.#warnedLevel = true;
      devWarn(this, `\`level\` is ${this.level}; using ${this.#level}, because it must be 1 to 6.`);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('expanded') && this.expanded) this.owner?.itemExpanded(this);
    if (!this.heading && !this.#slots.has('heading') && !this.#warnedHeading) {
      this.#warnedHeading = true;
      devWarn(this, 'It has no heading. Set `heading` or fill the `heading` slot.');
    }
  }

  readonly #toggle = (): void => {
    if (this.disabled) return;
    this.expanded = !this.expanded;
    this.emit<PunkToggleDetail>('punk-toggle', { expanded: this.expanded });
  };

  protected override render() {
    return html`
      <div part="item" class="item">
        <div part="heading" class="heading" role="heading" aria-level=${this.#level}>
          <button
            part="trigger"
            class="trigger"
            id="trigger"
            type="button"
            aria-expanded=${this.expanded ? 'true' : 'false'}
            aria-controls="panel"
            ?disabled=${this.disabled}
            @click=${this.#toggle}
          >
            <span part="indicator" class="indicator" aria-hidden="true"></span>
            <slot name="icon"></slot>
            <span class="label">
              <slot name="heading" @slotchange=${this.#slots.handleSlotChange}
                >${this.heading}</slot
              >
            </span>
          </button>
        </div>
        <div
          part="panel"
          class="panel"
          id="panel"
          role="region"
          aria-labelledby="trigger"
          ?hidden=${!this.expanded}
        >
          <slot></slot>
        </div>
      </div>
    `;
  }
}
