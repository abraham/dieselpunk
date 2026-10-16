import type { CSSResultGroup, CSSResultOrNative, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { PunkElement } from './punk-element.ts';
import { selectableStyles } from './selectable-base.styles.ts';

export interface PunkActivateDetail {
  value: string;
  item: HTMLElement;
}

/** A grid that owns its items' role, tab stop, and selected state. */
export interface ItemOwner {
  /** Called while `item` is updating, with the properties that changed. */
  itemChanged(item: HTMLElement, changed: ReadonlyMap<PropertyKey, unknown>): void;
}

declare global {
  interface HTMLElementEventMap {
    'punk-activate': CustomEvent<PunkActivateDetail>;
  }
}

/**
 * Behavior shared by `punk-slot`, `punk-item-stack`, and `punk-recipe`: a host that is itself the
 * focusable `role="button"`, so a `punk-slot-grid` can own its role, tab stop, and selected state.
 *
 * The accessible name comes from text in the shadow tree, so subclasses render their label and
 * state words there (hidden visually where they are not shown). Key events that arrive already
 * default-prevented are ignored, which is how a grid claims the keys it handles.
 */
export abstract class PunkSelectableBase extends PunkElement {
  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    return super.finalizeStyles([selectableStyles, styles ?? []]);
  }

  /** Blocks activation and focus. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Identifies the item in `punk-activate` and in a grid's `values`. */
  @property({ reflect: true }) value = '';

  /**
   * Outside a grid this exposes `aria-pressed`, from the first time it is set, true or false. A
   * grid sets it from its selection and exposes `aria-selected` instead.
   */
  @property({ type: Boolean, reflect: true })
  get selected(): boolean {
    return this.#selected ?? false;
  }
  set selected(value: boolean) {
    const firstTime = this.#selected === undefined;
    this.#selected = value;
    // `false` over the default `false` is no change, but it still has to expose `aria-pressed`.
    if (firstTime) this.requestUpdate();
  }

  /**
   * Set by a grid that owns this item's role, `tabindex`, and `aria-selected`. The grid is told
   * when `disabled`, `value`, or `selected` change, since it cannot observe attributes.
   * @internal
   */
  @property({ attribute: false }) managed: ItemOwner | null = null;

  #selected: boolean | undefined;
  #managedBefore = false;
  #autoTabindex = false;
  #spaceDown = false;

  constructor() {
    super();
    this.addEventListener('click', this.#handleClick);
    this.addEventListener('keydown', this.#handleKeydown);
    this.addEventListener('keyup', this.#handleKeyup);
    this.addEventListener('blur', () => {
      this.#spaceDown = false;
    });
  }

  protected activate(): void {
    this.emit<PunkActivateDetail>('punk-activate', { value: this.value, item: this });
  }

  readonly #handleClick = (event: MouseEvent): void => {
    if (this.disabled) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    this.activate();
  };

  // Only keys pressed on the host itself count, not on focusable content slotted into it.
  #isOwnKey(event: KeyboardEvent): boolean {
    return (
      event.target === this &&
      !event.defaultPrevented &&
      !this.disabled &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    );
  }

  readonly #handleKeydown = (event: KeyboardEvent): void => {
    if (!this.#isOwnKey(event)) return;
    if (event.key === 'Enter') {
      if (!event.repeat) this.activate();
    } else if (event.key === ' ') {
      // A native button activates on release, and holding Space must not scroll the page.
      event.preventDefault();
      this.#spaceDown = true;
    }
  };

  readonly #handleKeyup = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || !this.#spaceDown) return;
    this.#spaceDown = false;
    if (this.#isOwnKey(event)) this.activate();
  };

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#syncSemantics();
    if (
      this.managed &&
      (changed.has('disabled') || changed.has('value') || changed.has('selected'))
    ) {
      this.managed.itemChanged(this, changed);
    }
  }

  // Attributes, not ElementInternals, so tooling that reads the DOM sees the same role as users.
  #syncSemantics(): void {
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');

    if (this.managed) {
      this.#managedBefore = true;
      this.removeAttribute('aria-pressed');
      return;
    }

    if (this.#managedBefore) {
      this.#managedBefore = false;
      this.removeAttribute('aria-selected');
      this.removeAttribute('tabindex');
      this.#autoTabindex = false;
    }

    this.setAttribute('role', 'button');
    if (this.#selected === undefined) this.removeAttribute('aria-pressed');
    else this.setAttribute('aria-pressed', String(this.selected));

    if (this.disabled) {
      if (this.#autoTabindex) this.removeAttribute('tabindex');
      this.#autoTabindex = false;
    } else if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
      this.#autoTabindex = true;
    }
  }
}
