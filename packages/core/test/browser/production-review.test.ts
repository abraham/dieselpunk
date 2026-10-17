import { commands, server } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { themeNames } from '../../src/tokens/themes.ts';
import { addStylesheets, cleanup, track } from './helpers.ts';
import './commands.ts';
import { buildGallery, contentVariants, galleryCss } from './fixtures/gallery.ts';
import type { ContentVariant } from './fixtures/gallery.ts';

// specs/inventory-and-readouts.md §9 and §10: the stat and the row in the narrowest renders. The
// baselines show a person what is wrong; this measures what a person would see: a word split
// inside itself, text drawn over text, a box past the edge, a clipped line, and a button too small.

const densities = ['compact', 'low'] as const;
const widths = [187, 375];

beforeEach(() => {
  addStylesheets();
  const style = document.createElement('style');
  style.textContent = galleryCss;
  track(style, document.head);
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
});

function mount(variant: ContentVariant, theme: string, density: string, width: number) {
  const frame = document.createElement('div');
  frame.setAttribute('data-punk-theme', theme);
  frame.setAttribute('data-punk-density', density);
  frame.style.cssText = `width: ${width}px; background: var(--punk-color-canvas);`;
  frame.append(buildGallery(variant, ['production-stat', 'connection-row']));
  track(frame);
  return frame;
}

async function settle(root: HTMLElement): Promise<void> {
  const elements = [...root.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('punk-'),
  ) as Array<Element & { updateComplete?: Promise<boolean> }>;
  await Promise.all(elements.map((element) => element.updateComplete));
  await document.fonts.ready;
}

/** Every element below `root`, through shadow roots, in document order. */
function* walk(root: ParentNode): Generator<Element> {
  for (const child of root.children) {
    yield child;
    if (child.shadowRoot) yield* walk(child.shadowRoot);
    yield* walk(child);
  }
}

function* textNodes(root: ParentNode): Generator<Text> {
  for (const element of walk(root)) {
    for (const node of element.childNodes) {
      if (node instanceof Text && node.data.trim()) yield node;
    }
  }
}

const visible = (node: Text): boolean => {
  const parent = node.parentElement;
  if (!parent) return false;
  const style = getComputedStyle(parent);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  // The text that is visually hidden is one pixel, clipped, and never drawn.
  const box = parent.getBoundingClientRect();
  return box.width > 1 && box.height > 1;
};

/** The line boxes of a run of text, merged where they sit on one line. */
function lineRects(node: Text, from = 0, to = node.length): DOMRect[] {
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(node, to);
  return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
}

/** The width of the plate's content, which is the most any line of the component can have. */
function roomOf(host: Element): number {
  const plate = host.shadowRoot?.querySelector('.readout');
  if (!plate) return host.getBoundingClientRect().width;
  const style = getComputedStyle(plate);
  return plate.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/** What shares the line with a word: an icon or shape beside it, and a button beside a source. */
function reserved(node: Text, host: Element): number {
  const parent = node.parentElement!;
  const widthOf = (element: Element | null | undefined) =>
    element ? element.getBoundingClientRect().width + 8 : 0;
  if (parent.classList.contains('label')) return widthOf(host.querySelector('[slot="icon"] svg'));
  if (parent.slot === 'status') {
    const status = host.shadowRoot?.querySelector('.status');
    const gap = status ? parseFloat(getComputedStyle(status).columnGap) : 8;
    const shape = host.shadowRoot?.querySelector('.indicator')?.getBoundingClientRect().width ?? 0;
    return shape + gap;
  }
  const beside = parent.slot === 'source' && host.getBoundingClientRect().width < 360;
  return (
    widthOf(parent.querySelector('svg')) +
    (beside ? widthOf(host.shadowRoot?.querySelector('button')) : 0)
  );
}

function problemsIn(frame: HTMLElement, where: string, rtl: boolean): string[] {
  const problems: string[] = [];
  const edge = frame.getBoundingClientRect();
  const hosts = [...frame.querySelectorAll('punk-production-stat, punk-connection-row')];

  for (const host of hosts) {
    const name = `${host.localName}${host.getAttribute('layout') ? `[${host.getAttribute('layout')}]` : ''}`;
    // The shadow tree's text, and the application's text that a slot draws.
    const drawn = [...textNodes(host.shadowRoot ?? host), ...textNodes(host)].filter(visible);

    // 1. A word split across two lines.
    for (const node of drawn) {
      for (const match of node.data.matchAll(/\S{4,}/g)) {
        const rects = lineRects(node, match.index, match.index! + match[0].length);
        // Two lines, not one run in a fallback font that sits a pixel or two off.
        const first = rects[0];
        const lines = first
          ? rects.filter((rect) => rect.top > first.bottom - first.height / 2)
          : [];
        if (lines.length > 0) {
          const natural = rects.reduce((sum, rect) => sum + rect.width, 0);
          // A word wider than the room it could have had is split as a last resort, and that is
          // the design (specs/inventory-and-readouts.md §9); one that fits is a defect.
          if (natural + reserved(node, host) <= roomOf(host)) {
            problems.push(
              `${where}: ${name}: "${match[0]}" (${natural.toFixed(0)}px) is split though ${roomOf(host).toFixed(0)}px is there [parent ${node.parentElement!.className}/${node.parentElement!.slot} ${(node.parentElement!.parentElement ?? node.parentElement!).getBoundingClientRect().width.toFixed(0)} reserved ${reserved(node, host)}]`,
            );
          }
        }
      }
    }

    // 2. Text past the container's edge, in the writing direction.
    for (const node of drawn) {
      for (const rect of lineRects(node)) {
        const over = rtl ? edge.left - rect.left : rect.right - edge.right;
        if (over > 0.5) {
          problems.push(
            `${where}: ${name}: "${node.data.trim().slice(0, 24)}" is ${over.toFixed(1)}px past the edge`,
          );
        }
      }
    }

    // 3. Text drawn over other text.
    for (let a = 0; a < drawn.length; a++) {
      for (let b = a + 1; b < drawn.length; b++) {
        for (const first of lineRects(drawn[a]!)) {
          for (const second of lineRects(drawn[b]!)) {
            const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
            const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
            if (width > 1 && height > 2) {
              problems.push(
                `${where}: ${name}: "${drawn[a]!.data.trim().slice(0, 16)}" overlaps "${drawn[b]!.data.trim().slice(0, 16)}"`,
              );
            }
          }
        }
      }
    }

    // 4. A clipped box: something wider than the box that hides it.
    for (const element of [host, ...walk(host.shadowRoot ?? host)]) {
      const style = getComputedStyle(element);
      // The visually hidden text is a clipped pixel on purpose.
      if (element.clientWidth <= 1) continue;
      if (style.overflowX !== 'visible' && element.scrollWidth > element.clientWidth + 1) {
        problems.push(
          `${where}: ${name}: <${element.localName}> clips ${element.scrollWidth - element.clientWidth}px`,
        );
      }
    }

    // 5. The remove button is at least 24 by 24 CSS pixels (WCAG 2.5.8).
    const button = host.shadowRoot?.querySelector('button');
    if (button) {
      const box = button.getBoundingClientRect();
      if (box.width < 24 - 0.5 || box.height < 24 - 0.5) {
        problems.push(`${where}: ${name}: the remove button is ${box.width}x${box.height}`);
      }
      // And it stays inside the row.
      const hostBox = host.getBoundingClientRect();
      if (box.left < hostBox.left - 0.5 || box.right > hostBox.right + 0.5) {
        problems.push(`${where}: ${name}: the remove button leaves the row`);
      }
    }
  }
  return problems;
}

describe('review of the production group in the narrowest renders', () => {
  it.each(widths)(
    'has no split words, overlaps, clipping, or small targets at %ipx',
    async (width) => {
      const problems: string[] = [];
      for (const theme of themeNames) {
        for (const density of densities) {
          for (const variant of contentVariants) {
            const frame = mount(variant, theme, density, width);
            await settle(frame);
            const rtl = frame.querySelector<HTMLElement>('[dir]')?.dir === 'rtl';
            problems.push(...problemsIn(frame, `${theme}/${density}/${variant}@${width}`, rtl));
            frame.remove();
          }
        }
      }
      expect([...new Set(problems)]).toEqual([]);
    },
    120_000,
  );

  // Chromium is the only engine that emulates forced colors.
  it.skipIf(server.browser !== 'chromium').each(widths)(
    'has the same properties in forced colors at %ipx',
    async (width) => {
      const problems: string[] = [];
      for (const density of densities) {
        for (const variant of contentVariants) {
          const frame = mount(variant, 'dark', density, width);
          await settle(frame);
          await commands.setForcedColors('active');
          const rtl = frame.querySelector<HTMLElement>('[dir]')?.dir === 'rtl';
          problems.push(...problemsIn(frame, `forced/${density}/${variant}@${width}`, rtl));
          await commands.setForcedColors(null);
          frame.remove();
        }
      }
      expect([...new Set(problems)]).toEqual([]);
    },
    120_000,
  );
});
