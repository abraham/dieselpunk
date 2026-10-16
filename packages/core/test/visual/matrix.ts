import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import { renderThemesCss, renderTokensCss } from '../../scripts/render-css.ts';
import {
  buildGallery,
  componentNames,
  contentVariants,
  foundationNames,
  galleryCss,
  openTooltips,
} from '../browser/fixtures/gallery.ts';
import type { ComponentName, ContentVariant } from '../browser/fixtures/gallery.ts';

// One page for every state of every component. The test picks theme, density, and content with
// query parameters, then waits for `data-ready` on <html>. Stylesheets come from the same
// renderers as the shipped CSS, so the page needs no built dist/.

const params = new URLSearchParams(location.search);
const theme = params.get('theme') ?? 'industrial';
const density = params.get('density') ?? 'compact';
const content = (params.get('content') ?? 'short') as ContentVariant;
const only = params.get('component') as ComponentName | null;

if (!contentVariants.includes(content)) throw new Error(`Unknown content variant "${content}"`);
if (only && !componentNames.includes(only)) throw new Error(`Unknown component "${only}"`);

const style = document.createElement('style');
style.textContent = `${renderTokensCss()}\n${renderThemesCss()}\n${galleryCss}
  html { background: var(--punk-color-canvas); color: var(--punk-color-text); font-family: var(--punk-font-family); }
  body { margin: 0; }`;
document.head.append(style);

document.documentElement.setAttribute('data-punk-theme', theme);
document.documentElement.setAttribute('data-punk-density', density);

const gallery = buildGallery(content, only ? [only] : foundationNames);
document.body.append(gallery);

// A page of unregistered elements would still screenshot cleanly, and become a baseline of nothing.
for (const name of only ? [only] : foundationNames) {
  if (!customElements.get(`punk-${name}`)) throw new Error(`punk-${name} is not registered`);
}
document.documentElement.lang = gallery.lang;
document.documentElement.dir = gallery.dir;

const elements = [...gallery.querySelectorAll('*')].filter((element) =>
  element.localName.startsWith('punk-'),
) as Array<Element & { updateComplete?: Promise<boolean> }>;
await Promise.all(elements.map((element) => element.updateComplete));
openTooltips(gallery);
await Promise.all(elements.map((element) => element.updateComplete));
await document.fonts.ready;
// A frame lets the open tooltip position itself before the screenshot.
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
document.documentElement.setAttribute('data-ready', '');
