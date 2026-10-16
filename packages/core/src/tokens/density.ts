import { baseTokens } from './base.ts';
import type { TokenMap } from './base.ts';

export const densityModes = ['compact', 'low'] as const;
export type DensityMode = (typeof densityModes)[number];

/** Tokens that change with density; roughly 20-25% larger than compact. */
const low = {
  'space-1': '5px',
  'space-2': '10px',
  'space-3': '15px',
  'space-4': '20px',
  'space-5': '30px',
  'density-scale': '1.25',
  'control-height-sm': '34px',
  'control-height-md': '44px',
  'control-height-lg': '54px',
  'slot-size': '50px',
} as const satisfies TokenMap;

const compact: Record<string, string> = {};
for (const name of Object.keys(low)) {
  const value = (baseTokens as TokenMap)[name];
  if (value === undefined) {
    throw new Error(`Density token "${name}" has no compact value in baseTokens`);
  }
  compact[name] = value;
}

export const density = {
  compact,
  low,
} as const satisfies Record<DensityMode, TokenMap>;
