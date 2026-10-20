import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { PunkReceptacleBase } from '../../internal/receptacle-base.ts';
import { receptacleStyles } from '../../styles/receptacle.ts';

/**
 * A square receptacle for an item, a recipe, a tool, or equipment. It shows slotted artwork, can
 * be selected, highlighted, or marked invalid, and activates on click, Enter, and Space. Putting
 * it in a `punk-slot-grid` adds roving focus and selection.
 *
 * It has no text of its own, so give it a `label` or put text or an image with `alt` inside.
 *
 * @tagname punk-slot
 *
 * @slot - The artwork or content, usually an image or SVG.
 * @slot badge - A small mark in the corner, such as a count or a level.
 * @slot overlay - Decoration over the whole slot. It does not receive pointer events.
 *
 * @csspart slot - The receptacle itself.
 * @csspart content - The wrapper around the default slot.
 * @csspart badge - The wrapper around the badge slot.
 * @csspart overlay - The wrapper around the overlay slot.
 *
 * @cssprop [--punk-slot-size=40px] - Width and height of a medium slot. Small is 0.8 times it and large is 1.2 times.
 *
 * @fires punk-activate - The slot was clicked or activated with Enter or Space. `detail` is `{ value, item }`.
 */
export class PunkSlot extends PunkReceptacleBase {
  static override styles = receptacleStyles;

  static override properties: PropertyDeclarations = {
    label: { reflect: true },
  };

  /** The accessible name, read by assistive technology but not shown. Slotted text names the slot too. */
  label = '';

  protected get hasName(): boolean {
    return this.label !== '';
  }

  protected get hasContent(): boolean {
    return this.presence.has('');
  }

  protected get empty(): boolean {
    return !this.hasContent;
  }

  protected accessibleParts(): string[] {
    return [this.label, this.invalidText()];
  }

  protected override render() {
    return this.renderReceptacle(
      'content',
      html`<slot @slotchange=${this.presence.handleSlotChange}></slot>`,
    );
  }
}
