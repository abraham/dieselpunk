import { msg } from './localize.ts';
import { LocaleWatcher } from './locale-watch.ts';
import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { ExternalAria, PopupKind } from './anchor.ts';
import { setExternalAria } from './anchor.ts';
import { isFieldsetDisabled } from './fieldset.ts';
import { PunkElement } from './punk-element.ts';
import { focusItem, itemDisabled, setTabStop } from './roving.ts';
import { serverValues } from './server-values.ts';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'confirm';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

const variants: readonly string[] = ['default', 'primary', 'danger', 'confirm'];
const sizes: readonly string[] = ['sm', 'md', 'lg'];

/**
 * Behavior shared by `punk-button` and `punk-icon-button`: a native button in the shadow tree
 * that submits or resets the host's form, blocks clicks while disabled or loading, and mirrors
 * `aria-label` and an external description onto the inner button.
 */
export abstract class PunkButtonBase extends PunkElement {
  readonly #localeWatcher = new LocaleWatcher(this);

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
  #expanded: boolean | null = null;
  #haspopup: PopupKind | null = null;
  // `null` means no roving group manages this button, so the inner button keeps its own tab stop.
  #tabStop: boolean | null = null;

  constructor() {
    super();
    // Capturing on the host runs before the inner button sees the click, so blocking here also
    // stops the form action and any listener added to the host later.
    this.addEventListener('click', this.#blockWhenInert, true);
  }

  /** Whether a disabled `<fieldset>` ancestor disables this button (see `isFieldsetDisabled`). */
  get #fieldsetDisabled(): boolean {
    return isFieldsetDisabled(this);
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
   * Anchor protocol: ARIA that cannot reach the inner button by an id reference, because the
   * button is inside this element's shadow root. `description` is the text of the description.
   * A property that is left out is not changed, and `null` removes it.
   * @internal
   */
  [setExternalAria](aria: ExternalAria): void {
    if ('description' in aria) this.#description = aria.description ?? null;
    if ('expanded' in aria) this.#expanded = aria.expanded ?? null;
    if ('haspopup' in aria) this.#haspopup = aria.haspopup ?? null;
    this.requestUpdate();
  }

  /**
   * Roving protocol: whether the button can take focus from a roving group's arrow keys.
   * @internal
   */
  get [itemDisabled](): boolean {
    return this.#disabled;
  }

  /**
   * Roving protocol: moves focus to the inner button.
   * @internal
   */
  [focusItem](): void {
    this.focus();
  }

  /**
   * Roving protocol: `true` is the group's one tab stop, `false` is skipped by Tab, `null` hands control back.
   * @internal
   */
  [setTabStop](on: boolean | null): void {
    this.#tabStop = on;
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

  /** Rendered last inside the inner button, so it hovers, presses, and clicks with it. */
  protected renderInButton(): unknown {
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
      filled: variant !== 'default',
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
        aria-expanded=${ifDefined(this.#expanded === null ? undefined : String(this.#expanded))}
        aria-haspopup=${ifDefined(this.#haspopup ?? undefined)}
        tabindex=${ifDefined(
          this.#tabStop === null || serverValues() ? undefined : this.#tabStop ? '0' : '-1',
        )}
        @click=${this.#handleClick}
      >
        <span class="content">${this.renderContent()}</span>
        ${
          this.loading
            ? html`<span part="spinner" class="spinner" aria-hidden="true"></span>`
            : nothing
        }
        ${this.renderInButton()}
      </button>
      ${this.renderAfterButton()}
      ${
        this.#description === null
          ? nothing
          : html`<span id="description" class="visually-hidden">${this.#description}</span>`
      }
      <span class="visually-hidden" role="status"
        >${this.loading ? msg('Loading', { id: 'loading', desc: 'Hidden text that tells assistive technology a button is busy.' }) : ''}</span
      >
    `;
  }
}
