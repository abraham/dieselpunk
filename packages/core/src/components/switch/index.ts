import type { PunkSwitch } from './switch.ts';

export { PunkSwitch } from './switch.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-switch': PunkSwitch;
  }
}
