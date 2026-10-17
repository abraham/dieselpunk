import { css } from 'lit';
import { token } from '../tokens/token.ts';

// Tokens never reference each other (see specs/visual-system.md §1.4), so the gradient is composed here.
const raisedFill = css`linear-gradient(
  to bottom,
  color-mix(
    in srgb,
    ${token('color-panel-raised')} calc(${token('surface-gradient-strength')} * 100%),
    ${token('color-panel')}
  ),
  ${token('color-panel')}
)`;

const outline = css`0 0 0 ${token('border-width')} ${token('color-edge-dark')}`;

/** Outline-only shadow, for surfaces that must read as flat (flat panels, disabled controls). */
export const outlineShadow = outline;

/** `box-shadow` value lists, exported so a control can swap bevels on hover and press. */
export const raisedShadow = css`
  inset 1px 1px 0 ${token('color-edge-light')},
  inset -1px -1px 0 ${token('color-edge-dark')},
  ${outline}
`;

/** The raised bevel plus a half-strength second ring: more edge contrast without new colors. */
export const raisedHoverShadow = css`
  inset 1px 1px 0 ${token('color-edge-light')},
  inset -1px -1px 0 ${token('color-edge-dark')},
  inset 2px 2px 0 color-mix(in srgb, ${token('color-edge-light')} 50%, transparent),
  inset -2px -2px 0 color-mix(in srgb, ${token('color-edge-dark')} 50%, transparent),
  ${outline}
`;

export const insetShadow = css`
  inset 1px 1px 0 ${token('color-edge-dark')},
  inset -1px -1px 0 ${token('color-edge-light')},
  ${outline}
`;

export const raisedSurface = css`
  background: ${raisedFill};
  box-shadow: ${raisedShadow};
`;

export const insetSurface = css`
  background: ${token('color-panel-inset')};
  box-shadow: ${insetShadow};
`;

export const flatSurface = css`
  background: ${token('color-panel')};
  box-shadow: ${outline};
`;
