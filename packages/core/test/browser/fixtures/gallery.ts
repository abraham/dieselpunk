/**
 * Every component in the states the test suites care about, in four content variants.
 * Shared by the axe suite, the manifest checks, and the visual matrix page.
 */

import '../../../src/components/panel/register.ts';
import '../../../src/components/divider/register.ts';
import '../../../src/components/button/register.ts';
import '../../../src/components/icon-button/register.ts';
import '../../../src/components/progress-bar/register.ts';
import '../../../src/components/tooltip/register.ts';

export const componentNames = [
  'panel',
  'divider',
  'button',
  'icon-button',
  'progress-bar',
  'tooltip',
] as const;
export type ComponentName = (typeof componentNames)[number];

export const contentVariants = ['short', 'long', 'unlabeled', 'rtl'] as const;
export type ContentVariant = (typeof contentVariants)[number];

interface Copy {
  lang: string;
  dir: 'ltr' | 'rtl';
  title: string;
  body: string;
  footer: string;
  divider: string;
  start: string;
  pause: string;
  stop: string;
  progress: string;
  settings: string;
  tip: string;
}

const copy: Record<ContentVariant, Copy> = {
  short: {
    lang: 'en',
    dir: 'ltr',
    title: 'Assembler',
    body: 'Crafting speed 0.75',
    footer: 'Idle',
    divider: 'Inputs',
    start: 'Start',
    pause: 'Pause',
    stop: 'Stop',
    progress: 'Crafting',
    settings: 'Settings',
    tip: 'Starts the assembler',
  },
  long: {
    lang: 'de',
    dir: 'ltr',
    title: 'Montagemaschine für schwere industrielle Getriebe, Baureihe zwei',
    body: 'Fertigungsgeschwindigkeit nach Berücksichtigung aller installierten Module',
    footer: 'Wartet auf Rohstoffe aus der Eisenschmelze im Nordwerk',
    divider: 'Eingangsmaterialien und Zwischenprodukte',
    start: 'Produktion jetzt starten',
    pause: 'Vorübergehend anhalten',
    stop: 'Vollständig abbrechen',
    progress: 'Getriebe wird gefertigt',
    settings: 'Einstellungen der Maschine öffnen',
    tip: 'Startet die Montagemaschine und nimmt die Produktion sofort auf',
  },
  unlabeled: {
    lang: 'en',
    dir: 'ltr',
    title: '',
    body: 'Crafting speed 0.75',
    footer: '',
    divider: '',
    start: 'Start',
    pause: 'Pause',
    stop: 'Stop',
    progress: '',
    settings: 'Settings',
    tip: 'Starts the assembler',
  },
  rtl: {
    lang: 'he',
    dir: 'rtl',
    title: 'מכונת הרכבה',
    body: 'מהירות ייצור 0.75',
    footer: 'במצב המתנה',
    divider: 'חומרי גלם',
    start: 'התחל',
    pause: 'השהה',
    stop: 'עצור',
    progress: 'מייצר גלגלי שיניים',
    settings: 'הגדרות',
    tip: 'מפעיל את מכונת ההרכבה',
  },
};

const gear = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/></svg>`;
const plus = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M11 4h2v16h-2zM4 11h16v2H4z"/></svg>`;

const variants = ['default', 'primary', 'danger'] as const;
const sizes = ['sm', 'md', 'lg'] as const;
const row = (content: string) => `<div class="row">${content}</div>`;

function slot(name: string, text: string): string {
  return text ? `<span slot="${name}">${text}</span>` : '';
}

type Builder = (text: Copy) => string;

const builders: Record<ComponentName, Builder> = {
  panel: (c) =>
    ['raised', 'inset', 'flat']
      .map(
        (variant) =>
          `<punk-panel variant="${variant}">${slot('header', c.title)}${c.body}${slot('footer', c.footer)}</punk-panel>`,
      )
      .join(''),

  divider: (c) => `
    <punk-divider></punk-divider>
    <punk-divider>${c.divider}</punk-divider>
    <div class="row" style="block-size: 48px; align-items: stretch">
      <span>${c.pause}</span><punk-divider orientation="vertical"></punk-divider><span>${c.stop}</span>
    </div>
    <punk-divider decorative>${c.divider}</punk-divider>
  `,

  button: (c) => `
    ${variants
      .map((variant) =>
        row(`
      <punk-button variant="${variant}">${c.start}</punk-button>
      <punk-button variant="${variant}" disabled>${c.pause}</punk-button>
      <punk-button variant="${variant}" loading>${c.stop}</punk-button>
    `),
      )
      .join('')}
    ${row(sizes.map((size) => `<punk-button size="${size}">${c.start}</punk-button>`).join(''))}
    ${row(`
      <punk-button variant="primary"><span slot="icon-start">${plus}</span>${c.start}</punk-button>
      <punk-button>${c.pause}<span slot="icon-end">${gear}</span></punk-button>
    `)}
  `,

  'icon-button': (c) => `
    ${variants
      .map((variant) =>
        row(
          sizes
            .map(
              (size) => `
      <punk-icon-button label="${c.settings}" variant="${variant}" size="${size}">${gear}</punk-icon-button>
    `,
            )
            .join(''),
        ),
      )
      .join('')}
    ${row(`
      <punk-icon-button label="${c.settings}" disabled>${gear}</punk-icon-button>
      <punk-icon-button label="${c.settings}" loading>${gear}</punk-icon-button>
    `)}
  `,

  'progress-bar': (c) => {
    // Without a visible label the bars take an aria-label, since a name is required.
    const name = c.progress ? `label="${c.progress}"` : 'aria-label="Crafting"';
    return `
      <div class="stack">
        ${[0, 64, 100].map((value) => `<punk-progress-bar ${name} value="${value}" show-value></punk-progress-bar>`).join('')}
        <punk-progress-bar ${name}></punk-progress-bar>
        ${['success', 'warning', 'danger'].map((variant) => `<punk-progress-bar ${name} variant="${variant}" value="60" show-value></punk-progress-bar>`).join('')}
        <punk-progress-bar ${name} label-hidden value="40"></punk-progress-bar>
      </div>
    `;
  },

  tooltip: (c) => `
    ${row(`
      <punk-button>${c.start}</punk-button>
      <punk-tooltip data-open>${c.tip}</punk-tooltip>
    `)}
    ${row(`
      <punk-button id="gallery-anchor">${c.pause}</punk-button>
      <punk-tooltip for="gallery-anchor" placement="bottom" describe="false">${c.tip}</punk-tooltip>
    `)}
  `,
};

/** HTML for one component's states. */
export function componentHtml(name: ComponentName, variant: ContentVariant): string {
  return builders[name](copy[variant]);
}

/** A container holding a section for each requested component, language and direction set. */
export function buildGallery(
  variant: ContentVariant,
  names: readonly ComponentName[] = componentNames,
): HTMLElement {
  const { lang, dir } = copy[variant];
  const root = document.createElement('div');
  root.className = 'gallery';
  root.lang = lang;
  root.dir = dir;
  root.innerHTML = names
    .map(
      (name) => `
        <section data-component="${name}" class="stack">
          <h2 class="caption">punk-${name}</h2>
          ${componentHtml(name, variant)}
        </section>
      `,
    )
    .join('');
  return root;
}

/** Opens the tooltip marked `data-open`. Only one tooltip can be open at a time. */
export function openTooltips(root: ParentNode): void {
  root.querySelector<HTMLElementTagNameMap['punk-tooltip']>('punk-tooltip[data-open]')?.show();
}

/** Layout the galleries need, since components bring no layout of their own. */
export const galleryCss = `
  .gallery { display: flex; flex-direction: column; gap: 24px; padding: 16px; box-sizing: border-box; }
  .gallery .stack { display: flex; flex-direction: column; gap: 12px; }
  .gallery .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  .gallery .caption { margin: 0; font: 12px/1.2 var(--punk-font-mono, monospace); color: var(--punk-color-text-muted, #b8b4a7); }
`;
