import { msg, str } from '../../internal/localize.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { optionalNumber } from '../../internal/converters.ts';
import { PunkSelectableBase } from '../../internal/selectable-base.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { formatNumber, resolveLang } from '../../utilities/locale.ts';
import { devWarn } from '../../utilities/warn.ts';
import { recipeStyles } from './recipe.styles.ts';

/**
 * A selectable recipe tile: an icon, a name, how long it takes, whether it can be made, and what
 * goes in and comes out. The accessible name is the tile's own text in reading order, so the
 * ingredients and products you slot in are read too. Name it with `name`, not `aria-label`, which
 * would replace that text. Selecting it is yours to manage, or a `punk-slot-grid`'s when it sits in
 * one.
 *
 * @tagname punk-recipe
 *
 * @slot icon - The recipe's artwork, usually an image or SVG.
 * @slot ingredients - What the recipe uses, as text, images with `alt`, or small items.
 * @slot products - What the recipe makes.
 *
 * @csspart recipe - The tile.
 * @csspart icon - The wrapper around the icon slot.
 * @csspart name - The name.
 * @csspart duration - The craft time.
 * @csspart status - The availability: "unavailable", or how many can be made.
 * @csspart ingredients - The wrapper around the ingredients slot.
 * @csspart products - The wrapper around the products slot.
 *
 * @cssprop [--punk-slot-size=40px] - Width and height of the icon.
 *
 * @fires punk-activate - The tile was clicked or activated with Enter or Space. `detail` is `{ value, item }`.
 */
export class PunkRecipe extends PunkSelectableBase {
  readonly #localeWatcher = new LocaleWatcher(this);

  static override styles = recipeStyles;

  static override properties: PropertyDeclarations = {
    name: { reflect: true },
    duration: { converter: optionalNumber, reflect: true },
    available: { type: Boolean, reflect: true },
    craftableCount: { type: Number, attribute: 'craftable-count', reflect: true },
  };

  /** The recipe's name, shown as the tile's title. */
  name = '';

  /** How long one craft takes, in seconds. Leave it unset to show no time. */
  duration: number | undefined;

  /** Whether the recipe can be made now. A recipe that cannot says so in words. */
  available = false;

  /** How many times it can be made with what is on hand. Shown while the recipe is available. */
  craftableCount = 0;

  readonly #presence = new SlotPresence(this, ['icon', 'ingredients', 'products']);
  #problems = new Set<string>();

  /** Effective values after clamping, shared by rendering and the warnings. */
  #resolve() {
    // Removing a number attribute sets its property to null, which means "use the default".
    const rawCount = (this.craftableCount as number | null) ?? 0;
    const count = Number.isFinite(rawCount) ? Math.max(Math.floor(rawCount), 0) : 0;
    const rawDuration = this.duration;
    const duration =
      rawDuration !== undefined && Number.isFinite(rawDuration)
        ? Math.max(rawDuration, 0)
        : undefined;
    return { count, rawCount, duration, rawDuration };
  }

  protected override updated(): void {
    const { count, rawCount, duration, rawDuration } = this.#resolve();
    const found: string[] = [];
    const named =
      this.name !== '' ||
      this.hasAttribute('aria-label') ||
      this.hasAttribute('aria-labelledby') ||
      ['icon', 'ingredients', 'products'].some((slot) => this.#presence.has(slot));
    if (!named) found.push('It has no accessible name. Set `name`, `aria-label`, or add content.');
    if (rawDuration !== undefined && duration !== rawDuration) {
      found.push(
        `\`duration\` is ${rawDuration}; ${duration === undefined ? 'showing no time, because it is not a number' : `using ${duration}, because it must be 0 or more`}.`,
      );
    }
    if (count !== rawCount) {
      found.push(`\`craftable-count\` is ${rawCount}; using ${count}, a whole number from 0.`);
    }
    const current = new Set(found);
    for (const problem of current) if (!this.#problems.has(problem)) devWarn(this, problem);
    this.#problems = current;
  }

  /** Words, not color, say whether it can be made: nothing is added for a recipe that can be. */
  #status(count: number, lang: string | undefined): string {
    if (!this.available)
      return msg('unavailable', {
        id: 'unavailable',
        desc: 'Says that a recipe cannot be made now.',
      });
    if (count === 0) return '';
    const times = formatNumber(count, lang);
    return msg(str`can craft ${times}`, {
      id: 'craftable',
      desc: 'Says how many times a recipe can be made now.',
    });
  }

  protected override render() {
    const { count, duration } = this.#resolve();
    const lang = resolveLang(this);
    const status = this.#status(count, lang);
    const has = (slot: string) => this.#presence.has(slot);
    const handle = this.#presence.handleSlotChange;

    return html`
      <div part="recipe" class="recipe">
        <div part="icon" class="icon" ?hidden=${!has('icon')}>
          <slot name="icon" @slotchange=${handle}></slot>
        </div>
        <div class="body">
          <div class="title">
            ${this.name === '' ? '' : html`<span part="name" class="name">${this.name}</span>`}
            ${
              duration === undefined
                ? ''
                : html`<span part="duration" class="duration"
                    >${formatNumber(duration, lang, {
                      style: 'unit',
                      unit: 'second',
                      unitDisplay: 'short',
                      maximumFractionDigits: 2,
                    })}</span
                  >`
            }
            ${
              status === ''
                ? ''
                : html`<span
                    part="status"
                    class=${classMap({ status: true, unavailable: !this.available })}
                    >${status}</span
                  >`
            }
          </div>
          <div class="flow" ?hidden=${!has('ingredients') && !has('products')}>
            <div part="ingredients" class="ingredients" ?hidden=${!has('ingredients')}>
              <slot name="ingredients" @slotchange=${handle}></slot>
            </div>
            <span
              class="arrow"
              aria-hidden="true"
              ?hidden=${!(has('ingredients') && has('products'))}
            ></span>
            <div part="products" class="products" ?hidden=${!has('products')}>
              <slot name="products" @slotchange=${handle}></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
