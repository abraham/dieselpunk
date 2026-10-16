import type { PunkIconButton } from './icon-button.ts';

export { PunkIconButton } from './icon-button.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-icon-button': PunkIconButton;
  }
}
