import { html } from 'lit';
import { PunkSelectableBase } from '../../internal/selectable-base.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { listItemStyles } from './list.styles.ts';

/**
 * A row of a `punk-list`: a start slot for an icon, the text, a description below it, and an end
 * slot for a count, a time, or a badge. All of its text is its name, so keep it short. In a list
 * that selects it is an `option`, and a selected one shows a check; in one that does not it is a
 * `listitem`. Outside a list it is a `button`.
 *
 * @tagname punk-list-item
 *
 * @slot - The text.
 * @slot start - Before the text, such as an icon.
 * @slot description - A second line below the text.
 * @slot end - After the text, such as a count or a badge.
 *
 * @csspart item - The row.
 * @csspart start - The wrapper around the start slot.
 * @csspart label - The wrapper around the text.
 * @csspart description - The wrapper around the description.
 * @csspart end - The wrapper around the end slot.
 * @csspart check - The check mark of a selected item.
 *
 * @fires punk-activate - It was clicked, or activated with Enter. `detail` is `{ value, item }`.
 */
export class PunkListItem extends PunkSelectableBase {
  static override styles = listItemStyles;

  readonly #slots = new SlotPresence(this, ['start', 'description', 'end']);

  protected override render() {
    const change = this.#slots.handleSlotChange;
    return html`<div part="item" class="item">
      <span part="start" class="start" ?hidden=${!this.#slots.has('start')}
        ><slot name="start" @slotchange=${change}></slot
      ></span>
      <span class="main">
        <span part="label" class="label"><slot></slot></span>
        <span part="description" class="description" ?hidden=${!this.#slots.has('description')}
          ><slot name="description" @slotchange=${change}></slot
        ></span>
      </span>
      <span part="end" class="end" ?hidden=${!this.#slots.has('end')}
        ><slot name="end" @slotchange=${change}></slot
      ></span>
      <span part="check" class="check" aria-hidden="true"></span>
    </div>`;
  }
}
