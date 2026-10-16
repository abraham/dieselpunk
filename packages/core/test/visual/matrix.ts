import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import { renderThemesCss, renderTokensCss } from '../../scripts/render-css.ts';
import {
  buildGallery,
  buildLargeGrids,
  componentNames,
  contentVariants,
  galleryCss,
  galleryGroups,
  openTooltips,
} from '../browser/fixtures/gallery.ts';
import type { ComponentName, ContentVariant, GalleryGroup } from '../browser/fixtures/gallery.ts';

// One page for every state of every component in a group. The test picks group, theme, density,
// and content with query parameters, then waits for `data-ready` on <html>. Stylesheets come from
// the same renderers as the shipped CSS, so the page needs no built dist/.

const params = new URLSearchParams(location.search);
const group = (params.get('group') ?? 'foundation') as GalleryGroup;
const theme = params.get('theme') ?? 'industrial';
const density = params.get('density') ?? 'compact';
const content = (params.get('content') ?? 'short') as ContentVariant;
const only = params.get('component') as ComponentName | null;

if (!(group in galleryGroups)) throw new Error(`Unknown group "${group}"`);
if (!contentVariants.includes(content)) throw new Error(`Unknown content variant "${content}"`);
if (only && !componentNames.includes(only)) throw new Error(`Unknown component "${only}"`);
const names: readonly ComponentName[] = only ? [only] : galleryGroups[group];

const style = document.createElement('style');
style.textContent = `${renderTokensCss()}\n${renderThemesCss()}\n${galleryCss}
  html { background: var(--punk-color-canvas); color: var(--punk-color-text); font-family: var(--punk-font-family); }
  body { margin: 0; }`;
document.head.append(style);

document.documentElement.setAttribute('data-punk-theme', theme);
document.documentElement.setAttribute('data-punk-density', density);

const gallery = buildGallery(content, names);
// The 100-slot grids are in the short content only: their layout does not depend on the words.
if (!only && group === 'inventory' && content === 'short') {
  gallery.append(...buildLargeGrids(content).children);
}
document.body.append(gallery);

// A page of unregistered elements would still screenshot cleanly, and become a baseline of nothing.
for (const name of names) {
  if (!customElements.get(`punk-${name}`)) throw new Error(`punk-${name} is not registered`);
}
document.documentElement.lang = gallery.lang;
document.documentElement.dir = gallery.dir;

const elements = [...gallery.querySelectorAll('*')].filter((element) =>
  element.localName.startsWith('punk-'),
) as Array<Element & { updateComplete?: Promise<boolean> }>;
await Promise.all(elements.map((element) => element.updateComplete));
openTooltips(gallery);
// A grid adopts its items after `slotchange`, and then sets their selection, so settle twice.
for (let round = 0; round < 2; round++) {
  await new Promise((resolve) => setTimeout(resolve));
  await Promise.all(elements.map((element) => element.updateComplete));
}
await document.fonts.ready;
// A frame lets the open tooltip position itself before the screenshot.
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
document.documentElement.setAttribute('data-ready', '');
