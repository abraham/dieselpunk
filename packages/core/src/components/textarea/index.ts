import type { PunkTextarea } from './textarea.ts';

export { PunkTextarea } from './textarea.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-textarea': PunkTextarea;
  }
}
