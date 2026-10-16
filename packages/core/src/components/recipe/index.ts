import type { PunkRecipe } from './recipe.ts';

export { PunkRecipe } from './recipe.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-recipe': PunkRecipe;
  }
}
