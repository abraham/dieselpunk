import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import { buildGallery, contentVariants, galleryCss, openTooltips } from './fixtures/gallery.ts';
import type { ContentVariant } from './fixtures/gallery.ts';
import { galleryCombinations, galleryNames } from './fixtures/selection.ts';

// WCAG 1.4.10 (reflow): at 200% zoom a 1024px window is 512 CSS pixels and a 375px one is 187, and
// nothing may force horizontal scrolling there. Content that cannot fit has to wrap instead.

const widths = [187, 256, 375, 512];

beforeEach(() => {
  addStylesheets();
  const style = document.createElement('style');
  style.textContent = galleryCss;
  track(style, document.head);
});

afterEach(cleanup);

/** A container of exactly `width` px, like a narrow window, holding the whole gallery. */
function mountAt(variant: ContentVariant, theme: string, density: string, width: number) {
  const frame = document.createElement('div');
  frame.setAttribute('data-punk-theme', theme);
  frame.setAttribute('data-punk-density', density);
  frame.style.cssText = `width: ${width}px; background: var(--punk-color-canvas);`;
  const gallery = buildGallery(variant, galleryNames);
  frame.append(gallery);
  document.body.append(frame);
  return { frame, gallery };
}

async function settle(root: HTMLElement): Promise<void> {
  const elements = [...root.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('punk-'),
  ) as Array<Element & { updateComplete?: Promise<boolean> }>;
  await Promise.all(elements.map((element) => element.updateComplete));
  openTooltips(root);
  await Promise.all(elements.map((element) => element.updateComplete));
}

/** How far past the container an element's box ends, in the writing direction. */
function overflowOf(element: Element, frame: HTMLElement, rtl: boolean): number {
  const box = element.getBoundingClientRect();
  const edge = frame.getBoundingClientRect();
  return rtl ? edge.left - box.left : box.right - edge.right;
}

describe('reflow without horizontal scrolling', () => {
  it.each(widths)(
    'keeps every component inside a %ipx container',
    async (width) => {
      const problems: string[] = [];
      for (const { theme, density } of galleryCombinations) {
        for (const variant of contentVariants) {
          const { frame, gallery } = mountAt(variant, theme, density, width);
          await settle(frame);
          const rtl = gallery.dir === 'rtl';
          const where = `${theme}/${density}/${variant}@${width}`;
          for (const name of galleryNames) {
            // An open tooltip is placed against the viewport, so it is checked separately.
            if (name === 'tooltip') continue;
            for (const element of gallery.querySelectorAll(
              `[data-component="${name}"] punk-${name}`,
            )) {
              const over = overflowOf(element, frame, rtl);
              if (over > 0.5) {
                const kind = element.getAttribute('variant') ?? '';
                problems.push(`${where}: <punk-${name} ${kind}> is ${over.toFixed(1)}px too wide`);
              }
            }
          }
          if (frame.scrollWidth > frame.clientWidth + 1) {
            problems.push(`${where}: the container scrolls (${frame.scrollWidth}px)`);
          }
          frame.remove();
        }
      }
      expect(problems).toEqual([]);
      // 32 galleries a width is near the limit when three engines share a runner, and the production
      // group made each gallery larger.
    },
    120_000,
  );

  it.skipIf(!galleryNames.includes('tooltip'))(
    'keeps an open tooltip narrower than the viewport',
    async () => {
      const { frame } = mountAt('long', 'industrial', 'compact', 256);
      try {
        await settle(frame);
        const surface = frame
          .querySelector('punk-tooltip[data-open]')
          ?.shadowRoot?.querySelector('[part="surface"]');
        expect(surface).toBeTruthy();
        const box = (surface as Element).getBoundingClientRect();
        expect(box.width).toBeLessThanOrEqual(document.documentElement.clientWidth - 16 + 0.5);
      } finally {
        frame.remove();
      }
    },
    60_000,
  );
});
