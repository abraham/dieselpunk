import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { dividerStyles } from './divider.styles.ts';

export type DividerOrientation = 'horizontal' | 'vertical';

/**
 * An etched separator. The component sets `role` and `aria-orientation` on itself and replaces
 * any values a consumer set.
 *
 * @tagname punk-divider
 *
 * @slot - Optional label, centered between two lines. Horizontal dividers only.
 *
 * @csspart line - A line. A labeled divider has two.
 * @csspart label - The label wrapper.
 *
 * @cssprop [--punk-divider-gap=var(--punk-space-2)] - Space between the lines and the label.
 */
export class PunkDivider extends PunkElement {
  static override styles = dividerStyles;

  static override properties: PropertyDeclarations = {
    orientation: { reflect: true },
    decorative: { type: Boolean, reflect: true },
  };

  /** Unknown values behave as `horizontal`. */
  orientation: DividerOrientation = 'horizontal';

  /** Removes the separator semantics when the divider is purely visual. */
  decorative = false;

  readonly #slots = new SlotPresence(this, ['']);
  #warnedAboutLabel = false;

  get #vertical(): boolean {
    return this.orientation === 'vertical';
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('orientation') || changed.has('decorative')) {
      if (this.decorative) {
        this.setAttribute('role', 'none');
        this.removeAttribute('aria-orientation');
      } else {
        this.setAttribute('role', 'separator');
        this.setAttribute('aria-orientation', this.#vertical ? 'vertical' : 'horizontal');
      }
    }
  }

  protected override updated(): void {
    const ignoredLabel = this.#vertical && this.#slots.has('');
    if (ignoredLabel && !this.#warnedAboutLabel) {
      devWarn(
        this,
        'A vertical divider does not display a label, so its slotted content is ignored.',
      );
    }
    this.#warnedAboutLabel = ignoredLabel;
  }

  protected override render() {
    const showLabel = !this.#vertical && this.#slots.has('');
    // The slot always renders so slotchange keeps working while the label is hidden.
    return html`
      <div part="line" class="line"></div>
      <span part="label" class="label" ?hidden=${!showLabel}>
        <slot @slotchange=${this.#slots.handleSlotChange}></slot>
      </span>
      <div part="line" class="line" ?hidden=${!showLabel}></div>
    `;
  }
}
