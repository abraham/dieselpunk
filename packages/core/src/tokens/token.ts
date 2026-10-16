import { unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';
import { baseTokens } from './base.ts';
import { defaultThemeName, themes } from './themes.ts';

/** Defaults are the compact density and the default (dark) theme. */
const defaults = { ...baseTokens, ...themes[defaultThemeName].tokens };

export type TokenName = keyof typeof defaults;

export const tokenNames = Object.keys(defaults) as TokenName[];

/**
 * `var()` expression that reads `--punk-<name>` and falls back to the default value, so
 * components render correctly with no global stylesheet and still honor any ancestor override.
 */
export function tokenValue(name: TokenName): string {
  return `var(--punk-${name}, ${defaults[name]})`;
}

/** `tokenValue` as a Lit `css` interpolation. */
export function token(name: TokenName): CSSResult {
  return unsafeCSS(tokenValue(name));
}
