import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { childChanged, owner, release } from '../../internal/owner.ts';
import type { Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { nextRovingIndex } from '../../internal/roving-keys.ts';
import { isFocusTarget, itemDisabled } from '../../internal/roving.ts';
import { devWarn } from '../../utilities/warn.ts';
import { PunkAccordionItem } from './accordion-item.ts';
import { accordionStyles } from './accordion.styles.ts';

/**
 * A group of disclosure sections. By default expanding one section collapses the others; with
 * `multiple` any number can be open. Up and Down move between headings, and Home and End go to
 * the first and last. The headings are separate tab stops.
 *
 * @tagname punk-accordion
 *
 * @slot - `punk-accordion-item` children.
 *
 * @csspart accordion - The wrapper around the items.
 */
export class PunkAccordion extends PunkElement implements Owner<PunkAccordionItem> {
  static override styles = accordionStyles;

  /** Lets several items be expanded at once. */
  @property({ type: Boolean, reflect: true }) multiple = false;

  #items: PunkAccordionItem[] = [];
  #warned = false;

  /** @internal An item that is now expanded: in single mode the others collapse. */
  [childChanged](item: PunkAccordionItem): void {
    if (this.multiple || !item.expanded) return;
    for (const other of this.#items) if (other !== item) other.expanded = false;
  }

  /** @internal */
  [release](item: PunkAccordionItem): void {
    item[owner] = null;
  }

  /** Single mode keeps the first of several expanded items, and says so once. */
  #normalize(): void {
    if (this.multiple) return;
    const open = this.#items.filter((item) => item.expanded);
    if (open.length < 2) return;
    if (!this.#warned) {
      this.#warned = true;
      devWarn(
        this,
        'Several items are expanded. Only the first stays open; set `multiple` to allow this.',
      );
    }
    for (const item of open.slice(1)) item.expanded = false;
  }

  readonly #handleSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const items = slot
      .assignedElements({ flatten: true })
      .filter((element): element is PunkAccordionItem => element instanceof PunkAccordionItem);
    for (const item of this.#items) if (!items.includes(item)) this[release](item);
    for (const item of items) item[owner] = this;
    this.#items = items;
    this.#normalize();
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('multiple')) this.#normalize();
  }

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    const target = event.composedPath()[0];
    const from = this.#items.findIndex((item) => item[isFocusTarget](target));
    if (from < 0) return;
    const to = nextRovingIndex(
      event.key,
      from,
      this.#items.map((item) => item[itemDisabled]),
      { orientation: 'vertical', rtl: false },
    );
    if (to === from) return;
    event.preventDefault();
    this.#items[to]?.focusHeader();
  };

  protected override render() {
    return html`
      <div part="accordion" class="accordion" @keydown=${this.#handleKeyDown}>
        <slot @slotchange=${this.#handleSlotChange}></slot>
      </div>
    `;
  }
}
