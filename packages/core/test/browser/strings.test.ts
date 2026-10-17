import { configureLocalization } from '@lit/localize';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import { buildGallery, componentNames, galleryCss, openTooltips } from './fixtures/gallery.ts';
import type { ComponentName } from './fixtures/gallery.ts';
import * as pseudo from './fixtures/generated/en-x-pseudo.ts';

// specs/localization.md, Verification. The page is configured once, with the pseudo-locale `en-x-pseudo` that
// `scripts/build-pseudo.ts` writes: every message wrapped in ⟦ ⟧. A word that a component writes
// in itself instead of through `msg()` has no markers, and a component that is not drawn again on
// a locale change keeps its English.
const { setLocale } = configureLocalization({
  sourceLocale: 'en',
  targetLocales: ['en-x-pseudo'],
  loadLocale: async () => pseudo,
});

const OPEN = '⟦';
const CLOSE = '⟧';
const PSEUDO = 'en-x-pseudo';

beforeEach(() => {
  addStylesheets();
  const style = document.createElement('style');
  style.textContent = galleryCss;
  track(style, document.head);
});

afterEach(async () => {
  cleanup();
  await setLocale('en');
});

type Updating = HTMLElement & { updateComplete: Promise<boolean> };

async function settle(root: Element): Promise<void> {
  const elements = [root, ...root.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('punk-'),
  ) as Updating[];
  await Promise.all(elements.map((element) => element.updateComplete));
  for (let round = 0; round < 2; round++) {
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all(elements.map((element) => element.updateComplete));
  }
}

/** The words a component shows or names itself with: its text, and its ARIA labels. */
function words(element: Element): string {
  const root = element.shadowRoot as ShadowRoot;
  const labels = [...root.querySelectorAll('[aria-label], [aria-valuetext], [title]')].map(
    (node) =>
      `${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('aria-valuetext') ?? ''} ${node.getAttribute('title') ?? ''}`,
  );
  return `${root.textContent} ${labels.join(' ')}`;
}

async function mount(markup: string): Promise<Updating> {
  const stage = track(document.createElement('div'));
  stage.innerHTML = markup;
  const element = stage.firstElementChild as Updating;
  await settle(element);
  return element;
}

const art =
  '<svg slot="icon" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3"/></svg>';

interface Case {
  /** The element that says the message, in the state that shows it. */
  show: () => Promise<Updating>;
}

// One entry for each message id. A message with no entry fails the first test, so a new message
// needs a fixture that shows it.
const cases: Record<string, Case> = {
  close: { show: () => mount('<punk-window heading="W" open dismissible></punk-window>') },
  dismiss: { show: () => mount('<punk-toast duration="0">Saved</punk-toast>') },
  decrease: { show: () => mount('<punk-number-field label="Count"></punk-number-field>') },
  increase: { show: () => mount('<punk-number-field label="Count"></punk-number-field>') },
  moveWindow: { show: () => mount('<punk-window heading="W" open movable></punk-window>') },
  moving: {
    show: async () => {
      const window = await mount('<punk-window heading="W" open movable></punk-window>');
      window.shadowRoot?.querySelector<HTMLElement>('[part="move-button"]')?.click();
      await settle(window);
      return window;
    },
  },
  notifications: { show: () => mount('<punk-toast-stack></punk-toast-stack>') },
  loading: { show: () => mount('<punk-button loading>Start</punk-button>') },
  invalid: { show: () => mount(`<punk-slot label="Slot" invalid>${art}</punk-slot>`) },
  invalidField: {
    show: async () => {
      const field = await mount('<punk-text-field label="Name" required></punk-text-field>');
      const input = field.shadowRoot?.querySelector('input') as HTMLInputElement;
      input.focus();
      input.blur();
      await settle(field);
      return field;
    },
  },
  stackCount: {
    show: () => mount(`<punk-item-stack name="Coil" count="5">${art}</punk-item-stack>`),
  },
  stackCapacity: {
    show: () =>
      mount(`<punk-item-stack name="Coil" count="3" capacity="9">${art}</punk-item-stack>`),
  },
  durability: {
    show: () => mount(`<punk-item-stack name="Coil" durability="0.4">${art}</punk-item-stack>`),
  },
  quality: {
    show: () => mount(`<punk-item-stack name="Coil" quality="3">${art}</punk-item-stack>`),
  },
  craftable: {
    show: () => mount('<punk-recipe name="Gear" available craftable-count="3"></punk-recipe>'),
  },
  unavailable: { show: () => mount('<punk-recipe name="Gear"></punk-recipe>') },
  meterWarning: {
    show: () =>
      mount('<punk-meter label="Heat" value="15" low="30" high="70" optimum="50"></punk-meter>'),
  },
  meterCritical: {
    show: () =>
      mount('<punk-meter label="Heat" value="90" low="30" high="70" optimum="10"></punk-meter>'),
  },
  statNoValue: {
    show: () => mount('<punk-production-stat label="Output"></punk-production-stat>'),
  },
  trendUp: {
    show: () =>
      mount('<punk-production-stat label="Output" value="5" trend="up"></punk-production-stat>'),
  },
  trendDown: {
    show: () =>
      mount('<punk-production-stat label="Output" value="5" trend="down"></punk-production-stat>'),
  },
  trendFlat: {
    show: () =>
      mount('<punk-production-stat label="Output" value="5" trend="flat"></punk-production-stat>'),
  },
  connectionTo: {
    show: () =>
      mount(
        '<punk-connection-row direction="forward"><span slot="source">A</span><span slot="destination">B</span></punk-connection-row>',
      ),
  },
  connectionFrom: {
    show: () =>
      mount(
        '<punk-connection-row direction="backward"><span slot="source">A</span><span slot="destination">B</span></punk-connection-row>',
      ),
  },
  connectionBoth: {
    show: () =>
      mount(
        '<punk-connection-row direction="both"><span slot="source">A</span><span slot="destination">B</span></punk-connection-row>',
      ),
  },
  removeConnection: {
    show: () =>
      mount(
        '<punk-connection-row removable><span slot="source">A</span><span slot="destination">B</span></punk-connection-row>',
      ),
  },
  breadcrumb: {
    show: () =>
      mount(
        '<punk-breadcrumb><punk-breadcrumb-item current>Here</punk-breadcrumb-item></punk-breadcrumb>',
      ),
  },
  showPath: {
    show: () =>
      mount(
        '<punk-breadcrumb max-items="2"><punk-breadcrumb-item href="#a">A</punk-breadcrumb-item><punk-breadcrumb-item href="#b">B</punk-breadcrumb-item><punk-breadcrumb-item current>C</punk-breadcrumb-item></punk-breadcrumb>',
      ),
  },
  pagination: { show: () => mount('<punk-pagination page="2" pages="3"></punk-pagination>') },
  previousPage: { show: () => mount('<punk-pagination page="2" pages="3"></punk-pagination>') },
  nextPage: { show: () => mount('<punk-pagination page="2" pages="3"></punk-pagination>') },
  pageNumber: { show: () => mount('<punk-pagination page="2" pages="3"></punk-pagination>') },
  removeTag: { show: () => mount('<punk-tag removable>Copper</punk-tag>') },
  steps: { show: () => mount('<punk-steps><punk-step>A</punk-step></punk-steps>') },
  stepComplete: {
    show: () => step('<punk-steps current="2"><punk-step>A</punk-step></punk-steps>'),
  },
  stepUpcoming: {
    show: () => step('<punk-steps current="0"><punk-step>A</punk-step></punk-steps>'),
  },
  dropFiles: { show: () => mount('<punk-file-field label="Plans" drop-zone></punk-file-field>') },
  resizePanes: {
    show: () =>
      mount('<punk-splitter><div slot="start">A</div><div slot="end">B</div></punk-splitter>'),
  },
};

/** The first step of the steps in `markup`, which says the word for its state. */
async function step(markup: string): Promise<Updating> {
  const steps = await mount(markup);
  return steps.querySelector('punk-step') as Updating;
}

/** The pieces of a template that are fixed text: the whole string, or what lies between values. */
function fragments(id: string): string[] {
  const template = (pseudo.templates as Record<string, unknown>)[id];
  const pieces =
    typeof template === 'string' ? [template] : (template as { strings: string[] }).strings;
  return pieces.filter((piece) => piece !== '');
}

const ids = Object.keys(pseudo.templates);

describe('every message reaches the screen', () => {
  it('has a fixture for each message in the XLIFF, and for no other', () => {
    expect(Object.keys(cases).sort()).toEqual([...ids].sort());
    expect(ids.length).toBeGreaterThanOrEqual(26);
  });

  it.each(ids)(
    '%s carries the markers in the pseudo-locale, and is English again after',
    async (id) => {
      const element = await (cases[id] as Case).show();
      const english = words(element);
      expect(english, 'English first').not.toContain(OPEN);

      await setLocale(PSEUDO);
      await settle(element);
      const shown = words(element);
      for (const piece of fragments(id)) expect(shown, piece).toContain(piece);
      expect(shown).toContain(OPEN);

      await setLocale('en');
      await settle(element);
      expect(element.isConnected).toBe(true);
      expect(words(element)).toBe(english);
    },
  );
});

interface Word {
  tag: string;
  where: string;
  text: string;
}

/** Every text node of a shadow root, and every ARIA label in it, that contains a letter. */
function wordsOf(host: Element): Word[] {
  const root = host.shadowRoot as ShadowRoot;
  const found: Word[] = [];
  const add = (where: string, raw: string | null) => {
    const text = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (/\p{L}/u.test(text)) found.push({ tag: host.localName, where, text });
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.localName === 'style') continue;
    add(`<${node.parentElement?.className || node.parentElement?.localName}>`, node.textContent);
  }
  for (const element of root.querySelectorAll('[aria-label], [aria-valuetext], [title]')) {
    for (const name of ['aria-label', 'aria-valuetext', 'title']) {
      add(`[${name}]`, element.getAttribute(name));
    }
  }
  return found;
}

/** What the application wrote: the attributes of the host, which a component draws as they are. */
const applicationTexts = (host: Element): string[] =>
  host.getAttributeNames().map((name) => (host.getAttribute(name) ?? '').trim());

// Text that is not a message, each with its reason, so a literal that is put back in a component
// is not hidden by it.
const exempt: Array<{
  reason: string;
  applies: (host: Element, word: Word, gallery: Element) => boolean;
}> = [
  {
    reason: 'an attribute of the host, which the application wrote',
    applies: (host, word) => applicationTexts(host).includes(word.text),
  },
  {
    reason: 'the compact count of a number, such as 1.2K, which Intl makes',
    applies: (_host, word) => /^[\d.,\s\u00a0\u202f]+[KMBT]$/.test(word.text),
  },
  {
    reason: 'the duration of a recipe, with the unit that Intl.NumberFormat adds',
    applies: (_host, word) => /^[\d.,\s\u00a0]+ (?:sec|s|min|h)$/.test(word.text),
  },
  {
    reason:
      "the browser's own validation message, which follows the browser and not the locale (decision 11)",
    applies: (host, word) => word.text === (host as HTMLInputElement).validationMessage,
  },
  {
    reason: "the options of a select, which are the application's text",
    applies: (_host, word) => word.where === '<option>',
  },
  {
    reason: "the name of a table's scroll area, which is the application's caption",
    applies: (host, word) =>
      host.localName === 'punk-table' &&
      word.where === '[aria-label]' &&
      host.querySelector('caption')?.textContent?.trim() === word.text,
  },
  {
    reason: "the text of a tooltip that describes a control, which is the application's",
    applies: (_host, word, gallery) =>
      [...gallery.querySelectorAll('punk-tooltip')].some(
        (tooltip) => tooltip.textContent?.replace(/\s+/g, ' ').trim() === word.text,
      ),
  },
];

const usedExemptions = new Set<string>();

describe('no hardcoded words', () => {
  async function scan(names: readonly ComponentName[], open: boolean): Promise<string[]> {
    const gallery = buildGallery('short', names, { open });
    track(gallery);
    await settle(gallery);
    openTooltips(gallery);
    await settle(gallery);
    const problems: string[] = [];
    for (const host of gallery.querySelectorAll('*')) {
      if (!host.localName.startsWith('punk-') || !host.shadowRoot) continue;
      for (const word of wordsOf(host)) {
        if (word.text.includes(OPEN) && word.text.includes(CLOSE)) continue;
        const reason = exempt.find(({ applies }) => applies(host, word, gallery))?.reason;
        if (reason) {
          usedExemptions.add(reason);
          continue;
        }
        problems.push(`${word.tag} ${word.where}: "${word.text}"`);
      }
    }
    return [...new Set(problems)];
  }

  it('finds every word of the gallery in markers, except application text and Intl text', async () => {
    await setLocale(PSEUDO);
    expect(await scan(componentNames, false)).toEqual([]);
  });

  it.each(['dialog', 'window', 'popover', 'toast-stack', 'drawer', 'menu'] as const)(
    'finds every word of an open %s in markers',
    async (name) => {
      await setLocale(PSEUDO);
      expect(await scan([name], true)).toEqual([]);
    },
  );

  it('uses every exemption, so none is left over', () => {
    expect(
      exempt.map(({ reason }) => reason).filter((reason) => !usedExemptions.has(reason)),
    ).toEqual([]);
  });
});
