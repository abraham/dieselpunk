import type { PunkBadge } from './badge.ts';

export { PunkBadge } from './badge.ts';
export type { BadgeVariant } from './badge.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-badge': PunkBadge;
  }
}
