import axe from 'axe-core';
import type { AxeResults, Result } from 'axe-core';
import { commands, server } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, focusWithKeyboard, track } from './helpers.ts';
import './commands.ts';
import { buildGallery, contentVariants, galleryCss, openTooltips } from './fixtures/gallery.ts';
import type { ComponentName, ContentVariant } from './fixtures/gallery.ts';
import { galleryCombinations, galleryNames } from './fixtures/selection.ts';

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

/** A themed surface like the one an application would put components on. */
function mountGallery(
  variant: ContentVariant,
  theme: string,
  density: string,
  names: readonly ComponentName[] = galleryNames,
): HTMLElement {
  const stage = document.createElement('div');
  stage.setAttribute('data-punk-theme', theme);
  stage.setAttribute('data-punk-density', density);
  stage.style.cssText = 'background: var(--punk-color-canvas); color: var(--punk-color-text);';
  stage.append(buildGallery(variant, names));
  track(stage);
  return stage;
}

async function settle(root: HTMLElement): Promise<void> {
  const elements = [...root.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('punk-'),
  ) as Array<Element & { updateComplete?: Promise<boolean> }>;
  await Promise.all(elements.map((element) => element.updateComplete));
  openTooltips(root);
  await Promise.all(elements.map((element) => element.updateComplete));
}

function describeViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => `    ${node.target.flat().join(' ')}\n      ${node.html.slice(0, 140)}`)
        .join('\n');
      return `[${violation.impact}] ${violation.id}: ${violation.help}\n${nodes}`;
    })
    .join('\n');
}

async function scan(root: HTMLElement): Promise<AxeResults> {
  return axe.run(root, {
    resultTypes: ['violations'],
    // `region` asks that page content sit in landmarks, which is the page's job, not a component's.
    rules: { region: { enabled: false } },
  });
}

const serious = (results: AxeResults): Result[] =>
  results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );

describe.each(galleryCombinations)('axe: $theme, $density', ({ theme, density }) => {
  it.each(contentVariants)(
    'has no serious or critical violations (%s content)',
    async (variant) => {
      const stage = mountGallery(variant, theme, density);
      await settle(stage);
      const found = serious(await scan(stage));
      expect(found, describeViolations(found)).toEqual([]);
    },
  );
});

describe('axe: every component is scanned', () => {
  it('finds each component in the gallery', async () => {
    const stage = mountGallery('short', 'industrial', 'compact');
    await settle(stage);
    for (const name of galleryNames) {
      expect(stage.querySelector(`[data-component="${name}"] punk-${name}`), name).not.toBeNull();
    }
  });

  it('would report a real violation, so a clean result means something', async () => {
    const stage = mountGallery('short', 'industrial', 'compact');
    stage.insertAdjacentHTML('beforeend', '<img src="data:," />');
    await settle(stage);
    const results = await scan(stage);
    expect(results.violations.map((violation) => violation.id)).toContain('image-alt');
  });

  it('looks inside shadow roots, so unreadable text in a component is reported', async () => {
    const stage = mountGallery('short', 'industrial', 'compact', ['progress-bar']);
    // Text almost the color of the canvas behind the progress bar's label.
    stage.style.setProperty('--punk-color-text', '#1f201d');
    await settle(stage);
    const results = await scan(stage);
    const contrast = results.violations.find((violation) => violation.id === 'color-contrast');
    expect(contrast?.nodes.some((node) => node.target.some((part) => Array.isArray(part)))).toBe(
      true,
    );
  });
});

// Chromium is the only engine that emulates forced colors, so the check runs there only.
describe.skipIf(server.browser !== 'chromium')('forced colors', () => {
  const surfaces: Array<[string, string, string]> = [
    ['panel', 'punk-panel', '[part="surface"]'],
    ['button', 'punk-button', '[part="button"]'],
    ['icon-button', 'punk-icon-button', '[part="button"]'],
    ['progress bar track', 'punk-progress-bar', '[part="track"]'],
    ['tooltip', 'punk-tooltip', '[part="surface"]'],
  ];

  it.each(surfaces)('keeps a visible border on the %s', async (_label, tag, part) => {
    const stage = mountGallery('short', 'industrial', 'compact', [
      tag.slice('punk-'.length) as ComponentName,
    ]);
    await settle(stage);
    await commands.setForcedColors('active');
    const element = stage.querySelector(`${tag}${tag === 'punk-tooltip' ? '[data-open]' : ''}`);
    const target = element?.shadowRoot?.querySelector(part);
    expect(target, `${tag} ${part}`).toBeTruthy();
    const style = getComputedStyle(target as Element);
    expect(parseFloat(style.borderTopWidth) > 0 || style.outlineStyle !== 'none').toBe(true);
    expect(style.borderTopStyle === 'none' && style.outlineStyle === 'none').toBe(false);
  });

  it.each([
    ['button', 'punk-button'],
    ['icon-button', 'punk-icon-button'],
  ] as const)('shows a focus indicator on %s', async (name, tag) => {
    const stage = mountGallery('short', 'industrial', 'compact', [name]);
    await settle(stage);
    await commands.setForcedColors('active');
    const element = stage.querySelector<HTMLElement>(`${tag}:not([disabled]):not([loading])`);
    expect(element).not.toBeNull();
    await focusWithKeyboard(element as HTMLElement);
    const inner = element?.shadowRoot?.querySelector('[part="button"]');
    const style = getComputedStyle(inner as Element);
    expect(style.outlineStyle).toBe('solid');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
  });
});
