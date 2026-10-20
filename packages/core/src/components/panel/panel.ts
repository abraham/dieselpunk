import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { panelStyles } from './panel.styles.ts';

export type PanelVariant = 'raised' | 'inset' | 'flat';
export type PanelDensity = 'compact' | 'low';

const variants: readonly string[] = ['raised', 'inset', 'flat'];

/**
 * A structural metal surface. It has no ARIA role; add `role="region"` and a label when it is a landmark.
 *
 * @tagname punk-panel
 *
 * @slot - Panel content.
 * @slot header - Optional header strip. Hidden while empty.
 * @slot footer - Optional footer strip. Hidden while empty.
 *
 * @csspart surface - The panel surface.
 * @csspart header - The header strip.
 * @csspart body - The content area.
 * @csspart footer - The footer strip.
 *
 * @cssprop [--punk-panel-padding=var(--punk-space-3)] - Padding of the body and the inline padding of header and footer.
 */
export class PunkPanel extends PunkElement {
  static override styles = panelStyles;

  static override properties: PropertyDeclarations = {
    variant: { reflect: true },
    density: { reflect: true },
  };

  /** Surface treatment. Unknown values render as `raised`. */
  variant: PanelVariant = 'raised';

  /** Applies a density to this panel's subtree. Unset inherits from ancestors. */
  density?: PanelDensity;

  readonly #slots = new SlotPresence(this, ['header', 'footer']);

  protected override render() {
    const variant = variants.includes(this.variant) ? this.variant : 'raised';
    return html`
      <div part="surface" class=${classMap({ surface: true, [`variant-${variant}`]: true })}>
        <div part="header" class="header" ?hidden=${!this.#slots.has('header')}>
          <slot name="header" @slotchange=${this.#slots.handleSlotChange}></slot>
        </div>
        <div part="body" class="body"><slot></slot></div>
        <div part="footer" class="footer" ?hidden=${!this.#slots.has('footer')}>
          <slot name="footer" @slotchange=${this.#slots.handleSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
