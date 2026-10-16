import { css } from 'lit';
import { token } from '../tokens/token.ts';

// Tokens never reference each other (see SPEC-PHASE-1 §6.4), so the gradient is composed here.
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

export const raisedSurface = css`
  background: ${raisedFill};
  box-shadow:
    inset 1px 1px 0 ${token('color-edge-light')},
    inset -1px -1px 0 ${token('color-edge-dark')},
    ${outline};
`;

export const insetSurface = css`
  background: ${token('color-panel-inset')};
  box-shadow:
    inset 1px 1px 0 ${token('color-edge-dark')},
    inset -1px -1px 0 ${token('color-edge-light')},
    ${outline};
`;

export const flatSurface = css`
  background: ${token('color-panel')};
  box-shadow: ${outline};
`;
