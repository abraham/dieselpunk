import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { RovingController } from '../../internal/roving.ts';
import { devWarn } from '../../utilities/warn.ts';
import { toolbarStyles } from './toolbar.styles.ts';

export interface PunkOverflowDetail {
  /** The items that do not fit, in order. */
  hidden: HTMLElement[];
}

declare global {
  interface HTMLElementEventMap {
    'punk-overflow-change': CustomEvent<PunkOverflowDetail>;
  }
}

const ITEM =
  'punk-button, punk-icon-button, punk-checkbox, punk-switch, button, a[href], [data-punk-toolbar-item]';
const SEPARATOR = 'punk-divider, hr, [role="separator"]';

/**
 * A strip of actions with one tab stop. Give it an `aria-label`. Items are direct children that
 * are a `punk-button`, `punk-icon-button`, `punk-checkbox`, `punk-switch`, `button`, `a[href]`, or
 * have `data-punk-toolbar-item`; dividers are skipped. Left and Right (swapped in right-to-left
 * languages), Home, and End move among them without wrapping. A select, text field, number field,
 * or slider uses the arrow keys itself, so it stays its own tab stop outside the group.
 *
 * When the items do not fit, the trailing ones get `data-punk-overflow` and are hidden, the
 * `overflow` slot shows, and `punk-overflow-change` lists them so the application can fill its own
 * menu. With no `overflow` content nothing is hidden: the toolbar scrolls inside itself. Items are
 * measured when the toolbar is resized and when its children change, not when their content does.
 *
 * @tagname punk-toolbar
 *
 * @slot - The items and dividers.
 * @slot overflow - The application's trigger for the items that do not fit.
 *
 * @csspart toolbar - The strip.
 *
 * @fires punk-overflow-change - The set of hidden items changed. `detail` is `{ hidden }`.
 */
export class PunkToolbar extends PunkElement {
  static override styles = toolbarStyles;

  /** Lets the strip grow taller instead of hiding items. It creates no observer. */
  @property({ type: Boolean, reflect: true }) wrap = false;

  /** Mirrors the host `aria-label`, which cannot reach the strip on its own. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  readonly #roving = new RovingController({
    host: this,
    items: () => this.#items().filter((item) => !item.hasAttribute('data-punk-overflow')),
  });
  #observer: ResizeObserver | null = null;
  #hidden: HTMLElement[] = [];
  #warnedOverflow = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#roving.connect();
    this.#observe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#roving.disconnect();
    this.#observer?.disconnect();
    this.#observer = null;
  }

  protected override firstUpdated(): void {
    if (!this.accessibleLabel && !this.hasAttribute('aria-labelledby')) {
      devWarn(this, 'It has no accessible name. Set `aria-label`.');
    }
    this.#observe();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('wrap') && this.hasUpdated) {
      this.#observe();
      if (this.wrap) this.#apply([]);
    }
  }

  get #defaultSlot(): HTMLSlotElement | null {
    return this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
  }

  get #overflowSlot(): HTMLSlotElement | null {
    return this.renderRoot.querySelector<HTMLSlotElement>('slot[name="overflow"]');
  }

  #children(): HTMLElement[] {
    return (this.#defaultSlot?.assignedElements({ flatten: true }) ?? []) as HTMLElement[];
  }

  #items(): HTMLElement[] {
    return this.#children().filter(
      (element) => element.matches(ITEM) && !element.matches(SEPARATOR),
    );
  }

  #observe(): void {
    if (this.wrap || !this.isConnected) {
      this.#observer?.disconnect();
      this.#observer = null;
      return;
    }
    if (this.#observer) return;
    const strip = this.renderRoot.querySelector('.toolbar');
    if (!strip) return;
    this.#observer = new ResizeObserver(() => this.#measure());
    this.#observer.observe(strip);
  }

  readonly #handleSlotChange = (): void => {
    this.#observe();
    this.#roving.refresh();
    this.#measure();
  };

  /** Hides the trailing children that do not fit, leaving room for the overflow trigger. */
  #measure(): void {
    const strip = this.renderRoot.querySelector<HTMLElement>('.toolbar');
    if (!strip || this.wrap) return;
    const children = this.#children();
    const trigger = this.#overflowSlot?.assignedElements({ flatten: true })[0] as
      HTMLElement | undefined;

    // Measure with everything showing, so a child that was hidden has a width.
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    for (const child of children) child.removeAttribute('data-punk-overflow');
    const overflowBox = this.renderRoot.querySelector<HTMLElement>('.overflow');
    if (overflowBox) overflowBox.hidden = true;

    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    const available = strip.clientWidth - this.#padding(strip);
    const widths = children.map((child) => child.getBoundingClientRect().width);
    const total =
      widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);

    let hidden: HTMLElement[] = [];
    if (total > available) {
      if (!trigger) {
        if (!this.#warnedOverflow) {
          this.#warnedOverflow = true;
          devWarn(
            this,
            'Its items do not fit and there is no `overflow` slot content, so it scrolls.',
          );
        }
      } else {
        if (overflowBox) overflowBox.hidden = false;
        const reserve = trigger.getBoundingClientRect().width + gap;
        let used = reserve;
        let fits = 0;
        for (const width of widths) {
          if (used + width + (fits > 0 ? gap : 0) > available) break;
          used += width + (fits > 0 ? gap : 0);
          fits++;
        }
        while (fits > 0 && children[fits - 1]?.matches(SEPARATOR)) fits--;
        hidden = children.slice(fits).filter((child) => !child.matches(SEPARATOR));
        for (const child of children.slice(fits)) child.setAttribute('data-punk-overflow', '');
      }
    }
    this.#apply(hidden, trigger, active);
  }

  #padding(strip: HTMLElement): number {
    const style = getComputedStyle(strip);
    return parseFloat(style.paddingInlineStart) + parseFloat(style.paddingInlineEnd);
  }

  /** Records the hidden items, moves focus off one that went away, and reports a change. */
  #apply(hidden: HTMLElement[], trigger?: HTMLElement, active?: Element | null): void {
    if (this.wrap) {
      for (const child of this.#children()) child.removeAttribute('data-punk-overflow');
      const box = this.renderRoot.querySelector<HTMLElement>('.overflow');
      if (box) box.hidden = true;
    }
    const same =
      hidden.length === this.#hidden.length && hidden.every((item, i) => item === this.#hidden[i]);
    if (same) {
      this.#roving.refresh();
      return;
    }
    const focused = hidden.find((item) => active && item.contains(active));
    this.#hidden = hidden;
    this.#roving.refresh();
    if (focused) trigger?.focus();
    this.emit<PunkOverflowDetail>('punk-overflow-change', { hidden: [...hidden] });
  }

  protected override render() {
    return html`
      <div
        part="toolbar"
        class="toolbar"
        role="toolbar"
        aria-orientation="horizontal"
        aria-label=${ifDefined(this.accessibleLabel ?? undefined)}
      >
        <slot @slotchange=${this.#handleSlotChange}></slot>
        <span class="overflow" hidden>
          <slot name="overflow" @slotchange=${this.#handleSlotChange}></slot>
        </span>
      </div>
    `;
  }
}
