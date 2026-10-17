import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { themeNames, themes } from '../../src/tokens/themes.ts';
import { addStylesheets, cleanup, track } from './helpers.ts';
import { buildGallery, galleryCss } from './fixtures/gallery.ts';
import { ratio, toHex } from './receptacle-helpers.ts';

// specs/visual-system.md §4.2: the token gate cannot see which surface a text node lands on, so this resolves
// the background behind every text node and glyph of the stat and the row, as a person sees it,
// and requires the inset plate or the status lens, which are the same `panel-inset`.

beforeEach(() => {
  addStylesheets();
  const style = document.createElement('style');
  style.textContent = galleryCss;
  track(style, document.head);
});

afterEach(cleanup);

const densities = ['compact', 'low'] as const;
const GLYPHS = '.glyph, .arrow, .shape';

/** The next element up the flattened tree, through slots and shadow roots. */
function parentOf(node: Node): Element | null {
  const slot = (node as Text | Element).assignedSlot;
  if (slot) return slot;
  const parent = node.parentNode;
  if (parent instanceof ShadowRoot) return parent.host;
  return parent instanceof Element ? parent : null;
}

function backdropOf(start: Element | null, canvas: string): string {
  for (let element = start; element; element = parentOf(element)) {
    const color = getComputedStyle(element).backgroundColor;
    if (!/rgba?\([^)]*,\s*0\)|transparent/.test(color)) return toHex(color);
  }
  return canvas;
}

const rendered = (element: Element) => {
  const box = element.getBoundingClientRect();
  return box.width > 1 && box.height > 1;
};

// A ring is drawn as a border on a transparent fill.
function glyphColor(node: Element): string {
  const style = getComputedStyle(node);
  const filled = !/rgba?\([^)]*,\s*0\)|transparent/.test(style.backgroundColor);
  return toHex(filled ? style.backgroundColor : style.borderTopColor);
}

interface Found {
  what: string;
  foreground: string;
  backdrop: string;
  glyph: boolean;
}

/** Every text node and glyph below `host`, in the shadow tree and the slotted content. */
function surfaces(host: Element, canvas: string): Found[] {
  const found: Found[] = [];
  const visit = (node: Node): void => {
    if (node instanceof Text) {
      const parent = parentOf(node);
      if (!parent || !/\p{L}|\p{N}/u.test(node.data) || !rendered(parent)) return;
      found.push({
        what: `"${node.data.trim()}"`,
        foreground: toHex(getComputedStyle(parent).color),
        backdrop: backdropOf(parent, canvas),
        glyph: false,
      });
      return;
    }
    if (node instanceof Element) {
      // The remove button's X is on the button's own raised face, as the window's and the toast's are.
      if (node.getAttribute('part') === 'remove-button') return;
      if (node.matches(GLYPHS) && rendered(node)) {
        found.push({
          what: `<${node.className}>`,
          foreground: glyphColor(node),
          backdrop: backdropOf(parentOf(node), canvas),
          glyph: true,
        });
        return;
      }
      if (node instanceof HTMLSlotElement) {
        for (const assigned of node.assignedNodes()) visit(assigned);
        return;
      }
      if (node.shadowRoot) node.shadowRoot.childNodes.forEach(visit);
      else node.childNodes.forEach(visit);
      // A slot's fallback content is in the slot, and is visited with the slot's children.
      return;
    }
    node.childNodes.forEach(visit);
  };
  for (const node of host.shadowRoot?.childNodes ?? []) visit(node);
  return found;
}

async function mountGroup(theme: string, density: string, variant: 'short' | 'long' = 'short') {
  const stage = document.createElement('div');
  stage.setAttribute('data-punk-theme', theme);
  stage.setAttribute('data-punk-density', density);
  stage.style.cssText = 'background: var(--punk-color-canvas); color: var(--punk-color-text);';
  stage.append(buildGallery(variant, ['production-stat', 'connection-row']));
  track(stage);
  const hosts = [...stage.querySelectorAll('punk-production-stat, punk-connection-row')];
  await Promise.all(
    hosts.map(
      (host) => (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete,
    ),
  );
  return { stage, hosts };
}

describe('the surface behind the stat and the row', () => {
  for (const theme of themeNames) {
    for (const density of densities) {
      it(`is panel-inset behind every text node and glyph, and meets contrast: ${theme}, ${density}`, async () => {
        const tokens = themes[theme].tokens;
        const inset = tokens['color-panel-inset'] as string;
        const canvas = tokens['color-canvas'] as string;
        const { hosts } = await mountGroup(theme, density);
        const wrong: string[] = [];
        let texts = 0;
        let glyphs = 0;
        for (const host of hosts) {
          for (const item of surfaces(host, canvas)) {
            if (item.glyph) glyphs++;
            else texts++;
            const where = `${host.localName} ${item.what}`;
            if (item.backdrop !== inset)
              wrong.push(`${where} is on ${item.backdrop}, not ${inset}`);
            const needed = item.glyph ? 3 : theme === 'high-contrast' ? 7 : 4.5;
            const actual = ratio(item.foreground, item.backdrop);
            if (actual < needed)
              wrong.push(`${where} is ${actual.toFixed(2)}:1, needs ${needed}:1`);
          }
        }
        expect(wrong).toEqual([]);
        // A walk that found nothing would pass for the wrong reason.
        expect(texts).toBeGreaterThan(60);
        expect(glyphs).toBeGreaterThan(20);
      });
    }
  }

  it('walks the slotted text of a row and the status shape on its lens', async () => {
    const { hosts } = await mountGroup('dark', 'compact');
    const row = hosts.find(
      (host) => host.localName === 'punk-connection-row' && host.querySelector('[slot="status"]'),
    );
    const found = surfaces(row as Element, themes.dark.tokens['color-canvas'] as string);
    expect(found.map((item) => item.what)).toEqual(
      expect.arrayContaining(['"Speed module"', '"Precision gear"']),
    );
    expect(found.some((item) => item.glyph && item.what === '<shape>')).toBe(true);
  });

  it('reports text that is not on the plate, so a clean result means something', async () => {
    const { hosts } = await mountGroup('dark', 'compact');
    const stat = hosts.find((host) => host.localName === 'punk-production-stat') as Element;
    const canvas = themes.dark.tokens['color-canvas'] as string;
    expect(
      surfaces(stat, canvas).every(
        (item) => item.backdrop === themes.dark.tokens['color-panel-inset'],
      ),
    ).toBe(true);
    // The rule that draws the plate, taken away.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('.readout { background: none !important; }');
    stat.shadowRoot?.adoptedStyleSheets.push(sheet);
    const moved = surfaces(stat, canvas).filter(
      (item) => item.backdrop !== themes.dark.tokens['color-panel-inset'],
    );
    expect(moved.length).toBeGreaterThan(0);
  });
});
