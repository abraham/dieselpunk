import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { PunkElement } from '../../internal/punk-element.ts';
import { devWarn } from '../../utilities/warn.ts';
import { descriptionListStyles } from './description-list.styles.ts';

export type DescriptionListVariant = 'plain' | 'inset';

/**
 * Label and value pairs, for details and specification sheets. The application writes native
 * `<dt>` and `<dd>` elements as its children, and the element puts them in a `<dl>` in its
 * shadow tree, so they keep their term and definition semantics. Each term sits beside its
 * values, which are in tabular figures, and above them when the element is narrow. A term may
 * have several values, and several terms may share one. `variant="inset"` sets the pairs in a
 * recessed well with a rule between rows, as a table's are.
 *
 * @tagname punk-description-list
 *
 * @slot - `<dt>` and `<dd>` elements, in order. Anything else, or a `<dd>` before the first
 *   `<dt>`, warns in development.
 *
 * @csspart list - The `<dl>` around the pairs.
 */
export class PunkDescriptionList extends PunkElement {
  static override styles = descriptionListStyles;

  static override properties: PropertyDeclarations = {
    variant: { reflect: true },
  };

  /** `plain` has no surface; `inset` is a recessed well with rules between rows. Unknown values use `plain`. */
  variant: DescriptionListVariant = 'plain';

  #warned = '';

  #check(): void {
    const children = [...this.children];
    const stray = children.find((child) => child.localName !== 'dt' && child.localName !== 'dd');
    const problem = stray
      ? `Its children must be <dt> and <dd> elements, and a <${stray.localName}> is not.`
      : children[0]?.localName === 'dd'
        ? 'It starts with a <dd>, which has no term.'
        : '';
    if (problem && problem !== this.#warned) devWarn(this, problem);
    this.#warned = problem;
  }

  protected override render() {
    return html`<dl part="list"><slot @slotchange=${this.#check}></slot></dl>`;
  }
}
