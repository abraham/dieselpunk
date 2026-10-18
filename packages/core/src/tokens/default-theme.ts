import type { TokenMap } from './base.ts';

// The default (dark) palette on its own, so components that only need fallback values can import it
// without pulling in every other theme. Node-run: erasable syntax only.
export const darkTokens = {
  'color-canvas': '#1d1e1c',
  'color-panel': '#41433f',
  'color-panel-raised': '#565954',
  'color-panel-inset': '#292b28',
  'color-edge-light': '#747870',
  'color-edge-dark': '#171815',
  'color-control-edge': '#b8b5ac',
  'color-text': '#f0ead8',
  'color-text-muted': '#b8b4a7',
  'color-accent': '#f59b23',
  'color-accent-strong': '#ffb52e',
  'color-accent-text': '#1d1e1c',
  'color-warning': '#f2cf44',
  'color-danger': '#d9573f',
  'color-danger-text': '#0e0d0b',
  'color-success': '#7fa84f',
  'color-success-text': '#0e0d0b',
  'color-info': '#65a9c2',
  'color-focus': '#f2cf44',
  'color-focus-inner': '#1d1e1c',
  'color-disabled-fill': '#34362f',
  'color-disabled-text': '#8e8b80',
  'surface-gradient-strength': '1',
  'texture-opacity': '0.06',
} as const satisfies TokenMap;
