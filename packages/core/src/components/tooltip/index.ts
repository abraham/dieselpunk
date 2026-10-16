import type { PunkTooltip } from './tooltip.ts';

export { PunkTooltip } from './tooltip.ts';
export type { TooltipPlacement } from './tooltip.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-tooltip': PunkTooltip;
  }
}
