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
import '../../../src/components/slot/register.ts';
import '../../../src/components/item-stack/register.ts';
import '../../../src/components/slot-grid/register.ts';
import '../../../src/components/recipe/register.ts';
import '../../../src/components/meter/register.ts';
import '../../../src/components/status-light/register.ts';

// The visual matrix renders one group per run, so each group has its own page and baselines.
export const foundationNames = [
  'panel',
  'divider',
  'button',
  'icon-button',
  'progress-bar',
  'tooltip',
] as const;
export const inventoryNames = [
  'slot',
  'item-stack',
  'slot-grid',
  'recipe',
  'meter',
  'status-light',
] as const;
export const componentNames = [...foundationNames, ...inventoryNames] as const;
export type ComponentName = (typeof componentNames)[number];

export const galleryGroups = {
  foundation: foundationNames,
  inventory: inventoryNames,
} as const;
export type GalleryGroup = keyof typeof galleryGroups;

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
  slot: string;
  item: string;
  recipe: string;
  needs: string;
  makes: string;
  meter: string;
  statuses: [string, string, string, string, string];
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
    slot: 'Module slot 1',
    item: 'Speed module',
    recipe: 'Precision gear',
    needs: '2 iron plates',
    makes: 'Precision gear',
    meter: 'Reactor heat',
    statuses: ['Idle', 'Scheduled', 'Running', 'Low on fuel', 'Offline'],
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
    slot: 'Steckplatz für Verstärkungsmodule, Reihe zwei, Position drei',
    item: 'Geschwindigkeitsmodul der dritten Generation',
    recipe: 'Präzisionszahnrad für schwere Industriegetriebe, Baureihe zwei',
    needs: '2 Eisenplatten und 1 Schmierstoffkartusche',
    makes: 'Präzisionszahnrad',
    meter: 'Reaktorwärme im Primärkreislauf des Nordwerks',
    statuses: [
      'Wartet auf Rohstoffe',
      'Für die nächste Schicht eingeplant',
      'Produktion läuft ohne Unterbrechung',
      'Brennstoff wird knapp',
      'Anlage vollständig abgeschaltet',
    ],
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
    slot: '',
    item: '',
    recipe: '',
    needs: '2 iron plates',
    makes: 'Precision gear',
    meter: '',
    statuses: ['Idle', 'Scheduled', 'Running', 'Low on fuel', 'Offline'],
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
    slot: 'חריץ מודול 1',
    item: 'מודול מהירות',
    recipe: 'גלגל שיניים מדויק',
    needs: '2 לוחות ברזל',
    makes: 'גלגל שיניים',
    meter: 'חום הראקטור',
    statuses: ['ממתין', 'מתוזמן', 'פועל', 'דלק נמוך', 'מנותק'],
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
    <div class="row" style="flex-wrap: nowrap; min-block-size: 48px; align-items: stretch">
      <span style="flex: 1 1 0; min-inline-size: 0; overflow-wrap: break-word">${c.pause}</span><punk-divider orientation="vertical"></punk-divider><span style="flex: 1 1 0; min-inline-size: 0; overflow-wrap: break-word">${c.stop}</span>
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

  slot: (c) => {
    // Without a visible label the slots take an aria-label, since a name is required.
    const name = c.slot ? `label="${c.slot}"` : 'aria-label="Module slot"';
    return `
      ${row(`
        <punk-slot ${name}></punk-slot>
        <punk-slot ${name}>${gear}</punk-slot>
        <punk-slot ${name} selected>${gear}</punk-slot>
        <punk-slot ${name} highlighted>${gear}</punk-slot>
        <punk-slot ${name} invalid>${gear}</punk-slot>
        <punk-slot ${name} disabled>${gear}</punk-slot>
      `)}
      ${row(`
        <punk-slot ${name} selected highlighted invalid>${gear}</punk-slot>
        <punk-slot ${name} selected></punk-slot>
        <punk-slot ${name} invalid></punk-slot>
        <punk-slot ${name} disabled></punk-slot>
      `)}
      ${row(sizes.map((size) => `<punk-slot ${name} size="${size}">${gear}</punk-slot>`).join(''))}
      ${row(`
        <punk-slot ${name}>${gear}<span slot="badge" aria-hidden="true">+</span></punk-slot>
        <punk-slot ${name}>${gear}<span slot="overlay" aria-hidden="true">×</span></punk-slot>
      `)}
    `;
  },

  'item-stack': (c) => {
    // The name is never visible, so the unlabeled variant still uses it; an aria-label would
    // replace the visible count in the accessible name.
    const name = `name="${c.item || 'Item'}"`;
    const art = gear.replace('<svg', '<svg slot="icon"');
    return `
      ${row(`
        <punk-item-stack ${name} count="1">${art}</punk-item-stack>
        <punk-item-stack ${name} count="99">${art}</punk-item-stack>
        <punk-item-stack ${name} count="1234">${art}</punk-item-stack>
        <punk-item-stack ${name} count="1234567">${art}</punk-item-stack>
        <punk-item-stack ${name} count="1234" compact-count>${art}</punk-item-stack>
        <punk-item-stack ${name} count="1234567" compact-count>${art}</punk-item-stack>
        <punk-item-stack ${name} count="75" capacity="100">${art}</punk-item-stack>
        <punk-item-stack ${name} count="0">${art}</punk-item-stack>
      `)}
      ${row(`
        <punk-item-stack ${name} durability="0.8">${art}</punk-item-stack>
        <punk-item-stack ${name} durability="0.4" count="12">${art}</punk-item-stack>
        <punk-item-stack ${name} durability="0.1" count="3">${art}</punk-item-stack>
        <punk-item-stack ${name} quality="3">${art}</punk-item-stack>
        <punk-item-stack ${name} quality="5" durability="0.6" count="999">${art}</punk-item-stack>
        <punk-item-stack ${name} count="1"></punk-item-stack>
      `)}
      ${row(`
        <punk-item-stack ${name} count="8" selected>${art}</punk-item-stack>
        <punk-item-stack ${name} count="8" highlighted>${art}</punk-item-stack>
        <punk-item-stack ${name} count="8" invalid>${art}</punk-item-stack>
        <punk-item-stack ${name} count="8" disabled>${art}</punk-item-stack>
        <punk-item-stack ${name} count="8" selected highlighted invalid>${art}</punk-item-stack>
      `)}
      ${row(
        sizes
          .map(
            (size) =>
              `<punk-item-stack ${name} size="${size}" count="24" durability="0.5" quality="2">${art}</punk-item-stack>`,
          )
          .join(''),
      )}
      ${row(`
        <punk-item-stack ${name} count="5">${art}<span slot="badge" aria-hidden="true">+</span></punk-item-stack>
        <punk-item-stack ${name} count="5">${art}<span slot="overlay" aria-hidden="true">×</span></punk-item-stack>
      `)}
    `;
  },

  'slot-grid': (c) => {
    // Grids are named by the application, so the unlabeled variant still has an aria-label.
    const label = `aria-label="${c.item || 'Module slots'}"`;
    const slotName = c.slot || 'Slot';
    const itemName = c.item || 'Item';
    const slots = (disabled: number[] = []) =>
      [1, 2, 3, 4, 5, 6]
        .map(
          (n) =>
            `<punk-slot label="${slotName} ${n}" value="s${n}"${disabled.includes(n) ? ' disabled' : ''}>${n === 5 ? '' : gear}</punk-slot>`,
        )
        .join('');
    const stacks = [1, 2, 3, 4, 5, 6]
      .map(
        (n) =>
          `<punk-item-stack name="${itemName} ${n}" value="i${n}" count="${n * 12}"${n === 4 ? ' disabled' : ''}>${gear.replace('<svg', '<svg slot="icon"')}</punk-item-stack>`,
      )
      .join('');
    return `
      <punk-slot-grid ${label} selection="single" columns="4" data-values="s2">${slots([3])}</punk-slot-grid>
      <punk-slot-grid ${label} selection="multiple" columns="3" data-values="i1,i3">${stacks}</punk-slot-grid>
      <punk-slot-grid ${label}>${slots()}</punk-slot-grid>
      <punk-slot-grid ${label} selection="single" disabled data-values="s1">${slots()}</punk-slot-grid>
    `;
  },

  recipe: (c) => {
    // An aria-label would replace the visible text in the accessible name, so the name is `name`.
    const name = `name="${c.recipe || 'Recipe'}"`;
    const icon = gear.replace('<svg', '<svg slot="icon"');
    const needs = `<span slot="ingredients">${c.needs}</span>`;
    const makes = `<span slot="products">${c.makes}</span>`;
    return `
      <div class="stack">
        <punk-recipe ${name} duration="0.5" available craftable-count="3">${icon}${needs}${makes}</punk-recipe>
        <punk-recipe ${name} duration="12" available selected>${icon}${needs}${makes}</punk-recipe>
        <punk-recipe ${name} duration="1.25">${icon}${needs}${makes}</punk-recipe>
        <punk-recipe ${name} duration="3" available disabled>${icon}${needs}${makes}</punk-recipe>
        <punk-recipe ${name} available>${needs}</punk-recipe>
        <punk-recipe ${name} available>${makes}</punk-recipe>
        <punk-recipe ${name} available craftable-count="1200">${icon}</punk-recipe>
        <punk-recipe ${name}></punk-recipe>
      </div>
    `;
  },

  meter: (c) => {
    // Without a visible label the meters take an aria-label, since a name is required.
    const name = c.meter ? `label="${c.meter}"` : 'aria-label="Reactor heat"';
    const zones = 'low="30" high="70"';
    return `
      <div class="stack">
        ${[0, 64, 100].map((value) => `<punk-meter ${name} value="${value}" show-value></punk-meter>`).join('')}
        <punk-meter ${name} ${zones} optimum="50" value="50" show-value></punk-meter>
        <punk-meter ${name} ${zones} optimum="50" value="15" show-value></punk-meter>
        <punk-meter ${name} ${zones} optimum="10" value="90" show-value></punk-meter>
        <punk-meter ${name} ${zones} optimum="50" value="85" segments="5" show-value></punk-meter>
        <punk-meter ${name} label-hidden value="40"></punk-meter>
      </div>
      ${row(`
        <punk-meter ${name} orientation="vertical" value="70" show-value></punk-meter>
        <punk-meter ${name} orientation="vertical" ${zones} optimum="50" value="20" show-value></punk-meter>
        <punk-meter ${name} orientation="vertical" ${zones} optimum="10" value="90" segments="6" show-value></punk-meter>
      `)}
    `;
  },

  'status-light': (c) => {
    const [idle, scheduled, running, low, offline] = c.statuses;
    return `
      <div class="stack">
        <punk-status-light>${idle}</punk-status-light>
        <punk-status-light variant="info">${scheduled}</punk-status-light>
        <punk-status-light variant="success">${running}</punk-status-light>
        <punk-status-light variant="warning">${low}</punk-status-light>
        <punk-status-light variant="danger" announce>${offline}</punk-status-light>
        <punk-status-light variant="success"><span slot="icon" aria-hidden="true">${plus}</span>${running}</punk-status-light>
      </div>
    `;
  },
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
  applyGridValues(root);
  return root;
}

/** A grid takes its selection as a property, which markup cannot carry. */
function applyGridValues(root: ParentNode): void {
  for (const grid of root.querySelectorAll<HTMLElementTagNameMap['punk-slot-grid']>(
    'punk-slot-grid[data-values]',
  )) {
    grid.values = (grid.dataset['values'] ?? '').split(',');
  }
}

/**
 * Grids of 100 slots, one for each selection mode, for the visual matrix. They are too many
 * elements for the axe and reflow suites, which would repeat them across every theme.
 */
export function buildLargeGrids(variant: ContentVariant): HTMLElement {
  const { lang, dir } = copy[variant];
  const root = document.createElement('div');
  root.className = 'gallery';
  root.lang = lang;
  root.dir = dir;
  const slots = Array.from(
    { length: 100 },
    (_, index) =>
      `<punk-slot label="Slot ${index + 1}" value="s${index + 1}"${index % 17 === 5 ? ' disabled' : ''}>${index % 11 === 0 ? '' : gear}</punk-slot>`,
  ).join('');
  const grid = (selection: string, values: string) =>
    `<punk-slot-grid aria-label="Slots, ${selection}" selection="${selection}" columns="10"${values ? ` data-values="${values}"` : ''}>${slots}</punk-slot-grid>`;
  root.innerHTML = `
    <section data-component="large-grids" class="stack">
      <h2 class="caption">punk-slot-grid, 100 slots</h2>
      ${grid('none', '')}
      ${grid('single', 's42')}
      ${grid('multiple', 's3,s4,s5,s37,s60')}
    </section>
  `;
  applyGridValues(root);
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
