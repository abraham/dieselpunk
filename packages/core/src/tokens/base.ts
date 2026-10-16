/** Token name (without the `--punk-` prefix) to CSS value. */
export type TokenMap = Readonly<Record<string, string>>;

/** Non-color tokens at compact density, the default. */
export const baseTokens = {
  'font-family': '"Chakra Petch", "Trebuchet MS", sans-serif',
  'font-mono': '"IBM Plex Mono", "Courier New", monospace',

  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',

  'density-scale': '1',

  'control-height-sm': '28px',
  'control-height-md': '36px',
  'control-height-lg': '44px',
  'slot-size': '40px',

  'icon-size-sm': '16px',
  'icon-size-md': '20px',
  'icon-size-lg': '24px',

  'border-width': '2px',
  radius: '2px',

  'duration-fast': '80ms',
  'duration-normal': '140ms',

  'z-overlay': '1000',
  'z-modal': '1100',
  'z-toast': '1200',
  'tooltip-max-width': '320px',
} as const satisfies TokenMap;
