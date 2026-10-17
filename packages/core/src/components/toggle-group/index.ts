import type { PunkToggleGroup } from './toggle-group.ts';

export { PunkToggleGroup } from './toggle-group.ts';
export type { ToggleGroupSelection } from './toggle-group.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-toggle-group': PunkToggleGroup;
  }
}
