import type { PunkKbd } from './kbd.ts';

export { PunkKbd } from './kbd.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-kbd': PunkKbd;
  }
}
