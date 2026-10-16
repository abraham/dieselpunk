import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { PunkElement } from '../../internal/punk-element.ts';
import type { LayoutGap } from '../../styles/gap.ts';
import { clusterStyles } from './cluster.styles.ts';

export type ClusterJustify = 'start' | 'center' | 'end' | 'between';
export type ClusterAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
export type { LayoutGap as ClusterGap } from '../../styles/gap.ts';

/**
 * Children in a row that wraps, with even spacing. It has no role, no parts, and no industrial
 * decoration. Children may shrink below their content, so a long word breaks and nothing forces
 * horizontal scrolling.
 *
 * @tagname punk-cluster
 *
 * @slot - The children.
 *
 * @cssprop [--punk-cluster-gap=var(--punk-space-2)] - The space between children. It overrides `gap`.
 */
export class PunkCluster extends PunkElement {
  static override styles = clusterStyles;

  /** `0` for none, or `1` to `5` for a spacing token, which follows density. Unknown values use `2`. */
  @property({ reflect: true }) gap: LayoutGap = '2';

  /** How a row is spread along the line. Unknown values use `start`. */
  @property({ reflect: true }) justify: ClusterJustify = 'start';

  /** How children line up across the line. Unknown values use `center`. */
  @property({ reflect: true }) align: ClusterAlign = 'center';

  protected override render() {
    return html`<slot></slot>`;
  }
}
