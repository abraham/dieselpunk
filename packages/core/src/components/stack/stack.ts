import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { PunkElement } from '../../internal/punk-element.ts';
import type { LayoutGap } from '../../styles/gap.ts';
import { stackStyles } from './stack.styles.ts';

export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type { LayoutGap as StackGap } from '../../styles/gap.ts';

/**
 * Children in a column with even spacing. It has no role, no parts, and no industrial decoration.
 * The host is the flex container, and children may shrink below their content, so a long word
 * breaks and nothing forces horizontal scrolling.
 *
 * @tagname punk-stack
 *
 * @slot - The children.
 *
 * @cssprop [--punk-stack-gap=var(--punk-space-2)] - The space between children. It overrides `gap`.
 */
export class PunkStack extends PunkElement {
  static override styles = stackStyles;

  /** `0` for none, or `1` to `5` for a spacing token, which follows density. Unknown values use `2`. */
  @property({ reflect: true }) gap: LayoutGap = '2';

  /** Where children sit across the column. Unknown values use `stretch`. */
  @property({ reflect: true }) align: StackAlign = 'stretch';

  protected override render() {
    return html`<slot></slot>`;
  }
}
