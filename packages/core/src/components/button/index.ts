import type { PunkButton } from './button.ts';

export { PunkButton } from './button.ts';
export type { ButtonSize, ButtonType, ButtonVariant } from '../../internal/button-base.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-button': PunkButton;
  }
}
