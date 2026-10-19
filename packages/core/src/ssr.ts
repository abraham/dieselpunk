// Style sharing for server rendering (specs/ssr.md §6): each style sheet is written once per
// render, and every later shadow root names the sheets it adopts. Core imports nothing from Lit SSR;
// the application passes its `LitElementRenderer` in.

// A mixin's base class must have a constructor that takes any arguments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementRendererClass = new (...args: any[]) => { renderShadow(renderInfo: never): unknown };

const ids = new Map<string, string>();

// The same text gets the same id in every render and process, so separately rendered parts of one
// page agree. FNV-1a, 64 bits.
function sheetId(cssText: string): string {
  let id = ids.get(cssText);
  if (id === undefined) {
    let hash = 0xcbf29ce484222325n;
    for (let index = 0; index < cssText.length; index++) {
      hash = BigInt.asUintN(64, (hash ^ BigInt(cssText.charCodeAt(index))) * 0x100000001b3n);
    }
    id = hash.toString(36);
    ids.set(cssText, id);
  }
  return id;
}

/**
 * Extends Lit SSR's `LitElementRenderer` so a render writes each style sheet once. A shadow root
 * whose sheets were all written earlier in the same render holds only a `<punk-styles>` naming
 * them; any other holds its sheets as `<style>` elements, which paint without script. The page
 * must run `sharedStylesScript` in its `<head>`.
 *
 * ```ts
 * import { LitElementRenderer, render } from '@lit-labs/ssr';
 * import { shareStyles } from '@dieselpunk/core/ssr.js';
 *
 * render(page, { elementRenderers: [shareStyles(LitElementRenderer)] });
 * ```
 */
export function shareStyles<T extends ElementRendererClass>(Base: T): T {
  const written = new WeakMap<object, Set<string>>();
  return class SharedStylesRenderer extends Base {
    override renderShadow(renderInfo: never): unknown {
      const result = super.renderShadow(renderInfo);
      // Lit SSR writes `<style>`, each sheet's text, and `</style>`; anything else stays as it is.
      if (!Array.isArray(result) || result[0] !== '<style>') return result;
      const end = result.indexOf('</style>');
      const sheets = result.slice(1, end);
      if (end === -1 || !sheets.every((sheet) => typeof sheet === 'string')) return result;

      // One set per render: Lit SSR passes the same render info to every element of a render.
      let seen = written.get(renderInfo);
      if (!seen) written.set(renderInfo, (seen = new Set()));
      const sheetIds = sheets.map(sheetId);
      const known = sheetIds.every((id) => seen.has(id));
      for (const id of sheetIds) seen.add(id);
      // A root never mixes written and adopted sheets, which would change their cascade order.
      const inline = known
        ? ''
        : sheets
            .map((sheet, index) => `<style data-punk-sheet="${sheetIds[index]}">${sheet}</style>`)
            .join('');
      return [
        `${inline}<punk-styles sheets="${sheetIds.join(' ')}"></punk-styles>`,
        ...result.slice(end + 1),
      ];
    }
  };
}

// Runs in the page, as the source of `sharedStylesScript`, so it uses nothing from outside itself.
function defineSharedStyles(): void {
  if (customElements.get('punk-styles')) return;
  const sheets = new Map<string, CSSStyleSheet>();
  customElements.define(
    'punk-styles',
    class extends HTMLElement {
      connectedCallback(): void {
        const root = this.getRootNode();
        if (!(root instanceof ShadowRoot)) return;
        const written = root.querySelectorAll<HTMLStyleElement>('style[data-punk-sheet]');
        for (const style of written) {
          const id = style.getAttribute('data-punk-sheet') ?? '';
          if (sheets.has(id)) continue;
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(style.textContent ?? '');
          sheets.set(id, sheet);
        }
        const adopted = (this.getAttribute('sheets') ?? '')
          .split(' ')
          .filter(Boolean)
          .map((id) => sheets.get(id));
        if (adopted.includes(undefined)) return;
        root.adoptedStyleSheets = adopted as CSSStyleSheet[];
        for (const style of written) style.remove();
        this.remove();
      }
    },
  );
}

/**
 * The script a page runs in its `<head>`, before any server-rendered element, when it was rendered
 * with `shareStyles()`: it defines `<punk-styles>`, which adopts the named sheets into its shadow
 * root. Inline it, and add its hash to a Content Security Policy's `script-src`.
 */
export const sharedStylesScript = `(${defineSharedStyles.toString()})();`.replace(/\s+/g, ' ');
