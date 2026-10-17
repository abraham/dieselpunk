import type { TokenMap } from './base.ts';
import { darkTokens as dark } from './default-theme.ts';

export const themeNames = ['dark', 'light', 'high-contrast', 'reduced-texture'] as const;
export type ThemeName = (typeof themeNames)[number];

export interface Theme {
  colorScheme: 'dark' | 'light';
  tokens: TokenMap;
}

/** Theme used on `:root` when no `data-punk-theme` is set. */
export const defaultThemeName = 'dark' satisfies ThemeName;

/** Theme that `data-punk-theme="auto"` selects under `prefers-color-scheme: light`. */
export const autoLightThemeName = 'light' satisfies ThemeName;

const light = {
  'color-canvas': '#d8d5ca',
  'color-panel': '#bfbcb0',
  'color-panel-raised': '#d0cdc2',
  'color-panel-inset': '#aeab9f',
  'color-edge-light': '#ece9de',
  'color-edge-dark': '#4a4840',
  'color-control-edge': '#4a4840',
  'color-text': '#1f201d',
  'color-text-muted': '#34342f',
  'color-accent': '#7d4000',
  'color-accent-strong': '#6b3500',
  'color-accent-text': '#ffffff',
  'color-warning': '#6e5200',
  'color-danger': '#9a2b19',
  'color-danger-text': '#ffffff',
  'color-success': '#35591a',
  'color-info': '#17566f',
  'color-focus': '#1d1e1c',
  'color-focus-inner': '#f2cf44',
  'color-disabled-fill': '#b5b2a6',
  'color-disabled-text': '#6b6960',
  'surface-gradient-strength': '1',
  'texture-opacity': '0.06',
} as const satisfies Record<keyof typeof dark, string>;

const highContrast = {
  'color-canvas': '#000000',
  'color-panel': '#0d0d0d',
  'color-panel-raised': '#1a1a1a',
  'color-panel-inset': '#000000',
  'color-edge-light': '#ffffff',
  'color-edge-dark': '#ffffff',
  'color-control-edge': '#ffffff',
  'color-text': '#ffffff',
  'color-text-muted': '#e6e6e6',
  'color-accent': '#ffd400',
  'color-accent-strong': '#ffee58',
  'color-accent-text': '#000000',
  'color-warning': '#ffe600',
  'color-danger': '#ff6b5a',
  'color-danger-text': '#000000',
  'color-success': '#5fe05f',
  'color-info': '#5fd0ff',
  'color-focus': '#ffffff',
  'color-focus-inner': '#000000',
  'color-disabled-fill': '#1a1a1a',
  'color-disabled-text': '#9a9a9a',
  'surface-gradient-strength': '0',
  'texture-opacity': '0',
} as const satisfies Record<keyof typeof dark, string>;

export const themes = {
  dark: { colorScheme: 'dark', tokens: dark },
  light: { colorScheme: 'light', tokens: light },
  'high-contrast': { colorScheme: 'dark', tokens: highContrast },
  'reduced-texture': {
    colorScheme: 'dark',
    tokens: { ...dark, 'surface-gradient-strength': '0', 'texture-opacity': '0' },
  },
} as const satisfies Record<ThemeName, Theme>;
