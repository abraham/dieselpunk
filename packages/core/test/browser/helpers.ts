import { addStyles } from '@dieselpunk/testing/browser';
import { renderThemesCss, renderTokensCss } from '../../scripts/render-css.ts';

export { cleanup, focusWithKeyboard, rgb, track } from '@dieselpunk/testing/browser';

/** Loads the generated tokens.css and themes.css into the page. */
export function addStylesheets(): void {
  addStyles(renderTokensCss(), renderThemesCss());
}
