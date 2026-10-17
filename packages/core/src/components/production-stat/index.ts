import type { PunkProductionStat } from './production-stat.ts';

export { PunkProductionStat } from './production-stat.ts';
export type { ProductionStatLayout } from './production-stat.ts';
export type { ProductionTrend } from '../../internal/stat-format.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-production-stat': PunkProductionStat;
  }
}
