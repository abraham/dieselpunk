import { html, isServer } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { devWarn } from '../../utilities/warn.ts';
import { PunkStep, position } from './step.ts';
import { stepsStyles } from './steps.styles.ts';

/**
 * Progress through a task of several steps, such as a setup wizard: an ordered list named
 * "Steps" (or `label`) of `punk-step` elements. `current` is the 1-based number of the step the
 * user is on; the steps before it are completed and the ones after it are not started. `0` is
 * before the first step, and a number past the last means every step is completed. The steps
 * wrap onto more lines rather than scroll.
 *
 * It is a record of progress, not navigation: the steps are not links or buttons, and the
 * application moves `current`.
 *
 * @tagname punk-steps
 *
 * @slot - The `punk-step` elements, in order.
 *
 * @csspart list - The ordered list of steps.
 */
export class PunkSteps extends PunkElement {
  static override styles = stepsStyles;

  /** The name of the list. Without it, the localized "Steps". */
  @property({ reflect: true }) label = '';

  /** The 1-based number of the current step. `0` is before the first, and past the last is done. */
  @property({ type: Number, reflect: true }) current = 1;

  readonly #localeWatcher = new LocaleWatcher(this);
  #steps: PunkStep[] = [];
  #warnedStray = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const step of this.#steps) step[position] = null;
    this.#steps = [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#sync();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('current')) this.#sync();
  }

  #sync(): void {
    // The server has no children (specs/ssr.md §3).
    if (isServer) return;
    const children = [...this.children];
    const found = children.filter((child): child is PunkStep => child instanceof PunkStep);
    const stray = found.length !== children.length;
    if (stray && !this.#warnedStray)
      devWarn(this, 'It contains elements that are not `punk-step`.');
    this.#warnedStray = stray;
    for (const step of this.#steps) if (!found.includes(step)) step[position] = null;
    this.#steps = found;
    const current = Number.isFinite(this.current) ? Math.floor(this.current) - 1 : 0;
    found.forEach((step, index) => {
      const state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
      const now = step[position];
      if (now?.index !== index || now.state !== state) step[position] = { index, state };
    });
  }

  protected override render() {
    const name =
      this.label ||
      msg('Steps', { id: 'steps', desc: 'The name of a list of the steps of a task.' });
    return html`<ol part="list" class="list" aria-label=${name}>
      <slot @slotchange=${this.#sync}></slot>
    </ol>`;
  }
}
