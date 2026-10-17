import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, rgb, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import './register.ts';
import type { ConnectionDirection, ConnectionStatus, PunkConnectionRow } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
  await setLocale('en');
});

const nodes = '<span slot="source">Iron smelter</span><span slot="destination">Assembler</span>';

async function mount(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkConnectionRow> {
  const element = document.createElement('punk-connection-row');
  element.innerHTML = options.content ?? nodes;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function container(attributes: Record<string, string> = {}, width?: number): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (width !== undefined) element.style.inlineSize = `${width}px`;
  return track(element);
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const button = (element: Element) => part(element, 'remove-button') as HTMLButtonElement;
const arrow = (element: Element) => element.shadowRoot?.querySelector('.arrow') as HTMLElement;
const rect = (element: Element) => element.getBoundingClientRect();
const shape = (element: Element) => element.shadowRoot?.querySelector('.shape') as HTMLElement;
const statuses: ConnectionStatus[] = ['neutral', 'info', 'success', 'warning', 'danger'];

/** What a person or a screen reader meets, in order: text, slotted text, and the button's name. */
function reading(node: Node): string[] {
  if (node instanceof Text) return node.data.trim() ? [node.data.trim()] : [];
  if (node instanceof HTMLSlotElement)
    return node.assignedNodes({ flatten: true }).flatMap(reading);
  if (node instanceof HTMLStyleElement) return [];
  if (node instanceof Element) {
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return [];
    if (node.localName === 'button') return [`[${node.getAttribute('aria-label')}]`];
    const children = node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes;
    return [...children].flatMap(reading);
  }
  return [...node.childNodes].flatMap(reading);
}

/** The angle the arrow is turned by, in degrees. */
function turn(element: Element): number {
  const value = getComputedStyle(arrow(element)).rotate;
  return value === 'none' ? 0 : parseFloat(value);
}

const DETAILS = '<span>2 per second</span>';

describe('structure', () => {
  it.each<[ConnectionDirection, string]>([
    ['forward', 'to'],
    ['backward', 'from'],
    ['both', 'to and from'],
  ])(
    'is source, the word, destination, details, status, and button, in order: %s',
    async (direction, word) => {
      const element = await mount(
        { direction, status: 'success', removable: '' },
        { content: `${nodes}${DETAILS}<span slot="status">Running</span>` },
      );
      expect(reading(element)).toEqual([
        'Iron smelter',
        word,
        'Assembler',
        '2 per second',
        'Running',
        '[Remove connection: Iron smelter, Assembler]',
      ]);
    },
  );

  it('keeps that order in right-to-left, and draws the source on the right', async () => {
    const element = await mount(
      { removable: '' },
      { content: `${nodes}${DETAILS}`, parent: container({ dir: 'rtl' }, 500) },
    );
    expect(reading(element).slice(0, 3)).toEqual(['Iron smelter', 'to', 'Assembler']);
    expect(rect(part(element, 'source')).left).toBeGreaterThan(
      rect(part(element, 'destination')).left,
    );
    expect(rect(button(element)).left).toBeLessThan(rect(part(element, 'destination')).left);
  });

  it('has no role and no name of its own', async () => {
    const element = await mount();
    expect(element.hasAttribute('role')).toBe(false);
    expect(element.hasAttribute('aria-label')).toBe(false);
    expect(element.shadowRoot?.querySelector('[role], [aria-label], [tabindex]')).toBeNull();
  });

  it('draws the parts it has, and leaves out the details, status, and button it has none of', async () => {
    const bare = await mount();
    for (const name of ['row', 'source', 'direction', 'destination']) {
      expect(part(bare, name), name).toBeTruthy();
    }
    for (const name of ['details', 'status']) expect(part(bare, name).hidden, name).toBe(true);
    expect(button(bare)).toBeNull();
    const full = await mount(
      { status: 'info', removable: '' },
      { content: `${nodes}${DETAILS}<span slot="status">Waiting</span>` },
    );
    for (const name of ['details', 'status', 'indicator', 'status-label', 'remove-button']) {
      expect(part(full, name), name).toBeTruthy();
      expect(part(full, name).hidden, name).toBe(false);
    }
  });

  it('is a block drawn on a plate', async () => {
    const element = await mount();
    expect(getComputedStyle(element).display).toBe('block');
    expect(getComputedStyle(part(element, 'row')).backgroundColor).toBe(
      rgb(themes['industrial'].tokens['color-panel-inset'] as string),
    );
  });
});

describe('direction', () => {
  it.each<[string, string, number]>([
    ['forward', 'ltr', 0],
    ['backward', 'ltr', 180],
    ['both', 'ltr', 0],
    ['forward', 'rtl', 180],
    ['backward', 'rtl', 0],
    ['both', 'rtl', 0],
  ])('points the arrow of %s in %s at %i degrees', async (direction, dir, degrees) => {
    const element = await mount({ direction }, { parent: container({ dir }, 500) });
    expect(turn(element)).toBe(degrees);
  });

  it('gives both two heads and a single arrow one', async () => {
    const both = getComputedStyle(arrow(await mount({ direction: 'both' }))).clipPath;
    const forward = getComputedStyle(arrow(await mount({ direction: 'forward' }))).clipPath;
    expect(both.split(',').length).toBe(10);
    expect(forward.split(',').length).toBe(7);
  });

  it('draws forward as an arrow pointing at the destination', async () => {
    const element = await mount({}, { parent: container({}, 500) });
    expect(rect(arrow(element)).left).toBeGreaterThanOrEqual(
      rect(part(element, 'source')).right - 1,
    );
    expect(rect(arrow(element)).right).toBeLessThanOrEqual(
      rect(part(element, 'destination')).left + 1,
    );
    expect(getComputedStyle(arrow(element)).clipPath).toMatch(/^polygon\(0px 42%, 55% 42%/);
  });

  it('says a different word for each direction, and treats an unknown one as forward', async () => {
    const word = async (direction: string) =>
      (await mount({ direction })).shadowRoot?.querySelector('.visually-hidden')?.textContent;
    expect(await word('forward')).toBe('to');
    expect(await word('backward')).toBe('from');
    expect(await word('both')).toBe('to and from');
    expect(await word('sideways')).toBe('to');
    expect(arrow(await mount({ direction: 'sideways' })).className).toContain('forward');
  });

  it('hides the arrow from assistive technology, and leaves the word', async () => {
    const element = await mount();
    expect(arrow(element).getAttribute('aria-hidden')).toBe('true');
    expect(part(element, 'direction').textContent?.trim()).toBe('to');
  });

  it('says the words in the page locale', async () => {
    await setLocale('de');
    for (const [direction, word] of [
      ['forward', 'nach'],
      ['backward', 'von'],
      ['both', 'hin und zurück'],
    ] as const) {
      const element = await mount({ direction });
      expect(part(element, 'direction').textContent?.trim()).toBe(word);
    }
  });
});

describe('status', () => {
  const content = '<span slot="status">Running</span>';

  it('draws nothing for a neutral row with no status text, and the ring with some', async () => {
    const quiet = await mount();
    expect(part(quiet, 'status').hidden).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    const text = await mount({}, { content: `${nodes}${content}` });
    expect(part(text, 'status').hidden).toBe(false);
    expect(getComputedStyle(shape(text)).borderTopWidth).toBe('2px');
  });

  it('shows the status text beside the shape, and hides the shape from assistive technology', async () => {
    const element = await mount({ status: 'success' }, { content: `${nodes}${content}` });
    expect(part(element, 'indicator').getAttribute('aria-hidden')).toBe('true');
    const label = part(element, 'status-label');
    expect(label.querySelector('slot')?.assignedElements()[0]?.textContent).toBe('Running');
    expect(rect(label).left).toBeGreaterThanOrEqual(rect(part(element, 'indicator')).right - 1);
  });

  it('gives every status its own shape, and keeps them apart under forced colors', async () => {
    const silhouette = async () => {
      const found = new Set<string>();
      for (const status of statuses) {
        const style = getComputedStyle(shape(await mount({ status }, { content: nodes })));
        found.add(
          [
            style.clipPath,
            style.borderTopLeftRadius,
            style.borderTopWidth,
            style.backgroundColor === 'rgba(0, 0, 0, 0)',
          ].join('|'),
        );
      }
      return found;
    };
    expect((await silhouette()).size).toBe(5);
    await commands.setForcedColors('active');
    expect((await silhouette()).size).toBe(5);
    for (const status of statuses.slice(1)) {
      const style = getComputedStyle(shape(await mount({ status }, { content: nodes })));
      expect(style.backgroundColor, status).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  it('draws the shape in an inset lens in the color of the status, and a different color for each', async () => {
    const colors = new Set<string>();
    for (const status of statuses) {
      const lens = getComputedStyle(part(await mount({ status }), 'indicator'));
      colors.add(lens.color);
      expect(toHex(lens.backgroundColor)).toBe(themes['industrial'].tokens['color-panel-inset']);
    }
    expect(colors.size).toBe(5);
  });

  it('treats an unknown status as neutral', async () => {
    const odd = await mount({ status: 'broken' }, { content: `${nodes}${content}` });
    expect(part(odd, 'indicator').className).toContain('variant-neutral');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once for a status other than neutral with no text, and not for one with', async () => {
    const element = await mount({ status: 'danger' });
    element.requestUpdate();
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/`status`/);
    warn.mockClear();
    await mount({ status: 'danger' }, { content: `${nodes}${content}` });
    expect(warn).not.toHaveBeenCalled();
  });

  it('draws the shape alone, with no gap after it, when there is no status text', async () => {
    const element = await mount({ status: 'danger' });
    expect(part(element, 'status-label').hidden).toBe(true);
    expect(rect(part(element, 'status')).width).toBeCloseTo(
      rect(part(element, 'indicator')).width,
      0,
    );
  });

  it('follows a status text that arrives later', async () => {
    const element = await mount({ status: 'warning' }, { content: nodes });
    warn.mockClear();
    const text = document.createElement('span');
    text.slot = 'status';
    text.textContent = 'Low on fuel';
    element.append(text);
    await vi.waitFor(() => expect(part(element, 'status-label').hidden).toBe(false));
  });
});

describe('details', () => {
  it('shows the details only when there are some, and draws them between the nodes and the status', async () => {
    const element = await mount(
      { status: 'info' },
      {
        content: `${nodes}${DETAILS}<span slot="status">Waiting</span>`,
        parent: container({}, 600),
      },
    );
    expect(part(element, 'details').hidden).toBe(false);
    expect(rect(part(element, 'details')).left).toBeGreaterThanOrEqual(
      rect(part(element, 'destination')).right - 1,
    );
    expect(rect(part(element, 'status')).left).toBeGreaterThanOrEqual(
      rect(part(element, 'details')).right - 1,
    );
    expect(part(await mount(), 'details').hidden).toBe(true);
  });

  it('counts text in the default slot as details', async () => {
    const element = await mount({}, { content: `${nodes}Every 5 s` });
    expect(part(element, 'details').hidden).toBe(false);
  });
});

describe('the remove button', () => {
  it('is a native button only with removable, and a row without it has no tab stop', async () => {
    const plain = await mount();
    expect(button(plain)).toBeNull();
    expect(plain.shadowRoot?.querySelector('button, [tabindex]')).toBeNull();
    const element = await mount({ removable: '' });
    expect(button(element).localName).toBe('button');
    expect(button(element).type).toBe('button');
    element.removable = false;
    await element.updateComplete;
    expect(button(element)).toBeNull();
  });

  it('is named from the text of the source and the destination', async () => {
    const element = await mount({ removable: '' });
    expect(button(element).getAttribute('aria-label')).toBe(
      'Remove connection: Iron smelter, Assembler',
    );
  });

  it('reads the text of a node with an icon and a label as one line', async () => {
    const element = await mount(
      { removable: '' },
      {
        content:
          '<span slot="source"><svg aria-hidden="true"></svg>\n  Iron   smelter\n</span><span slot="destination">Assembler 2</span>',
      },
    );
    expect(button(element).getAttribute('aria-label')).toBe(
      'Remove connection: Iron smelter, Assembler 2',
    );
  });

  it('follows a slotchange, and a remove-label replaces the name', async () => {
    const element = await mount({ removable: '' });
    const next = document.createElement('span');
    next.slot = 'destination';
    next.textContent = 'Chest';
    element.querySelector('[slot="destination"]')?.replaceWith(next);
    await vi.waitFor(() =>
      expect(button(element).getAttribute('aria-label')).toBe(
        'Remove connection: Iron smelter, Chest',
      ),
    );
    element.removeLabel = 'Remove the iron line';
    await element.updateComplete;
    expect(button(element).getAttribute('aria-label')).toBe('Remove the iron line');
    expect(element.getAttribute('remove-label')).toBe('Remove the iron line');
    element.removeLabel = '';
    await element.updateComplete;
    expect(button(element).getAttribute('aria-label')).toBe(
      'Remove connection: Iron smelter, Chest',
    );
  });

  it('is named in the page locale, and changes with it', async () => {
    const element = await mount({ removable: '' });
    await setLocale('de');
    await vi.waitFor(() =>
      expect(button(element).getAttribute('aria-label')).toBe(
        'Verbindung entfernen: Iron smelter, Assembler',
      ),
    );
    await setLocale('en');
    await vi.waitFor(() =>
      expect(button(element).getAttribute('aria-label')).toBe(
        'Remove connection: Iron smelter, Assembler',
      ),
    );
  });

  it('is the only tab stop, and the row is passed in one Tab', async () => {
    const parent = container();
    parent.innerHTML = '<button id="before">Before</button>';
    const element = await mount(
      { removable: '' },
      { content: `${nodes}${DETAILS}<span slot="status">Running</span>`, parent },
    );
    parent.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
    (parent.querySelector('#before') as HTMLElement).focus();
    await userEvent.tab();
    expect(element.shadowRoot?.activeElement).toBe(button(element));
    await userEvent.tab();
    expect(document.activeElement?.id).toBe('after');
  });

  it('is at the inline end of the row, with a 40px target for a coarse pointer', async () => {
    const element = await mount({ removable: '' }, { parent: container({}, 600) });
    const plate = rect(part(element, 'row'));
    expect(plate.right - rect(button(element)).right).toBeLessThan(20);
    const rtl = await mount({ removable: '' }, { parent: container({ dir: 'rtl' }, 600) });
    expect(rect(button(rtl)).left - rect(part(rtl, 'row')).left).toBeLessThan(20);
  });
});

describe('removing', () => {
  /** The events that reach the document, as the application would hear them. */
  function listen() {
    const events: CustomEvent[] = [];
    const handler = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener('punk-remove', handler);
    return { events, stop: () => document.removeEventListener('punk-remove', handler) };
  }

  it('sends punk-remove from a click, once, with its value and itself, and stays in the page', async () => {
    const element = await mount({ removable: '', value: 'belt-7' });
    const { events, stop } = listen();
    button(element).click();
    stop();
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ value: 'belt-7', item: element });
    expect(events[0]?.detail.item).toBe(element);
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
    expect(events[0]?.cancelable).toBe(false);
    expect(events[0]?.target).toBe(element);
    expect(element.isConnected).toBe(true);
    expect(button(element).isConnected).toBe(true);
  });

  it.each(['{Enter}', ' '])('sends it once for %j on the button', async (key) => {
    const element = await mount({ removable: '' });
    const { events, stop } = listen();
    button(element).focus();
    await userEvent.keyboard(key);
    stop();
    expect(events).toHaveLength(1);
  });

  it('sends it for the row that was used, with the value of the row at that time', async () => {
    const parent = container();
    const first = await mount({ removable: '', value: 'a' }, { parent });
    const second = await mount({ removable: '', value: 'b' }, { parent });
    const { events, stop } = listen();
    second.value = 'c';
    await second.updateComplete;
    button(second).click();
    button(first).click();
    stop();
    expect(events.map((event) => event.detail.value)).toEqual(['c', 'a']);
  });

  it('sends nothing for a click on the row outside the button', async () => {
    const element = await mount({ removable: '' });
    const { events, stop } = listen();
    part(element, 'source').click();
    part(element, 'row').click();
    element.click();
    stop();
    expect(events).toEqual([]);
  });
});

describe('disabled', () => {
  it('disables the button and takes it out of the tab order, and sends nothing', async () => {
    const parent = container();
    parent.innerHTML = '<button id="before">Before</button>';
    const element = await mount({ removable: '', disabled: '' }, { parent });
    const after = document.createElement('button');
    after.id = 'after';
    parent.append(after);
    expect(button(element).disabled).toBe(true);
    const events: Event[] = [];
    document.addEventListener('punk-remove', (event) => events.push(event), { once: true });
    button(element).click();
    expect(events).toEqual([]);
    (parent.querySelector('#before') as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement?.id).toBe('after');
  });

  it('leaves every word readable, and the button dimmed', async () => {
    const live = await mount({ removable: '' });
    const element = await mount({ removable: '', disabled: '' });
    expect(reading(element)).toEqual(reading(live));
    expect(getComputedStyle(part(element, 'source')).color).toBe(
      getComputedStyle(part(live, 'source')).color,
    );
    const tokens = themes['industrial'].tokens;
    expect(toHex(getComputedStyle(button(element)).color)).toBe(tokens['color-disabled-text']);
    expect(toHex(getComputedStyle(button(element)).backgroundColor)).toBe(
      tokens['color-disabled-fill'],
    );
  });

  it('follows the property in both directions', async () => {
    const element = await mount({ removable: '' });
    element.disabled = true;
    await element.updateComplete;
    expect(button(element).disabled).toBe(true);
    expect(element.hasAttribute('disabled')).toBe(true);
    element.removeAttribute('disabled');
    await element.updateComplete;
    expect(button(element).disabled).toBe(false);
  });
});

describe('layout and size', () => {
  const content = `${nodes}${DETAILS}<span slot="status">Running</span>`;
  const attributes = { status: 'success', removable: '' };

  it('puts everything on one line where the row is 360px or wider', async () => {
    for (const width of [360, 600]) {
      const element = await mount(attributes, { content, parent: container({}, width) });
      const middle = (node: Element) => (rect(node).top + rect(node).bottom) / 2;
      const line = middle(button(element));
      for (const name of ['source', 'destination', 'details', 'status']) {
        expect(rect(part(element, name)).top, `${name} at ${width}`).toBeLessThan(line);
        expect(rect(part(element, name)).bottom, `${name} at ${width}`).toBeGreaterThan(line);
      }
      expect(rect(part(element, 'destination')).left).toBeGreaterThanOrEqual(
        rect(part(element, 'source')).right - 1,
      );
    }
  });

  it('stacks the nodes below 360px, with the details and the status on their own lines', async () => {
    for (const width of [359, 300, 187]) {
      const element = await mount(attributes, { content, parent: container({}, width) });
      const source = rect(part(element, 'source'));
      const destination = rect(part(element, 'destination'));
      const details = rect(part(element, 'details'));
      const status = rect(part(element, 'status'));
      expect(destination.top, `${width}`).toBeGreaterThanOrEqual(source.bottom - 1);
      expect(details.top, `${width}`).toBeGreaterThanOrEqual(destination.bottom - 1);
      expect(status.top, `${width}`).toBeGreaterThanOrEqual(details.bottom - 1);
      const press = rect(button(element));
      expect(press.top, `${width}`).toBeLessThan(source.bottom);
      expect(rect(part(element, 'row')).right - press.right, `${width}`).toBeLessThan(20);
    }
  });

  it.each([
    ['ltr', 'forward', 90],
    ['ltr', 'backward', -90],
    ['ltr', 'both', 90],
    ['rtl', 'forward', 90],
    ['rtl', 'backward', -90],
    ['rtl', 'both', 90],
  ])('turns the arrow, in %s %s, to %i degrees when stacked', async (dir, direction, degrees) => {
    const element = await mount({ direction }, { parent: container({ dir }, 300) });
    expect(turn(element)).toBe(degrees);
    const wide = await mount({ direction }, { parent: container({ dir }, 400) });
    expect([0, 180]).toContain(turn(wide));
  });

  it('does not scroll sideways at 187px with long names', async () => {
    const long = 'Verarbeitungsanlagenbezeichnungsverzeichnis';
    const element = await mount(
      { status: 'warning', removable: '' },
      {
        content: `<span slot="source">${long} of the north works</span><span slot="destination">${long}</span><span>${long}</span><span slot="status">${long}</span>`,
        parent: container({}, 187),
      },
    );
    const plate = part(element, 'row');
    expect(plate.scrollWidth).toBeLessThanOrEqual(plate.clientWidth);
    expect(rect(element).width).toBeLessThanOrEqual(187);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
    for (const name of ['source', 'destination', 'details', 'status']) {
      expect(rect(part(element, name)).right, name).toBeLessThanOrEqual(rect(plate).right);
    }
  });

  it('keeps the one-line row from overflowing at 360px with long text', async () => {
    const long = 'Verarbeitungsanlagenbezeichnungsverzeichnis';
    const element = await mount(
      { status: 'warning', removable: '' },
      {
        content: `<span slot="source">${long}</span><span slot="destination">${long}</span><span>${long}</span><span slot="status">${long}</span>`,
        parent: container({}, 360),
      },
    );
    const plate = part(element, 'row');
    expect(plate.scrollWidth).toBeLessThanOrEqual(plate.clientWidth);
  });
});

describe('colors and contrast', () => {
  it('draws the nodes, details, and status text in text on panel-inset, in every theme', async () => {
    for (const theme of themeNames) {
      const tokens = themes[theme].tokens;
      const wrapper = container({ 'data-punk-theme': theme });
      const element = await mount(
        { status: 'warning', removable: '' },
        { content: `${nodes}${DETAILS}<span slot="status">Low</span>`, parent: wrapper },
      );
      const plate = toHex(getComputedStyle(part(element, 'row')).backgroundColor);
      expect(plate, theme).toBe(tokens['color-panel-inset']);
      for (const name of ['source', 'destination', 'details', 'status-label']) {
        const color = toHex(getComputedStyle(part(element, name)).color);
        expect(color, `${theme} ${name}`).toBe(tokens['color-text']);
        expect(ratio(color, plate), `${theme} ${name}`).toBeGreaterThanOrEqual(
          theme === 'high-contrast' ? 7 : 4.5,
        );
      }
      expect(
        ratio(toHex(getComputedStyle(arrow(element)).backgroundColor), plate),
        theme,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the plate border, and draws the arrow and the X in ButtonText, under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await mount({ direction: 'both', removable: '' });
    const plate = getComputedStyle(part(element, 'row'));
    expect(plate.borderTopWidth).toBe('2px');
    expect(plate.boxShadow).toBe('none');
    const text = getComputedStyle(button(element)).color;
    expect(getComputedStyle(arrow(element)).backgroundColor).toBe(text);
    expect(
      getComputedStyle(button(element).querySelector('.glyph') as Element).backgroundColor,
    ).toBe(text);
    const disabled = await mount({ removable: '', disabled: '' });
    expect(getComputedStyle(button(disabled)).color).not.toBe(text);
  });
});

describe('properties', () => {
  it('read their attributes, and reflect back, before and after connection', async () => {
    const before = document.createElement('punk-connection-row');
    before.direction = 'both';
    before.status = 'danger';
    before.removable = true;
    before.removeLabel = 'Remove it';
    before.disabled = true;
    before.value = 'x';
    track(before);
    await before.updateComplete;
    expect(before.getAttribute('direction')).toBe('both');
    expect(before.getAttribute('status')).toBe('danger');
    expect(before.hasAttribute('removable')).toBe(true);
    expect(before.getAttribute('remove-label')).toBe('Remove it');
    expect(before.hasAttribute('disabled')).toBe(true);
    expect(before.getAttribute('value')).toBe('x');

    const element = await mount({ direction: 'backward', status: 'info', value: 'y' });
    expect([element.direction, element.status, element.value]).toEqual(['backward', 'info', 'y']);
    const fresh = document.createElement('punk-connection-row');
    expect([
      fresh.direction,
      fresh.status,
      fresh.removable,
      fresh.removeLabel,
      fresh.disabled,
      fresh.value,
    ]).toEqual(['forward', 'neutral', false, '', false, '']);
  });

  it('draws again for each change, and shows it at once', async () => {
    const element = await mount({ removable: '' });
    element.direction = 'both';
    await element.updateComplete;
    expect(part(element, 'direction').textContent?.trim()).toBe('to and from');
    element.status = 'danger';
    await element.updateComplete;
    expect(part(element, 'indicator').className).toContain('variant-danger');
  });
});

describe('quiet', () => {
  it('has no animation or transition, so there is nothing for reduced motion to remove', async () => {
    const element = await mount({ status: 'info', removable: '' });
    for (const node of element.shadowRoot?.querySelectorAll('*') ?? []) {
      expect(getComputedStyle(node).transitionDuration, node.className).toBe('0s');
      expect(getComputedStyle(node).animationName).toBe('none');
    }
    element.direction = 'both';
    await element.updateComplete;
    expect(element.shadowRoot?.getAnimations?.() ?? []).toEqual([]);
  });

  it('adds a listener only to its remove button, and creates no observer', async () => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const observers: string[] = [];
    for (const name of ['ResizeObserver', 'IntersectionObserver', 'MutationObserver'] as const) {
      const Original = globalThis[name] as new (...args: never[]) => object;
      vi.stubGlobal(
        name,
        class extends Original {
          constructor(...args: never[]) {
            super(...args);
            observers.push(name);
          }
        },
      );
    }
    const element = await mount({ status: 'info', removable: '' });
    const on = (target: unknown) =>
      add.mock.calls
        .filter((_call, index) => add.mock.contexts[index] === target)
        .map(([type]) => type);
    expect(on(element)).toEqual([]);
    expect(on(document)).toEqual([]);
    expect(on(window)).toEqual([]);
    expect(on(button(element))).toEqual(['click']);
    expect(observers).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe('warnings', () => {
  it('warns once for a row with no source, no destination, and no remove-label', async () => {
    const element = await mount({ removable: '' }, { content: '' });
    element.requestUpdate();
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/`source` or `destination`/);
  });

  it('does not warn when there is a source, a destination, or a remove-label', async () => {
    await mount({ removable: '' }, { content: '<span slot="source">A</span>' });
    await mount({ removable: '' }, { content: '<span slot="destination">B</span>' });
    await mount({ removable: '', 'remove-label': 'Remove the line' }, { content: '' });
    expect(warn).not.toHaveBeenCalled();
  });
});
