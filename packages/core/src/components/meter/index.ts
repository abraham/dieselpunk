import type { PunkMeter } from './meter.ts';

export { PunkMeter } from './meter.ts';
export type { MeterOrientation } from './meter.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-meter': PunkMeter;
  }
}
