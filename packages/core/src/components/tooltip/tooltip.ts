import { html, isServer } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { describeAnchor, resolveAnchor } from '../../internal/anchor.ts';
import { overlayStack } from '../../internal/overlays.ts';
import type { OverlayEntry } from '../../internal/overlay-stack.ts';
import { computePosition } from '../../utilities/position.ts';
import type { TooltipPlacement } from '../../utilities/position.ts';
import { devWarn } from '../../utilities/warn.ts';
import { tooltipStyles } from './tooltip.styles.ts';

export type { TooltipPlacement } from '../../utilities/position.ts';

const placements: readonly string[] = ['top', 'bottom', 'start', 'end'];
const VIEWPORT_MARGIN = 8;
const DEFAULT_OFFSET = 8;
const CLOSE_GRACE_MS = 100;
const WARM_MS = 300;
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// At most one tooltip is open; a tooltip closed moments ago lets the next open without a delay.
let current: PunkTooltip | null = null;
let lastClosedAt = Number.NEGATIVE_INFINITY;

/** Forgets that a tooltip recently closed, so the next one waits its full delay. For tests. */
export function resetTooltipWarmup(): void {
  lastClosedAt = Number.NEGATIVE_INFINITY;
}

/**
 * A text hint for an anchor element. It opens on hover after a delay and at once on keyboard
 * focus, and closes on Escape. Place it as a sibling of its anchor, never inside it, because
 * nested content would join the anchor's accessible name.
 *
 * @tagname punk-tooltip
 *
 * @slot - The tooltip content. It must not contain interactive controls.
 *
 * @csspart surface - The floating surface.
 * @csspart content - The content wrapper.
 *
 * @cssprop [--punk-tooltip-max-width=320px] - Widest the surface grows before wrapping.
 * @cssprop [--punk-tooltip-offset=8px] - Gap between the anchor and the surface.
 */
export class PunkTooltip extends PunkElement {
  static override styles = tooltipStyles;

  /** Id of the anchor in this element's root. Without it, the previous sibling is the anchor. */
  @property({ attribute: 'for' }) for = '';

  /** `start` and `end` follow the writing direction. Unknown values behave as `top`. */
  @property({ reflect: true }) placement: TooltipPlacement = 'top';

  /** Milliseconds a pointer must rest on the anchor before the tooltip opens. */
  @property({ type: Number }) delay = 400;

  /** Describe the anchor with this tooltip's text. `describe="false"` turns it off. */
  @property({ converter: { fromAttribute: (value: string | null) => value !== 'false' } })
  describe = true;

  /** Whether the tooltip is showing. Use `show()` and `hide()` rather than setting it. */
  @property({ type: Boolean, reflect: true }) open = false;

  #anchor: HTMLElement | null = null;
  #showTimer: number | undefined;
  #hideTimer: number | undefined;
  #overAnchor = false;
  #overSurface = false;
  #focused = false;
  #stopOpenWork: (() => void) | undefined;
  #unwireDescription: (() => void) | undefined;
  #warnedNoAnchor = false;
  #warnedFocusable = false;

  get #surface(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.surface');
  }

  /** Opens it now, with no delay. */
  show(): void {
    this.#clearTimers();
    this.open = true;
  }

  /** Closes it now. */
  hide(): void {
    this.#clearTimers();
    this.open = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#attach();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#detach();
    this.#clearTimers();
    this.#teardownOpen();
    if (this.open) this.open = false;
  }

  protected override firstUpdated(): void {
    this.#attach();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('for') && this.hasUpdated && changed.get('for') !== undefined) this.#attach();
    if (changed.has('describe') && changed.get('describe') !== undefined) this.#wireDescription();
    if (changed.has('open')) this.#syncOpen(changed.get('open') === true);
    else if (changed.has('placement') && this.open) this.#reposition();
  }

  #attach(): void {
    const next = resolveAnchor(this, this.for);
    // Only a found, unchanged anchor means there is nothing to do: `null` equals the initial
    // anchor, so comparing first would swallow the "no anchor" warning.
    if (next && next === this.#anchor) return;
    this.#detach();
    if (!next) {
      if (!this.#warnedNoAnchor) {
        this.#warnedNoAnchor = true;
        devWarn(this, 'No anchor found. Set `for` to an element id or place it after its anchor.');
      }
      return;
    }
    this.#warnedNoAnchor = false;
    this.#anchor = next;
    next.addEventListener('pointerenter', this.#onAnchorEnter);
    next.addEventListener('pointerleave', this.#onAnchorLeave);
    next.addEventListener('focusin', this.#onFocusIn);
    next.addEventListener('focusout', this.#onFocusOut);
    this.#wireDescription();
  }

  #detach(): void {
    const anchor = this.#anchor;
    if (!anchor) return;
    anchor.removeEventListener('pointerenter', this.#onAnchorEnter);
    anchor.removeEventListener('pointerleave', this.#onAnchorLeave);
    anchor.removeEventListener('focusin', this.#onFocusIn);
    anchor.removeEventListener('focusout', this.#onFocusOut);
    this.#unwireDescription?.();
    this.#unwireDescription = undefined;
    this.#anchor = null;
    this.#overAnchor = false;
    this.#focused = false;
  }

  /** Gives the anchor this tooltip's text as its accessible description. */
  #wireDescription(): void {
    this.#unwireDescription?.();
    this.#unwireDescription = undefined;
    const anchor = this.#anchor;
    if (!anchor || !this.describe) return;
    this.#unwireDescription = describeAnchor(this, anchor, () => {
      if (this.#anchor === anchor) this.#wireDescription();
    });
  }

  #clearTimers(): void {
    window.clearTimeout(this.#showTimer);
    window.clearTimeout(this.#hideTimer);
    this.#showTimer = undefined;
    this.#hideTimer = undefined;
  }

  #scheduleHide(): void {
    window.clearTimeout(this.#hideTimer);
    this.#hideTimer = window.setTimeout(() => {
      if (!this.#overAnchor && !this.#overSurface && !this.#focused) this.hide();
    }, CLOSE_GRACE_MS);
  }

  readonly #onAnchorEnter = (event: PointerEvent): void => {
    // Touch users get the visible label and the accessible name instead of a hover hint.
    if (event.pointerType === 'touch') return;
    this.#overAnchor = true;
    window.clearTimeout(this.#hideTimer);
    if (this.open) return;
    const warm = performance.now() - lastClosedAt < WARM_MS;
    window.clearTimeout(this.#showTimer);
    this.#showTimer = window.setTimeout(() => this.show(), warm ? 0 : this.delay);
  };

  readonly #onAnchorLeave = (): void => {
    this.#overAnchor = false;
    window.clearTimeout(this.#showTimer);
    if (this.open) this.#scheduleHide();
  };

  readonly #onSurfaceEnter = (): void => {
    this.#overSurface = true;
    window.clearTimeout(this.#hideTimer);
  };

  readonly #onSurfaceLeave = (): void => {
    this.#overSurface = false;
    if (this.open) this.#scheduleHide();
  };

  readonly #onFocusIn = (event: FocusEvent): void => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || !target.matches(':focus-visible')) return;
    this.#focused = true;
    this.show();
  };

  readonly #onFocusOut = (): void => {
    this.#focused = false;
    window.clearTimeout(this.#showTimer);
    if (this.open) this.#scheduleHide();
  };

  #syncOpen(wasOpen: boolean): void {
    if (this.open) {
      if (current && current !== this) current.hide();
      // This is the registry of the one open tooltip, not an alias used to dodge `this` binding.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      current = this;
      this.#showSurface();
      this.#startOpenWork();
    } else {
      this.#teardownOpen();
      this.#hideSurface(wasOpen);
      if (current === this) current = null;
      if (wasOpen) lastClosedAt = performance.now();
    }
  }

  #showSurface(): void {
    const surface = this.#surface;
    if (!surface) return;
    // Disabling showPopover is how the fixed-position fallback is exercised.
    if (typeof surface.showPopover === 'function' && !surface.matches(':popover-open')) {
      surface.showPopover();
    }
    this.#reposition();
  }

  #hideSurface(wasOpen: boolean): void {
    const surface = this.#surface;
    if (!wasOpen || !surface) return;
    if (typeof surface.hidePopover === 'function' && surface.matches(':popover-open')) {
      surface.hidePopover();
    }
  }

  #reposition(): void {
    const anchor = this.#anchor;
    const surface = this.#surface;
    if (!anchor || !surface || !this.open) return;

    const style = getComputedStyle(this);
    const offset = parseFloat(style.getPropertyValue('--punk-tooltip-offset')) || DEFAULT_OFFSET;
    const size = surface.getBoundingClientRect();
    const result = computePosition({
      anchor: anchor.getBoundingClientRect(),
      surface: { width: size.width, height: size.height },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      placement: placements.includes(this.placement) ? this.placement : 'top',
      offset,
      margin: VIEWPORT_MARGIN,
      rtl: style.direction === 'rtl',
    });
    surface.style.left = `${result.left}px`;
    surface.style.top = `${result.top}px`;
    surface.dataset['side'] = result.side;
  }

  /** Work that exists only while open: nothing here runs, or stays registered, once closed. */
  #startOpenWork(): void {
    this.#teardownOpen();
    const anchor = this.#anchor;
    const surface = this.#surface;
    if (!anchor || !surface) return;

    // Escape closes only the topmost overlay, and focus stays where it is.
    const entry: OverlayEntry = { dismissible: true, close: () => this.hide() };
    let frame = 0;
    const schedule = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.#reposition();
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    observer.observe(surface);
    overlayStack.push(entry);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);

    this.#stopOpenWork = () => {
      overlayStack.remove(entry);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }

  #teardownOpen(): void {
    this.#stopOpenWork?.();
    this.#stopOpenWork = undefined;
  }

  readonly #onSlotChange = (): void => {
    const hasControl = this.querySelector(FOCUSABLE) !== null;
    if (hasControl && !this.#warnedFocusable) {
      devWarn(this, 'Tooltip content must not contain interactive controls.');
    }
    this.#warnedFocusable = hasControl;
  };

  protected override render() {
    return html`
      <div
        part="surface"
        class=${classMap({ surface: true, open: this.open && !isServer })}
        popover="manual"
        @pointerenter=${this.#onSurfaceEnter}
        @pointerleave=${this.#onSurfaceLeave}
      >
        <div part="content" class="content">
          <slot @slotchange=${this.#onSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
