import { html, nothing } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { PunkFormControl } from '../../internal/form-control.ts';
import type { FormValue } from '../../internal/form-control.ts';
import {
  formatValue,
  keyToValue,
  normalizeRange,
  ratioOf,
  snapValue,
  tickRatios,
  valueFromPointer,
} from '../../internal/slider-math.ts';
import { resolveLang } from '../../utilities/locale.ts';
import { devWarn } from '../../utilities/warn.ts';
import { sliderStyles } from './slider.styles.ts';

// The thumb's width, repeated from `--_thumb` in the styles, so a press does not read it again.
const THUMB = 20;

interface Drag {
  pointerId: number;
  left: number;
  width: number;
  start: number;
  rtl: boolean;
}

/**
 * A slider for a number in a range, in steps. It is `role="slider"` on the host, with
 * `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` written there, and its
 * name is `label`, or `aria-label`. It takes part in a form: it submits `value` under `name`, and
 * a form reset puts `value` back to what the markup said.
 *
 * The value is always inside the range and a whole number of steps from `min`. An inverted or
 * non-finite range is repaired to 0 to 100, and a step that is not above 0 to 1, with one warning.
 * The arrow keys, Home, and End give what a native range gives, in either direction; the Page keys
 * move by a tenth of the range. A press on the track sets the value, and a drag follows the
 * pointer. A drag reads the track once, when the press begins.
 *
 * `aria-valuetext` is the number in the language of the page unless the host sets its own.
 *
 * @tagname punk-slider
 *
 * @csspart header - The row with the label and the value.
 * @csspart label - The label.
 * @csspart value - The value shown beside the label, with `show-value`.
 * @csspart track - The trough.
 * @csspart fill - The part of the trough up to the thumb.
 * @csspart thumb - The thumb.
 * @csspart tick - A mark on the track, with `ticks`.
 *
 * @fires input - The value is changing, from the keyboard or the pointer. Not sent when `value` is set from code.
 * @fires change - A key press or a drag ended with a different value. Not sent when `value` is set from code.
 */
export class PunkSlider extends PunkFormControl {
  static override styles = sliderStyles;

  static override properties: PropertyDeclarations = {
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    step: { type: Number, reflect: true },
    showValue: { type: Boolean, reflect: true, attribute: 'show-value' },
    ticks: { type: Boolean, reflect: true },
    label: { reflect: true },
    value: { type: Number, noAccessor: true },
  };

  /** The smallest value. */
  min = 0;

  /** The largest value. A `max` that is not a whole number of steps from `min` is never reached. */
  max = 100;

  /** The distance between values, above 0. */
  step = 1;

  /** Shows the value beside the label. */
  showValue = false;

  /** Draws a mark at every step, or at every few steps when there are more than 20. */
  ticks = false;

  /** The name of the slider, and the text above it. Without it, use `aria-label`. */
  label = '';

  #value = Number.NaN;
  #drag: Drag | null = null;
  #owned = new Map<string, string>();
  #warnedRange = false;

  constructor() {
    super();
    this.addEventListener('keydown', this.#onKeyDown);
  }

  /** The number, inside the range and on a step. The `value` attribute is the default a form reset goes back to. Without one it is `min`. */
  get value(): number {
    const range = this.#range;
    return Number.isNaN(this.#value) ? range.min : snapValue(this.#value, range);
  }

  set value(next: number) {
    const previous = this.value;
    this.#value = Number(next);
    this.requestUpdate('value', previous);
  }

  get #range() {
    return normalizeRange({ min: this.min, max: this.max, step: this.step });
  }

  protected override formValue(): FormValue {
    return String(this.value);
  }

  protected override resetToDefault(): void {
    const authored = this.getAttribute('value');
    this.#value = authored === null ? Number.NaN : Number(authored);
    this.requestUpdate('value');
  }

  protected override restoreState(state: FormValue): void {
    this.#value = typeof state === 'string' ? Number(state) : Number.NaN;
    this.requestUpdate('value');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncHost();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.#range.repaired && !this.#warnedRange) {
      this.#warnedRange = true;
      devWarn(
        this,
        '`min`, `max`, and `step` are not a usable range, so 0 to 100 in steps of 1 is used where they are not.',
      );
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#syncHost();
    this.warnIfUnnamed(this.resolveName(this.label));
  }

  // Attributes the author did not set, written on the host and taken away again when they go.
  #own(name: string, value: string | null): void {
    const current = this.getAttribute(name);
    const mine = this.#owned.get(name);
    if (current !== null && current !== mine) return;
    if (value === null) {
      this.removeAttribute(name);
      this.#owned.delete(name);
    } else {
      if (current !== value) this.setAttribute(name, value);
      this.#owned.set(name, value);
    }
  }

  #set(name: string, value: string | null): void {
    if (value === null) this.removeAttribute(name);
    else if (this.getAttribute(name) !== value) this.setAttribute(name, value);
  }

  get #lang(): string | undefined {
    return resolveLang(this);
  }

  #syncHost(): void {
    const range = this.#range;
    const value = this.value;
    this.#set('role', 'slider');
    this.#set('aria-orientation', 'horizontal');
    this.#set('aria-valuemin', String(range.min));
    this.#set('aria-valuemax', String(range.max));
    this.#set('aria-valuenow', String(value));
    this.#set('aria-disabled', this.isDisabled ? 'true' : null);
    this.#set('tabindex', this.isDisabled ? null : '0');
    this.#own('aria-valuetext', formatValue(value, this.#lang));
    this.#own('aria-label', this.label.trim() || null);
  }

  /** Sets the value for the user, and tells the page. Returns whether it changed. */
  #change(next: number): boolean {
    if (next === this.value) return false;
    this.value = next;
    this.commit();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    return true;
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== this || this.isDisabled) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = keyToValue(event.key, this.value, this.#range, this.matches(':dir(rtl)'));
    if (next === null) return;
    event.preventDefault();
    if (this.#change(next)) this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (this.isDisabled || event.button !== 0 || this.#drag) return;
    const area = event.currentTarget as HTMLElement;
    // The one layout read of a drag: every move after this is arithmetic on it.
    const rect = area.getBoundingClientRect();
    event.preventDefault();
    this.focus({ preventScroll: true });
    area.setPointerCapture(event.pointerId);
    this.#drag = {
      pointerId: event.pointerId,
      left: rect.left + THUMB / 2,
      width: rect.width - THUMB,
      start: this.value,
      rtl: this.matches(':dir(rtl)'),
    };
    this.#move(event);
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (this.#drag?.pointerId === event.pointerId) this.#move(event);
  };

  readonly #onPointerEnd = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#drag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    if (this.value !== drag.start) this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  #move(event: PointerEvent): void {
    const drag = this.#drag;
    if (!drag) return;
    this.#change(
      valueFromPointer(
        event.clientX,
        { left: drag.left, width: drag.width },
        this.#range,
        drag.rtl,
      ),
    );
  }

  protected override render() {
    const range = this.#range;
    const value = this.value;
    const text = formatValue(value, this.#lang);
    return html`
      <div class=${classMap({ slider: true, disabled: this.isDisabled })}>
        <div part="header" class="header" ?hidden=${!this.label && !this.showValue}>
          <span part="label" class="label" ?hidden=${!this.label}>${this.label}</span>
          <span part="value" class="value" aria-hidden="true" ?hidden=${!this.showValue}
            >${text}</span
          >
        </div>
        <div
          class=${classMap({ area: true, 'has-ticks': this.ticks })}
          style="--_ratio: ${ratioOf(value, range)}"
          @pointerdown=${this.#onPointerDown}
          @pointermove=${this.#onPointerMove}
          @pointerup=${this.#onPointerEnd}
          @pointercancel=${this.#onPointerEnd}
        >
          <div part="track" class="track"><div part="fill" class="fill"></div></div>
          ${
            this.ticks
              ? html`<div class="ticks" aria-hidden="true">
                  ${tickRatios(range).map(
                    (at) => html`<span part="tick" class="tick" style="--_at: ${at}"></span>`,
                  )}
                </div>`
              : nothing
          }
          <div part="thumb" class="thumb"></div>
        </div>
      </div>
    `;
  }
}
