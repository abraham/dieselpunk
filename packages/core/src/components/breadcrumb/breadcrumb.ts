import { html } from 'lit';
import { serverValues } from '../../internal/server-values.ts';
import type { PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { optionalNumber } from '../../internal/converters.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { Ledger } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { devWarn } from '../../utilities/warn.ts';
import { PunkBreadcrumbItem } from './breadcrumb-item.ts';
import { breadcrumbStyles } from './breadcrumb.styles.ts';

/**
 * The path to the current page: a `nav` landmark named "Breadcrumb" (or `label`) around a list of
 * `punk-breadcrumb-item` links, the last of which is usually `current`. The items wrap onto more
 * lines rather than scroll.
 *
 * With `max-items`, a longer path shows its first item and its last `max-items - 1`, and a button
 * named "Show full path" stands for the ones between. Activating it shows them all and moves focus
 * to the first one it revealed. The breadcrumb hides those items with `hidden` and places the ones
 * after the first with `slot`, and gives both back when it lets them go.
 *
 * @tagname punk-breadcrumb
 *
 * @slot - The `punk-breadcrumb-item` elements.
 * @slot rest - Where the breadcrumb places the items after the first. Leave it to the breadcrumb.
 *
 * @csspart nav - The navigation landmark.
 * @csspart list - The ordered list of items.
 * @csspart more - The button that shows the hidden items.
 */
export class PunkBreadcrumb extends PunkElement {
  static override styles = breadcrumbStyles;

  /** The name of the landmark. Without it, the localized "Breadcrumb". */
  @property({ reflect: true }) label = '';

  /** The most items to show before the middle ones collapse. Below 2, or unset, shows all. */
  @property({ attribute: 'max-items', converter: optionalNumber, reflect: true })
  maxItems: number | undefined;

  @state() private expanded = false;

  readonly #localeWatcher = new LocaleWatcher(this);
  #items: PunkBreadcrumbItem[] = [];
  readonly #ledger = new Ledger();
  #warnedStray = false;
  // The collapsed count the last render drew, so a slot change knows whether to draw again.
  #rendered = 0;

  /** How many items after the first are hidden behind the button. */
  get #collapsed(): number {
    const max = this.maxItems;
    const limit =
      max !== undefined && Number.isFinite(max) && max >= 2 ? Math.floor(max) : Infinity;
    const count = this.#items.length;
    return this.expanded || count <= limit ? 0 : count - limit;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const item of this.#items) this.#ledger.restore(item);
    this.#items = [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#sync();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('maxItems') || changed.has('expanded')) this.#sync();
  }

  /** Places each item: the first in the default slot, the rest after the button, the middle hidden. */
  #sync(): void {
    // The server has no children (specs/ssr.md §3).
    if (serverValues()) return;
    const children = [...this.children];
    const found = children.filter(
      (child): child is PunkBreadcrumbItem => child instanceof PunkBreadcrumbItem,
    );
    const stray = found.length !== children.length;
    if (stray && !this.#warnedStray) {
      devWarn(this, 'It contains elements that are not `punk-breadcrumb-item`.');
    }
    this.#warnedStray = stray;
    for (const item of this.#items) if (!found.includes(item)) this.#ledger.restore(item);
    this.#items = found;

    const collapsed = this.#collapsed;
    found.forEach((item, index) => {
      this.#ledger.write(item, 'slot', index === 0 ? null : 'rest');
      this.#ledger.write(item, 'hidden', index >= 1 && index <= collapsed ? '' : null);
    });
  }

  // Placing the items changes their slots, which reports once more and then finds nothing to change.
  readonly #onSlotChange = (): void => {
    this.#sync();
    if (this.#collapsed !== this.#rendered) this.requestUpdate();
  };

  readonly #expand = (): void => {
    const revealed = this.#items[1];
    this.expanded = true;
    void this.updateComplete.then(() => {
      revealed?.shadowRoot?.querySelector<HTMLElement>('a')?.focus();
    });
  };

  protected override render() {
    this.#rendered = this.#collapsed;
    const name =
      this.label ||
      msg('Breadcrumb', {
        id: 'breadcrumb',
        desc: 'The name of the landmark around a breadcrumb trail.',
      });
    return html`<nav part="nav" aria-label=${name}>
      <ol part="list" class="list">
        <slot @slotchange=${this.#onSlotChange}></slot>
        <li class="more-item" ?hidden=${this.#rendered === 0}>
          <span class="separator" aria-hidden="true"></span>
          <button part="more" class="more" type="button" @click=${this.#expand}>
            <span aria-hidden="true">…</span
            ><span class="visually-hidden"
              >${msg('Show full path', { id: 'showPath', desc: 'The name of the button that shows the hidden middle steps of a breadcrumb trail.' })}</span
            >
          </button>
        </li>
        <slot name="rest" @slotchange=${this.#onSlotChange}></slot>
      </ol>
    </nav>`;
  }
}
