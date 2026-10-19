import { css } from 'lit';
import { token } from '../tokens/token.ts';

/**
 * The inset bevel with a warm outline 1px wider than the idle one, as a selected slot's ring is, so
 * a selected, current, or pressed control differs by shape as well as color (product.md §4). Its own
 * module, so only the controls that use it pay for it.
 */
export const selectedShadow = css`
  inset 1px 1px 0 ${token('color-edge-dark')},
  inset -1px -1px 0 ${token('color-edge-light')},
  0 0 0 calc(${token('border-width')} + 1px) ${token('color-accent')}
`;
