import type { PunkPanel } from './panel.ts';

export { PunkPanel } from './panel.ts';
export type { PanelDensity, PanelVariant } from './panel.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-panel': PunkPanel;
  }
}
