import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, track } from '../test/browser/helpers.ts';
import { shareStyles, sharedStylesScript } from './ssr.ts';

// Lit SSR's LitElementRenderer, as far as shareStyles() relies on it.
const template = () => '<p></p>';
const sheetsByTag: Record<string, string[]> = {
  'x-a': ['.base{}', '.a{}'],
  'x-b': ['.base{}', '.b{}'],
};
class FakeRenderer {
  static matchesClass(): boolean {
    return true;
  }
  tagName: string;
  constructor(tagName: string) {
    this.tagName = tagName;
  }
  renderShadow(): unknown {
    if (this.tagName === 'x-off') return undefined;
    const sheets = sheetsByTag[this.tagName] ?? [];
    return sheets.length > 0 ? ['<style>', ...sheets, '</style>', template] : [template];
  }
}

const Shared = shareStyles(FakeRenderer);
const shadow = (tag: string, renderInfo: object) =>
  (new Shared(tag) as unknown as { renderShadow(renderInfo: object): unknown[] }).renderShadow(
    renderInfo,
  );
const writtenSheets = (markup: unknown) =>
  [...String(markup).matchAll(/<style data-punk-sheet="(\w+)">([^<]*)<\/style>/g)].map(
    ([, id, text]) => ({ id, text }),
  );
const named = (markup: unknown) =>
  /<punk-styles sheets="([\w ]*)"><\/punk-styles>$/.exec(String(markup))?.[1];

describe('shareStyles (ssr.md §6)', () => {
  it("writes a root's sheets once, then only names them", () => {
    const renderInfo = {};
    const [first, firstRest] = shadow('x-a', renderInfo);
    const [second, secondRest] = shadow('x-a', renderInfo);

    const sheets = writtenSheets(first);
    expect(sheets.map(({ text }) => text)).toEqual(['.base{}', '.a{}']);
    expect(named(first)).toBe(sheets.map(({ id }) => id).join(' '));
    expect(firstRest).toBe(template);
    expect(second).toBe(`<punk-styles sheets="${named(first)}"></punk-styles>`);
    expect(secondRest).toBe(template);
  });

  it('writes every sheet of a root that has a new one, in order', () => {
    const renderInfo = {};
    const [a] = shadow('x-a', renderInfo);
    const [b] = shadow('x-b', renderInfo);

    expect(writtenSheets(b).map(({ text }) => text)).toEqual(['.base{}', '.b{}']);
    expect(writtenSheets(b)[0]?.id).toBe(writtenSheets(a)[0]?.id);
    expect(named(b)).not.toBe(named(a));
  });

  it('starts over in each render, with the same ids for the same text', () => {
    expect(shadow('x-a', {})[0]).toBe(shadow('x-a', {})[0]);
  });

  it('leaves a root without styles, or with no shadow root, as it is', () => {
    expect(shadow('x-plain', {})).toEqual([template]);
    expect(shadow('x-off', {})).toBeUndefined();
  });

  it("keeps the renderer class's static side", () => {
    expect(Shared.matchesClass()).toBe(true);
  });
});

// A page with the script, parsed as a browser parses a server's response.
async function page(head: string, body: string): Promise<Document> {
  const frame = track(document.createElement('iframe'));
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  frame.srcdoc = `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
  await loaded;
  return frame.contentDocument!;
}

const script = `<script>${sharedStylesScript}</script>`;
// What shareStyles() writes: every sheet in a root with a new one, else only the names.
const written =
  '<style data-punk-sheet="a">p { color: rgb(1, 2, 3); }</style>' +
  '<style data-punk-sheet="b">p { color: rgb(4, 5, 6); }</style>';
const host = (id: string, styles: string, content = '<p>Text</p>') =>
  `<x-host id="${id}"><template shadowrootmode="open">${styles}${content}</template></x-host>`;
const color = (document: Document, id: string) => {
  const p = document.getElementById(id)!.shadowRoot!.querySelector('p')!;
  return document.defaultView!.getComputedStyle(p).color;
};

afterEach(cleanup);

describe('sharedStylesScript (ssr.md §6)', () => {
  it('is one line', () => {
    expect(sharedStylesScript).not.toMatch(/\n/);
  });

  it('adopts the named sheets in order while the page is parsed, and leaves no trace', async () => {
    const document = await page(
      script,
      host('one', `${written}<punk-styles sheets="a b"></punk-styles>`) +
        host('two', '<punk-styles sheets="a b"></punk-styles>') +
        '<script>window.parsed = getComputedStyle(two.shadowRoot.querySelector("p")).color;</script>' +
        host('reversed', '<punk-styles sheets="b a"></punk-styles>') +
        host(
          'outer',
          '<punk-styles sheets="a"></punk-styles>',
          host('inner', '<punk-styles sheets="b"></punk-styles>') + '<p>Outer</p>',
        ),
    );

    expect((document.defaultView as unknown as { parsed: string }).parsed).toBe('rgb(4, 5, 6)');
    expect(color(document, 'one')).toBe('rgb(4, 5, 6)');
    expect(color(document, 'two')).toBe('rgb(4, 5, 6)');
    expect(color(document, 'reversed')).toBe('rgb(1, 2, 3)');
    expect(color(document, 'outer')).toBe('rgb(1, 2, 3)');
    const inner = document.getElementById('outer')!.shadowRoot!.getElementById('inner')!;
    expect(
      document.defaultView!.getComputedStyle(inner.shadowRoot!.querySelector('p')!).color,
    ).toBe('rgb(4, 5, 6)');

    const roots = ['one', 'two', 'reversed'].map((id) => document.getElementById(id)!.shadowRoot!);
    for (const root of roots) {
      expect([...root.children].map((child) => child.localName)).toEqual(['p']);
      expect(root.adoptedStyleSheets).toHaveLength(2);
    }
    // Identity is what matters, and Firefox's deep equality fails on another frame's sheets.
    const [one, two, reversed] = roots.map((root) => [...root.adoptedStyleSheets]);
    expect(two!.every((sheet, index) => sheet === one![index])).toBe(true);
    expect(reversed![0]).toBe(one![1]);
    expect(reversed![1]).toBe(one![0]);
  });

  it('works when it runs after the page, in document order', async () => {
    const document = await page(
      '',
      host('one', `${written}<punk-styles sheets="a b"></punk-styles>`) +
        host('two', '<punk-styles sheets="b a"></punk-styles>') +
        script,
    );

    expect(color(document, 'one')).toBe('rgb(4, 5, 6)');
    expect(color(document, 'two')).toBe('rgb(1, 2, 3)');
  });

  it('leaves a root as it is when a sheet it names was never written', async () => {
    const document = await page(script, host('one', '<punk-styles sheets="a"></punk-styles>'));

    const root = document.getElementById('one')!.shadowRoot!;
    expect(root.querySelector('punk-styles')).not.toBeNull();
    expect(root.adoptedStyleSheets).toHaveLength(0);
  });

  it('defines punk-styles once when the script runs twice', async () => {
    const document = await page(
      script + script,
      host('one', `${written}<punk-styles sheets="a b"></punk-styles>`),
    );

    expect(color(document, 'one')).toBe('rgb(4, 5, 6)');
  });
});
