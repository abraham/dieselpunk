import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { devWarn } from '../utilities/warn.ts';
import { PunkSelectableBase } from './selectable-base.ts';
import { SlotPresence } from './slot-presence.ts';

export type ReceptacleSize = 'sm' | 'md' | 'lg';

/**
 * What `punk-slot` and `punk-item-stack` share: the square receptacle with its states, badge and
 * overlay, and the dev warnings. A subclass supplies the content and the words of its name.
 */
export abstract class PunkReceptacleBase extends PunkSelectableBase {
  /** Draws a dotted outline. It does not select. */
  @property({ type: Boolean, reflect: true }) highlighted = false;

  /** Draws a hatched corner and an inner frame, and adds the word "invalid" to the name. */
  @property({ type: Boolean, reflect: true }) invalid = false;

  /** Unknown values render as `md`. */
  @property({ reflect: true }) size: ReceptacleSize = 'md';

  protected readonly presence = new SlotPresence(this, ['', 'icon', 'badge']);
  #problems = new Set<string>();

  protected override updated(): void {
    const current = new Set(this.describeProblems());
    for (const problem of current) {
      if (!this.#problems.has(problem)) devWarn(this, problem);
    }
    this.#problems = current;
  }

  /** Messages for the dev warnings. Each distinct message is logged once while it stays true. */
  protected describeProblems(): string[] {
    const named =
      this.hasAttribute('aria-label') ||
      this.hasAttribute('aria-labelledby') ||
      this.hasName ||
      this.hasContent;
    return named ? [] : ['It has no accessible name. Set its name, `label`, or `aria-label`.'];
  }

  /** The words that name the item, joined into one visually hidden text node. */
  protected abstract accessibleParts(): string[];

  protected accessibleText(): string {
    return this.accessibleParts()
      .filter((part) => part !== '')
      .join(', ');
  }

  /** Whether the item has a name of its own, such as `label` or `name`. */
  protected abstract get hasName(): boolean;

  /** Whether the item's art or content slot has anything in it, which also names it. */
  protected abstract get hasContent(): boolean;

  /** Whether nothing visible identifies the item, so its boundary has to. */
  protected abstract get empty(): boolean;

  /** `contentPart` names the part on the element that holds `content`. */
  protected renderReceptacle(
    contentPart: string,
    content: TemplateResult,
    extra: TemplateResult | null = null,
  ): TemplateResult {
    return html`
      <div part="slot" class=${classMap({ slot: true, empty: this.empty })}>
        <span class="visually-hidden">${this.accessibleText()}</span>
        <div part=${contentPart} class="content">${content}</div>
        <div part="badge" class="badge" ?hidden=${!this.presence.has('badge')}>
          <slot name="badge" @slotchange=${this.presence.handleSlotChange}></slot>
        </div>
        ${extra}
        <div part="overlay" class="overlay"><slot name="overlay"></slot></div>
      </div>
    `;
  }
}
