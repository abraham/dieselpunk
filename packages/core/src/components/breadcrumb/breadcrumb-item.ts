import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { safeUrl } from '../../internal/safe-url.ts';
import { devWarn } from '../../utilities/warn.ts';
import { breadcrumbItemStyles } from './breadcrumb.styles.ts';

/**
 * One step of a `punk-breadcrumb`: a link to `href`, named by its text, after a separator that is
 * hidden from assistive technology. The `current` item is the page itself and has
 * `aria-current="page"`; without an `href` it is text, not a link. The host is a `listitem`.
 *
 * @tagname punk-breadcrumb-item
 *
 * @slot - The text.
 *
 * @csspart link - The link, or the text of an item with no `href`.
 * @csspart separator - The separator before it.
 */
export class PunkBreadcrumbItem extends PunkElement {
  static override styles = breadcrumbItemStyles;

  /**
   * Where the link goes. Without it the item is text, and so is an `href` that could run script:
   * only `http:`, `https:`, `mailto:`, and relative URLs make a link.
   */
  @property({ reflect: true }) href = '';

  /** Marks the item as the current page. */
  @property({ type: Boolean, reflect: true }) current = false;

  #warnedUnsafe = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const unsafe = this.href !== '' && safeUrl(this.href) === undefined;
    if (unsafe && !this.#warnedUnsafe) {
      devWarn(
        this,
        'Its `href` is not an http:, https:, mailto:, or relative URL, so it renders as text.',
      );
    }
    this.#warnedUnsafe = unsafe;
  }

  protected override render() {
    const current = this.current ? 'page' : undefined;
    const href = safeUrl(this.href);
    return html`<span part="separator" class="separator" aria-hidden="true"></span>${
        href
          ? html`<a part="link" class="link" href=${href} aria-current=${ifDefined(current)}
              ><slot></slot
            ></a>`
          : html`<span part="link" class="link text" aria-current=${ifDefined(current)}
              ><slot></slot
            ></span>`
      }`;
  }
}
