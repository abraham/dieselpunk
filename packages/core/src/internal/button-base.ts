import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { t } from '../utilities/localize.ts';
import { PunkElement } from './punk-element.ts';

export type ButtonVariant = 'default' | 'primary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

const variants: readonly string[] = ['default', 'primary', 'danger'];
const sizes: readonly string[] = ['sm', 'md', 'lg'];

/**
 * Behavior shared by `punk-button` and `punk-icon-button`: a native button in the shadow tree
 * that submits or resets the host's form, blocks clicks while disabled or loading, and mirrors
 * `aria-label` and an external description onto the inner button.
 */
export abstract class PunkButtonBase extends PunkElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...PunkElement.shadowRootOptions,
    delegatesFocus: true,
  };

  /** Unknown values render as `default`. */
  @property({ reflect: true }) variant: ButtonVariant = 'default';

  /** Unknown values render as `md`. */
  @property({ reflect: true }) size: ButtonSize = 'md';

  /** Blocks activation and focus. A disabled `<fieldset>` ancestor disables the button too. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Keeps focus and the accessible name, blocks activation, and shows a spinner. */
  @property({ type: Boolean, reflect: true }) loading = false;

  /** Defaults to `button`, not the native `submit`, so a stray button never submits a form. */
  @property({ reflect: true }) type: ButtonType = 'button';

  /** Mirrors the host `aria-label`, which cannot reach the inner button on its own. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  readonly #internals = this.attachInternals();
  #description: string | null = null;

  constructor() {
    super();
    // Capturing on the host runs before the inner button sees the click, so blocking here also
    // stops the form action and any listener added to the host later.
    this.addEventListener('click', this.#blockWhenInert, true);
  }

  /**
   * Whether a disabled `<fieldset>` ancestor disables this button. It is read live rather than
   * cached from `formDisabledCallback`, which also fires for this element's own `disabled`
   * attribute and would lag one update behind the property.
   */
  get #fieldsetDisabled(): boolean {
    const fieldset = this.parentElement?.closest('fieldset:disabled');
    if (!fieldset) return false;
    // Controls inside a fieldset's first <legend> stay enabled.
    const legend = fieldset.querySelector(':scope > legend');
    return !legend?.contains(this);
  }

  get #disabled(): boolean {
    return this.disabled || this.#fieldsetDisabled;
  }

  get #inert(): boolean {
    return this.#disabled || this.loading;
  }

  readonly #blockWhenInert = (event: Event): void => {
    if (this.#inert) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };

  /** Called by the browser when this element or a `<fieldset>` ancestor becomes (un)disabled. */
  formDisabledCallback(): void {
    this.requestUpdate();
  }

  /**
   * Tooltip anchor protocol: the text becomes the inner button's accessible description. An id
   * reference cannot cross the shadow boundary, so a tooltip passes its text here instead.
   * Pass `null` to remove it.
   */
  setExternalDescription(text: string | null): void {
    this.#description = text;
    this.requestUpdate();
  }

  /** The accessible name set on the inner button; subclasses may override. */
  protected get accessibleName(): string | null {
    return this.accessibleLabel;
  }

  /** The button's visible content. */
  protected abstract renderContent(): TemplateResult;

  /** Rendered immediately after the inner button, so it is that button's next sibling. */
  protected renderAfterButton(): unknown {
    return nothing;
  }

  readonly #handleClick = (): void => {
    const form = this.#internals.form;
    if (this.type === 'submit') form?.requestSubmit();
    else if (this.type === 'reset') form?.reset();
  };

  protected override render() {
    const variant = variants.includes(this.variant) ? this.variant : 'default';
    const size = sizes.includes(this.size) ? this.size : 'md';
    const disabled = this.#disabled;
    const classes = {
      button: true,
      [`variant-${variant}`]: true,
      [`size-${size}`]: true,
      disabled,
      loading: this.loading,
      interactive: !this.#inert,
    };

    return html`
      <button
        part="button"
        class=${classMap(classes)}
        type="button"
        ?disabled=${disabled}
        aria-label=${ifDefined(this.accessibleName ?? undefined)}
        aria-busy=${ifDefined(this.loading ? 'true' : undefined)}
        aria-disabled=${ifDefined(this.loading && !disabled ? 'true' : undefined)}
        aria-describedby=${ifDefined(this.#description === null ? undefined : 'description')}
        @click=${this.#handleClick}
      >
        <span class="content">${this.renderContent()}</span>
        ${
          this.loading
            ? html`<span part="spinner" class="spinner" aria-hidden="true"></span>`
            : nothing
        }
      </button>
      ${this.renderAfterButton()}
      ${
        this.#description === null
          ? nothing
          : html`<span id="description" class="visually-hidden">${this.#description}</span>`
      }
      <span class="visually-hidden" role="status">${this.loading ? t('loading') : ''}</span>
    `;
  }
}
