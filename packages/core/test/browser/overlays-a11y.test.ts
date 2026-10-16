import axe from 'axe-core';
import type { Result } from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { themeNames } from '../../src/tokens/themes.ts';
import { addStylesheets, cleanup, track } from './helpers.ts';
import { buildGallery, galleryCss, overlayNames } from './fixtures/gallery.ts';
import type { ContentVariant } from './fixtures/gallery.ts';

// An open modal covers the page and makes it inert, so each overlay is scanned on its own page.
const densities = ['compact', 'low'] as const;
const contents: ContentVariant[] = ['short', 'long', 'unlabeled', 'rtl'];

beforeEach(() => {
  addStylesheets();
  const style = document.createElement('style');
  style.textContent = galleryCss;
  track(style, document.head);
});

afterEach(cleanup);

const describeViolations = (violations: Result[]) =>
  violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => `    ${node.target.flat().join(' ')}\n      ${node.html.slice(0, 140)}`)
        .join('\n');
      return `[${violation.impact}] ${violation.id}: ${violation.help}\n${nodes}\n`;
    })
    .join('\n');

describe.each(overlayNames)('axe: an open %s', (name) => {
  it.each(
    themeNames.flatMap((theme) =>
      densities.flatMap((density) => contents.map((content) => ({ theme, density, content }))),
    ),
  )(
    'has no serious or critical violations ($theme, $density, $content)',
    async ({ theme, density, content }) => {
      const stage = document.createElement('div');
      stage.setAttribute('data-punk-theme', theme);
      stage.setAttribute('data-punk-density', density);
      stage.style.cssText = 'background: var(--punk-color-canvas); color: var(--punk-color-text);';
      stage.append(buildGallery(content, [name], { open: true }));
      track(stage);
      const overlay = stage.querySelector(`punk-${name}`) as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await overlay.updateComplete;
      await new Promise((resolve) => setTimeout(resolve));
      expect(overlay.shadowRoot?.querySelector('dialog')?.open).toBe(true);
      const results = await axe.run(stage, {
        resultTypes: ['violations'],
        rules: { region: { enabled: false } },
      });
      const found = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(found, describeViolations(found)).toEqual([]);
    },
  );
});
