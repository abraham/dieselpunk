import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { PunkButtonBase } from '../../internal/button-base.ts';
import { buttonBaseStyles } from '../../internal/button-base.styles.ts';
import { devWarn } from '../../utilities/warn.ts';
import type { TooltipPlacement } from '../tooltip/index.ts';
import { iconButtonStyles } from './icon-button.styles.ts';

/**
 * A square, icon-only button. Its `label` is the accessible name and the text of a tooltip that
 * appears on hover and keyboard focus. Clicks surface as the native `click` event.
 *
 * @tagname punk-icon-button
 *
 * @slot - A single icon, typically inline SVG drawn with `currentColor`.
 *
 * @csspart button - The inner native button.
 * @csspart icon - The icon wrapper.
 * @csspart spinner - The loading spinner.
 * @csspart tooltip - The label tooltip.
 */
export class PunkIconButton extends PunkButtonBase {
  static override styles = [buttonBaseStyles, iconButtonStyles];

  /** The accessible name and tooltip text. Required: an icon alone names nothing. */
  @property({ reflect: true }) label = '';

  /** Where the tooltip appears relative to the button. */
  @property({ attribute: 'tooltip-placement', reflect: true })
  tooltipPlacement: TooltipPlacement = 'top';

  #warnedUnnamed = false;

  protected override get accessibleName(): string | null {
    return this.label || this.accessibleLabel;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const unnamed = !this.accessibleName;
    if (unnamed && !this.#warnedUnnamed) {
      devWarn(this, 'An icon button needs a `label`; without one it has no accessible name.');
    }
    this.#warnedUnnamed = unnamed;
  }

  protected override renderContent() {
    return html`<span part="icon" class="icon"><slot></slot></span>`;
  }

  protected override renderAfterButton() {
    // The label is the accessible name already, so the tooltip must not describe the button too.
    return html`
      <punk-tooltip
        part="tooltip"
        placement=${this.tooltipPlacement}
        .describe=${false}
        .delay=${400}
        >${this.label}</punk-tooltip
      >
    `;
  }
}
