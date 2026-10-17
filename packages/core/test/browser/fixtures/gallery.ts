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
import '../../../src/components/production-stat/register.ts';
import '../../../src/components/connection-row/register.ts';
import '../../../src/components/stack/register.ts';
import '../../../src/components/cluster/register.ts';
import '../../../src/components/accordion/register.ts';
import '../../../src/components/tabs/register.ts';
import '../../../src/components/toolbar/register.ts';
import '../../../src/components/window/register.ts';
import '../../../src/components/dialog/register.ts';
import '../../../src/components/popover/register.ts';
import '../../../src/components/toast/register.ts';
import '../../../src/components/checkbox/register.ts';
import '../../../src/components/switch/register.ts';
import '../../../src/components/slider/register.ts';
import '../../../src/components/text-field/register.ts';
import '../../../src/components/number-field/register.ts';
import '../../../src/components/select/register.ts';

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
export const productionNames = ['production-stat', 'connection-row'] as const;
export const shellNames = [
  'stack',
  'cluster',
  'accordion',
  'accordion-item',
  'tabs',
  'tab',
  'toolbar',
  'window',
] as const;
// Overlays open on a page of their own, since the top layer covers everything else.
// Every form control in every state, in flow: no top layer, so one page holds them all.
export const formNames = [
  'checkbox',
  'switch',
  'slider',
  'text-field',
  'number-field',
  'select',
] as const;
export const overlayNames = ['dialog', 'window', 'popover', 'toast-stack'] as const;
export const componentNames = [
  ...foundationNames,
  ...inventoryNames,
  ...productionNames,
  ...shellNames,
  ...formNames,
  'dialog',
  'popover',
  'toast-stack',
  'toast',
] as const;
export type ComponentName = (typeof componentNames)[number];

export const galleryGroups = {
  foundation: foundationNames,
  inventory: inventoryNames,
  production: productionNames,
  shell: shellNames,
  forms: formNames,
  overlays: overlayNames,
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

// Toasts in the gallery never close by themselves, or a long page would lose them.
function toasts(c: Copy): string {
  const [, scheduled, running, low, offline] = c.statuses;
  return `
    <punk-toast variant="info" duration="0">${scheduled}</punk-toast>
    <punk-toast variant="success" duration="0" heading="${c.title}">${running}</punk-toast>
    <punk-toast variant="warning" duration="0"><punk-button slot="action" size="sm">${c.start}</punk-button>${low}</punk-toast>
    <punk-toast variant="danger" duration="0" heading="${c.title}">${offline}</punk-toast>
  `;
}

function slot(name: string, text: string): string {
  return text ? `<span slot="${name}">${text}</span>` : '';
}

/** `open` is for a page that holds one overlay: it opens modal, and the others stay closed. */
export interface BuildOptions {
  open?: boolean;
}

type Builder = (text: Copy, options: BuildOptions) => string;

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

  'production-stat': (c) => {
    // Without a visible label the stats take the same text, since a stat with no label has no name.
    const label = `label="${c.meter || 'Reactor heat'}"`;
    const spark = `<svg slot="sparkline" aria-hidden="true" viewBox="0 0 60 16" preserveAspectRatio="none"><polyline points="0,12 12,8 24,10 36,4 48,6 60,2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
    return `
      <div class="stack">
        <punk-production-stat ${label} value="1234.5" unit="/min"></punk-production-stat>
        <punk-production-stat ${label} value="1234567" compact trend="up" delta="0.124" delta-percent></punk-production-stat>
        <punk-production-stat ${label} value="87" unit="%" trend="down" delta="-3"></punk-production-stat>
        <punk-production-stat ${label} value="0" unit="/s" trend="flat"></punk-production-stat>
        <punk-production-stat ${label} value="12.5" decimals="2" unit="MW" announce>${spark}</punk-production-stat>
        <punk-production-stat ${label} unit="/min"></punk-production-stat>
        <punk-production-stat ${label} value="640" unit="/min" layout="inline" trend="up" delta="40"><span slot="icon" aria-hidden="true">${gear}</span>${spark}</punk-production-stat>
        <punk-production-stat ${label} value="123456789.5" unit="kW" layout="inline" trend="up" delta="1500"></punk-production-stat>
      </div>
    `;
  },

  'connection-row': (c) => {
    // Without visible text the nodes take the same words, since a row with no nodes has no name.
    const source = `<span slot="source">${gear}${c.item || 'Iron smelter'}</span>`;
    const destination = `<span slot="destination">${gear}${c.recipe || 'Assembler'}</span>`;
    const nodes = source + destination;
    const details = `<span>${c.body}</span>`;
    const [idle, scheduled, running, low, offline] = c.statuses;
    const text = (value: string) => `<span slot="status">${value}</span>`;
    return `
      <div class="stack">
        <punk-connection-row>${nodes}</punk-connection-row>
        <punk-connection-row direction="backward" removable value="belt-2">${nodes}${details}</punk-connection-row>
        <punk-connection-row direction="both" status="info" removable>${nodes}${text(scheduled)}</punk-connection-row>
        <punk-connection-row status="success" removable>${nodes}${details}${text(running)}</punk-connection-row>
        <punk-connection-row status="warning" removable disabled>${nodes}${text(low)}</punk-connection-row>
        <punk-connection-row status="danger" removable remove-label="${c.stop}">${nodes}${details}${text(offline)}</punk-connection-row>
        <punk-connection-row>${nodes}${text(idle)}</punk-connection-row>
      </div>
    `;
  },

  stack: (c) => {
    const block = (text: string, width?: number) =>
      `<punk-panel variant="flat" style="${width ? `inline-size: ${width}px; ` : ''}min-inline-size: 0">${text}</punk-panel>`;
    return `
      ${['0', '1', '2', '3', '4', '5']
        .map(
          (gap) =>
            `<punk-stack gap="${gap}" style="max-inline-size: 320px">${block(c.start)}${block(c.pause)}${block(c.stop)}</punk-stack>`,
        )
        .join('')}
      ${['stretch', 'start', 'center', 'end']
        .map(
          (align) =>
            `<punk-stack align="${align}" style="max-inline-size: 320px">${block(c.start, 120)}${block(c.body)}</punk-stack>`,
        )
        .join('')}
      <punk-stack>${block(c.body)}<punk-stack gap="1">${block(c.pause)}${block(c.stop)}</punk-stack></punk-stack>
    `;
  },

  cluster: (c) => {
    const buttons = `<punk-button>${c.start}</punk-button><punk-button>${c.pause}</punk-button><punk-button variant="danger">${c.stop}</punk-button>`;
    return `
      ${['0', '1', '2', '3', '4', '5'].map((gap) => `<punk-cluster gap="${gap}">${buttons}</punk-cluster>`).join('')}
      ${['start', 'center', 'end', 'between']
        .map(
          (justify) =>
            `<punk-cluster justify="${justify}" style="max-inline-size: 640px">${buttons}</punk-cluster>`,
        )
        .join('')}
      ${['start', 'center', 'end', 'baseline', 'stretch']
        .map(
          (align) =>
            `<punk-cluster align="${align}"><punk-button size="lg">${c.start}</punk-button><punk-button size="sm">${c.pause}</punk-button><span>${c.footer || c.body}</span></punk-cluster>`,
        )
        .join('')}
    `;
  },

  accordion: (c) => {
    const items = (expanded: number) =>
      [c.settings, c.pause, c.stop]
        .map(
          (heading, index) =>
            `<punk-accordion-item heading="${heading}"${index === expanded ? ' expanded' : ''}${index === 2 ? ' disabled' : ''}><p style="margin: 0">${c.body}</p></punk-accordion-item>`,
        )
        .join('');
    return `
      <punk-accordion style="max-inline-size: 480px">${items(0)}</punk-accordion>
      <punk-accordion multiple style="max-inline-size: 480px">
        <punk-accordion-item heading="${c.settings}" expanded><p style="margin: 0">${c.body}</p></punk-accordion-item>
        <punk-accordion-item heading="${c.pause}" expanded><p style="margin: 0">${c.body}</p></punk-accordion-item>
        <punk-accordion-item heading="${c.stop}"><p style="margin: 0">${c.body}</p></punk-accordion-item>
      </punk-accordion>
      <punk-accordion style="max-inline-size: 480px">${items(-1)}</punk-accordion>
    `;
  },

  tabs: (c) => {
    const labels = [c.settings, c.pause, c.stop];
    const tabs = (prefix: string, selected: number) =>
      labels
        .map(
          (label, index) =>
            `<punk-tab slot="tab" panel="${prefix}${index}"${index === selected ? ' selected' : ''}${index === 2 ? ' disabled' : ''}>${label}</punk-tab>`,
        )
        .join('');
    const panels = (prefix: string) =>
      labels
        .map(
          (_, index) =>
            `<div id="${prefix}${index}" style="overflow-wrap: break-word">${c.body}</div>`,
        )
        .join('');
    return `
      <punk-tabs aria-label="${c.settings}">${tabs('g-tabs-a', -1)}${panels('g-tabs-a')}</punk-tabs>
      <punk-tabs aria-label="${c.settings}" orientation="vertical" style="max-inline-size: 480px">${tabs('g-tabs-b', 1)}${panels('g-tabs-b')}</punk-tabs>
      <div class="stack">
        <punk-tabs aria-label="${c.settings}" activation="manual">
          <punk-tab slot="tab" panel="g-tabs-c0"><span slot="icon">${gear}</span>${c.settings}</punk-tab>
          <punk-tab slot="tab" panel="g-tabs-c1">${c.pause}</punk-tab>
        </punk-tabs>
        <div id="g-tabs-c0" style="overflow-wrap: break-word">${c.body}</div>
        <div id="g-tabs-c1" style="overflow-wrap: break-word">${c.body}</div>
      </div>
    `;
  },

  tab: (c) => `
    <div role="tablist" aria-label="${c.settings}" class="row">
      <punk-tab>${c.settings}</punk-tab>
      <punk-tab selected>${c.pause}</punk-tab>
      <punk-tab disabled>${c.stop}</punk-tab>
      <punk-tab selected disabled>${c.start}</punk-tab>
      <punk-tab><span slot="icon">${gear}</span>${c.settings}</punk-tab>
    </div>
    <div role="tablist" aria-orientation="vertical" aria-label="${c.settings}" class="stack" style="max-inline-size: 240px">
      <punk-tab orientation="vertical">${c.settings}</punk-tab>
      <punk-tab selected>${c.pause}</punk-tab>
    </div>
  `,

  toolbar: (c) => {
    const actions = `
      <punk-button>${c.start}</punk-button>
      <punk-button>${c.pause}</punk-button>
      <punk-divider orientation="vertical"></punk-divider>
      <punk-icon-button label="${c.settings}">${gear}</punk-icon-button>
      <punk-button variant="danger">${c.stop}</punk-button>
    `;
    const more = `<punk-icon-button slot="overflow" label="${c.settings}">${plus}</punk-icon-button>`;
    return `
      <punk-toolbar aria-label="${c.settings}">${actions}</punk-toolbar>
      <punk-toolbar aria-label="${c.settings}" wrap style="max-inline-size: 320px">${actions}</punk-toolbar>
      <punk-toolbar aria-label="${c.settings}" style="max-inline-size: 150px">${actions}${more}</punk-toolbar>
    `;
  },

  checkbox: (c) => `
    <div class="stack">
      <punk-checkbox>${c.start}</punk-checkbox>
      <punk-checkbox checked>${c.pause}</punk-checkbox>
      <punk-checkbox indeterminate>${c.stop}</punk-checkbox>
      <punk-checkbox disabled>${c.start}</punk-checkbox>
      <punk-checkbox checked disabled>${c.pause}</punk-checkbox>
      <punk-checkbox indeterminate disabled>${c.stop}</punk-checkbox>
      <punk-checkbox required>${c.settings}</punk-checkbox>
      <punk-checkbox checked aria-label="${c.settings}"></punk-checkbox>
      <punk-checkbox>${c.body}</punk-checkbox>
    </div>
  `,

  switch: (c) => `
    <div class="stack">
      <punk-switch>${c.start}</punk-switch>
      <punk-switch checked>${c.pause}</punk-switch>
      <punk-switch disabled>${c.stop}</punk-switch>
      <punk-switch checked disabled>${c.start}</punk-switch>
      <punk-switch required>${c.settings}</punk-switch>
      <punk-switch checked aria-label="${c.settings}"></punk-switch>
      <punk-switch>${c.body}</punk-switch>
    </div>
  `,

  slider: (c) => `
    <div class="stack" style="max-inline-size: 420px">
      <punk-slider label="${c.settings}" value="40" show-value></punk-slider>
      <punk-slider label="${c.pause}" value="0" min="0" max="10" show-value ticks></punk-slider>
      <punk-slider label="${c.stop}" value="100" show-value ticks></punk-slider>
      <punk-slider aria-label="${c.settings}" value="60"></punk-slider>
      <punk-slider label="${c.start}" value="0.3" min="0" max="1" step="0.1" show-value ticks></punk-slider>
      <punk-slider label="${c.pause}" value="30" show-value disabled></punk-slider>
    </div>
  `,

  // A field marked `data-touched` shows its message, as if the user had been and left.
  'text-field': (c) => `
    <div class="stack" style="max-inline-size: 420px">
      <punk-text-field label="${c.settings}"></punk-text-field>
      <punk-text-field label="${c.settings}" value="${c.body}"></punk-text-field>
      <punk-text-field label="${c.settings}" placeholder="${c.start}"><span slot="hint">${c.footer}</span></punk-text-field>
      <punk-text-field label="${c.settings}" value="${c.pause}" readonly></punk-text-field>
      <punk-text-field label="${c.settings}" value="${c.pause}" disabled><span slot="hint">${c.footer}</span></punk-text-field>
      <punk-text-field label="${c.settings}" required data-touched><span slot="hint">${c.footer}</span></punk-text-field>
      <punk-text-field aria-label="${c.settings}" placeholder="${c.start}" type="search"></punk-text-field>
      <punk-text-field label="${c.settings}" value="${c.stop}"><span slot="prefix">${plus}</span><span slot="suffix">${c.pause}</span></punk-text-field>
      <punk-text-field label="${c.settings}" type="email" value="${c.stop}" data-touched></punk-text-field>
    </div>
  `,

  'number-field': (c) => `
    <div class="stack" style="max-inline-size: 420px">
      <punk-number-field label="${c.settings}" value="3" min="0" max="10"></punk-number-field>
      <punk-number-field label="${c.settings}" placeholder="0"><span slot="hint">${c.footer}</span></punk-number-field>
      <punk-number-field label="${c.settings}" value="40" step="5"><span slot="suffix">${c.pause}</span></punk-number-field>
      <punk-number-field label="${c.settings}" value="3" hide-steppers></punk-number-field>
      <punk-number-field label="${c.settings}" value="3" readonly></punk-number-field>
      <punk-number-field label="${c.settings}" value="3" disabled><span slot="hint">${c.footer}</span></punk-number-field>
      <punk-number-field label="${c.settings}" required data-touched></punk-number-field>
      <punk-number-field label="${c.settings}" value="11" max="10" data-touched></punk-number-field>
      <punk-number-field aria-label="${c.settings}" value="3"></punk-number-field>
    </div>
  `,

  select: (c) => `
    <div class="stack" style="max-inline-size: 420px">
      <punk-select label="${c.settings}"><option value="a">${c.start}</option><option value="b">${c.pause}</option><option value="c">${c.stop}</option></punk-select>
      <punk-select label="${c.settings}" value="b"><option value="a">${c.start}</option><option value="b">${c.pause}</option><option value="c" disabled>${c.stop}</option></punk-select>
      <punk-select label="${c.settings}"><optgroup label="${c.divider}"><option value="a">${c.start}</option><option value="b">${c.pause}</option></optgroup><optgroup label="${c.title}"><option value="c">${c.stop}</option></optgroup><span slot="hint">${c.footer}</span></punk-select>
      <punk-select label="${c.settings}" disabled><option value="a">${c.start}</option></punk-select>
      <punk-select label="${c.settings}" required data-touched><option value="">${c.divider}</option><option value="a">${c.start}</option><span slot="hint">${c.footer}</span></punk-select>
      <punk-select aria-label="${c.settings}"><option value="a">${c.start}</option><option value="b">${c.pause}</option></punk-select>
    </div>
  `,

  window: (c, { open }) => {
    const name = `heading="${c.title}" aria-label="${c.settings}"`;
    const footer = `<punk-button slot="footer" variant="primary">${c.start}</punk-button><punk-button slot="footer">${c.stop}</punk-button>`;
    const text = `<p style="margin: 0">${c.body}</p>`;
    if (open) {
      return `<punk-window ${name} modal open dismissible movable>${text}${footer}</punk-window>`;
    }
    return `
      <punk-window ${name} open>${text}</punk-window>
      <punk-window ${name} open dismissible movable><span slot="icon">${gear}</span>${text}${footer}</punk-window>
      <punk-window ${name} open dismissible style="--punk-window-max-width: 320px">${text}${footer}</punk-window>
    `;
  },

  popover: (c, { open }) => {
    const item = (text: string, extra = '') =>
      `<button role="menuitem" ${extra} style="display: block; inline-size: 100%; padding: 8px 12px; border: 0; background: transparent; color: inherit; font: inherit; text-align: start${extra ? '; opacity: 0.55' : ''}">${text}</button>`;
    // Both modes open side by side on an overlay page, since manual popovers do not close each other.
    return `
      <div class="row" style="align-items: flex-start; min-block-size: 260px">
        <punk-button>${c.start}</punk-button>
        <punk-popover${open ? ' open' : ''}><p style="margin: 0">${c.body}</p></punk-popover>
        <punk-button>${c.settings}</punk-button>
        <punk-popover mode="menu" placement="end"${open ? ' open' : ''}>
          ${item(c.pause)}${item(c.stop, 'disabled')}${item(c.start)}
        </punk-popover>
      </div>
    `;
  },

  // The stack is empty in the default gallery: it is always in the top layer, in a corner, and
  // would cover the page. The overlays page fills it, one toast of each variant.
  'toast-stack': (c, { open }) =>
    open
      ? `<punk-toast-stack label="${c.settings}">${toasts(c)}</punk-toast-stack>`
      : `<punk-toast-stack label="${c.settings}"></punk-toast-stack>`,

  toast: (c) => `<div class="stack" style="max-inline-size: 420px">${toasts(c)}</div>`,

  dialog: (c, { open }) => `
    <punk-dialog heading="${c.title}" aria-label="${c.settings}"${open ? ' open' : ''}>
      <p style="margin: 0">${c.body}</p>
      <punk-button slot="footer" variant="danger">${c.stop}</punk-button>
      <punk-button slot="footer">${c.pause}</punk-button>
    </punk-dialog>
  `,

  'accordion-item': (c) => `
    <div class="stack" style="max-inline-size: 480px">
      <punk-accordion-item heading="${c.settings}"><p style="margin: 0">${c.body}</p></punk-accordion-item>
      <punk-accordion-item heading="${c.settings}" expanded><p style="margin: 0">${c.body}</p></punk-accordion-item>
      <punk-accordion-item heading="${c.pause}" disabled><p style="margin: 0">${c.body}</p></punk-accordion-item>
      <punk-accordion-item heading="${c.pause}" expanded disabled><p style="margin: 0">${c.body}</p></punk-accordion-item>
      <punk-accordion-item heading="${c.stop}" level="2" expanded><span slot="icon">${gear}</span><p style="margin: 0">${c.body}</p></punk-accordion-item>
      <punk-accordion-item expanded><span slot="heading">${c.settings} <b>${c.pause}</b></span><p style="margin: 0">${c.body}</p></punk-accordion-item>
    </div>
  `,
};

/** HTML for one component's states. */
export function componentHtml(
  name: ComponentName,
  variant: ContentVariant,
  options: BuildOptions = {},
): string {
  return builders[name](copy[variant], options);
}

/** A container holding a section for each requested component, language and direction set. */
export function buildGallery(
  variant: ContentVariant,
  names: readonly ComponentName[] = componentNames,
  options: BuildOptions = {},
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
          ${componentHtml(name, variant, options)}
        </section>
      `,
    )
    .join('');
  applyGridValues(root);
  touchFields(root);
  return root;
}

/** A field marked `data-touched` behaves as if the user had left it, so its message shows. */
function touchFields(root: ParentNode): void {
  for (const field of root.querySelectorAll('[data-touched]')) {
    field.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
  }
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
  .gallery punk-toast::part(toast) { animation: none; }
  .gallery .caption { margin: 0; font: 12px/1.2 var(--punk-font-mono, monospace); color: var(--punk-color-text-muted, #b8b4a7); }
`;
