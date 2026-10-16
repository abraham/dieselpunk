import type { PunkCluster } from './cluster.ts';

export { PunkCluster } from './cluster.ts';
export type { ClusterAlign, ClusterGap, ClusterJustify } from './cluster.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-cluster': PunkCluster;
  }
}
