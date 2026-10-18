import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import {
  keyToValue,
  normalizeRange,
  snapValue,
  valueFromPointer,
} from '../../internal/slider-math.ts';
import type { NormalizedRange } from '../../internal/slider-math.ts';
import { devWarn } from '../../utilities/warn.ts';
import { splitterStyles } from './splitter.styles.ts';

export type SplitterOrientation = 'horizontal' | 'vertical';

export interface PunkSplitChangeDetail {
  value: number;
}

declare global {
  interface HTMLElementEventMap {
    'punk-split-change': CustomEvent<PunkSplitChangeDetail>;
  }
}

interface Drag {
  pointerId: number;
  start: number;
  length: number;
  rtl: boolean;
}

/**
 * Two panes with a divider between them that the user drags, or moves with the keyboard: the
 * APG window splitter. The divider is a focusable `separator` whose value is the share of the
 * space, from 0 to 100, that the start pane takes. Side by side (`horizontal`, the default) the
 * Left and Right keys move it, and stacked (`vertical`) Up and Down do; Home and End go to `min`
 * and `max`, and Enter collapses the start pane to `min` and restores it. Stacked panes need a
 * height on the host.
 *
 * @tagname punk-splitter
 *
 * @slot start - The first pane: the left one side by side (the right one in right-to-left), or the top one stacked.
 * @slot end - The second pane.
 *
 * @csspart start - The wrapper around the start pane.
 * @csspart separator - The divider.
 * @csspart end - The wrapper around the end pane.
 *
 * @fires punk-split-change - The user moved the divider. `detail` is `{ value }`. Sent for each change during a drag.
 */
export class PunkSplitter extends PunkElement {
  static override styles = splitterStyles;

  /** The share of the space, from `min` to `max`, that the start pane takes. */
  @property({ type: Number, reflect: true }) value = 50;

  /** The smallest share the start pane can have. */
  @property({ type: Number, reflect: true }) min = 0;

  /** The largest share the start pane can have. */
  @property({ type: Number, reflect: true }) max = 100;

  /** How far one arrow key moves the divider. */
  @property({ type: Number, reflect: true }) step = 5;

  /** `horizontal` puts the panes side by side, and `vertical` stacks them. Unknown values are `horizontal`. */
  @property({ reflect: true }) orientation: SplitterOrientation = 'horizontal';

  /** The name of the divider. Without it, the localized "Resize". */
  @property({ reflect: true }) label = '';

  readonly #localeWatcher = new LocaleWatcher(this);
  #drag: Drag | null = null;
  #restore: number | null = null;
  #warnedRange = false;

  get #range(): NormalizedRange {
    return normalizeRange({ min: this.min, max: this.max, step: this.step });
  }

  get #vertical(): boolean {
    return this.orientation === 'vertical';
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('min') || changed.has('max') || changed.has('step')) {
      const repaired = this.#range.repaired;
      if (repaired && !this.#warnedRange) {
        devWarn(
          this,
          'Its `min` is above its `max`, or its `step` is not above 0, so 0 to 100 in steps of 1 is used.',
        );
      }
      this.#warnedRange = repaired;
    }
  }

  /** The value clamped to the range, as the divider shows it. */
  get #current(): number {
    const { min, max } = this.#range;
    return Number.isFinite(this.value) ? Math.min(max, Math.max(min, this.value)) : (min + max) / 2;
  }

  #set(next: number): void {
    if (next === this.#current) return;
    this.value = next;
    this.emit<PunkSplitChangeDetail>('punk-split-change', { value: next });
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const range = this.#range;
    if (event.key === 'Enter') {
      event.preventDefault();
      const current = this.#current;
      if (current > range.min) {
        this.#restore = current;
        this.#set(range.min);
      } else {
        this.#set(this.#restore ?? snapValue((range.min + range.max) / 2, range));
        this.#restore = null;
      }
      return;
    }
    // Side by side only Left and Right move the divider, and stacked only Up and Down, which
    // move it down and up as the arrows point.
    const along = this.#vertical
      ? { ArrowDown: 'ArrowRight', ArrowUp: 'ArrowLeft' }[event.key]
      : event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        ? event.key
        : undefined;
    const key =
      along ?? (['Home', 'End', 'PageUp', 'PageDown'].includes(event.key) ? event.key : null);
    if (!key) return;
    const next = keyToValue(
      key,
      this.#current,
      range,
      !this.#vertical && this.matches(':dir(rtl)'),
    );
    if (next === null) return;
    event.preventDefault();
    this.#set(next);
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag) return;
    const bar = event.currentTarget as HTMLElement;
    // The one layout read of a drag: every move after this is arithmetic on it.
    const box = (bar.parentElement as HTMLElement).getBoundingClientRect();
    const size = this.#vertical ? bar.offsetHeight : bar.offsetWidth;
    event.preventDefault();
    bar.focus({ preventScroll: true });
    bar.setPointerCapture(event.pointerId);
    this.#drag = {
      pointerId: event.pointerId,
      start: (this.#vertical ? box.top : box.left) + size / 2,
      length: (this.#vertical ? box.height : box.width) - size,
      rtl: !this.#vertical && this.matches(':dir(rtl)'),
    };
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { min, max } = this.#range;
    // A pointer is not held to `step`, so the divider follows it to a tenth of a percent.
    const free = { min, max, step: 0.1 };
    const position = this.#vertical ? event.clientY : event.clientX;
    this.#set(valueFromPointer(position, { left: drag.start, width: drag.length }, free, drag.rtl));
  };

  readonly #onPointerEnd = (event: PointerEvent): void => {
    if (this.#drag?.pointerId !== event.pointerId) return;
    this.#drag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  };

  protected override render() {
    const { min, max } = this.#range;
    const value = this.#current;
    const name =
      this.label ||
      msg('Resize', {
        id: 'resizePanes',
        desc: 'The name of the divider between two panes that the user can move.',
      });
    return html`<div
      class=${classMap({ split: true, vertical: this.#vertical })}
      style=${styleMap({ '--_ratio': String(value / 100) })}
    >
      <div part="start" class="pane" id="start"><slot name="start"></slot></div>
      <div
        part="separator"
        class="separator"
        role="separator"
        tabindex="0"
        aria-label=${name}
        aria-controls="start"
        aria-orientation=${this.#vertical ? 'horizontal' : 'vertical'}
        aria-valuenow=${value}
        aria-valuemin=${min}
        aria-valuemax=${max}
        @keydown=${this.#onKeyDown}
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerEnd}
        @pointercancel=${this.#onPointerEnd}
        @lostpointercapture=${this.#onPointerEnd}
      >
        <span class="grip" aria-hidden="true"></span>
      </div>
      <div part="end" class="pane"><slot name="end"></slot></div>
    </div>`;
  }
}
