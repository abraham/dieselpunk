import axe from 'axe-core';
import type { Result } from 'axe-core';
import { configureLocalization } from '@lit/localize';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../core/test/browser/helpers.ts';
import {
  buildGallery,
  componentNames,
  galleryCss,
  openTooltips,
} from '../../../core/test/browser/fixtures/gallery.ts';
import type { ContentVariant } from '../../../core/test/browser/fixtures/gallery.ts';
import { bindDocumentLocale } from '../../src/document.ts';
import { loadLocale, locales, sourceLocale, targetLocales } from '../../src/index.ts';
import type { LocaleModule } from '../../src/index.ts';

// Lit Localize is configured once for a page, and each test file has a page of its own.
const { setLocale } = configureLocalization({ sourceLocale, targetLocales, loadLocale });

const root = document.documentElement;
let unbind: (() => void) | undefined;

beforeEach(() => {
  addStylesheets();
  const style = document.createElement('style');
  style.textContent = galleryCss;
  track(style, document.head);
});

afterEach(async () => {
  unbind?.();
  unbind = undefined;
  cleanup();
  await setLocale('en');
  root.removeAttribute('lang');
  root.removeAttribute('dir');
});

const dirOf = (code: string) => locales.find((locale) => locale.code === code)?.dir ?? 'ltr';

describe('loadLocale in a browser', () => {
  it.each(targetLocales)(
    'resolves %s, and rejects a code that is not a target locale',
    async (code) => {
      const module = await loadLocale(code);
      expect(Object.keys(module.templates).length).toBeGreaterThan(20);
      await expect(loadLocale('en')).rejects.toThrow(/No translations/);
      await expect(loadLocale('xx')).rejects.toThrow(/No translations/);
    },
  );
});

describe('bindDocumentLocale', () => {
  it.each(targetLocales)(
    'sets lang and dir for %s when it is ready, and again for English',
    async (code) => {
      unbind = bindDocumentLocale();
      await setLocale(code);
      expect(root.lang).toBe(code);
      expect(root.dir).toBe(dirOf(code));
      await setLocale('en');
      expect(root.lang).toBe('en');
      expect(root.dir).toBe('ltr');
    },
  );

  it('sets nothing while a locale is loading, and nothing once it is removed', async () => {
    unbind = bindDocumentLocale();
    root.lang = 'x-kept';
    window.dispatchEvent(
      new CustomEvent('lit-localize-status', {
        detail: { status: 'loading', loadingLocale: 'de', readyLocale: 'de' },
      }),
    );
    window.dispatchEvent(
      new CustomEvent('lit-localize-status', { detail: { status: 'error', errorLocale: 'de' } }),
    );
    expect(root.lang).toBe('x-kept');
    unbind();
    unbind = undefined;
    await setLocale('fr');
    expect(root.lang).toBe('x-kept');
  });

  it('adds one listener to window, and removes it', () => {
    const added: string[] = [];
    const removed: string[] = [];
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, ...rest: [EventListenerOrEventListenerObject]) => {
      added.push(type);
      add(type, ...rest);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, ...rest: [EventListenerOrEventListenerObject]) => {
      removed.push(type);
      remove(type, ...rest);
    }) as typeof window.removeEventListener;
    try {
      const stop = bindDocumentLocale();
      stop();
    } finally {
      window.addEventListener = add;
      window.removeEventListener = remove;
    }
    expect(added).toEqual(['lit-localize-status']);
    expect(removed).toEqual(['lit-localize-status']);
  });

  it('sets the element it is given, and leaves dir alone for a locale it does not know', async () => {
    const stage = track(document.createElement('div'));
    stage.dir = 'rtl';
    unbind = bindDocumentLocale(stage);
    await setLocale('de');
    expect([stage.lang, stage.dir]).toEqual(['de', 'ltr']);
    window.dispatchEvent(
      new CustomEvent('lit-localize-status', { detail: { status: 'ready', readyLocale: 'tlh' } }),
    );
    expect([stage.lang, stage.dir]).toEqual(['tlh', 'ltr']);
    expect(root.lang).toBe('');
  });
});

const texts = (module: LocaleModule, id: string): string[] => {
  const template = module.templates[id] as string | { strings: string[] };
  return typeof template === 'string' ? [template] : template.strings;
};

describe.each(targetLocales)('the components in %s', (code) => {
  async function mounted() {
    const stage = track(document.createElement('div'));
    stage.innerHTML = `
      <punk-toast duration="0">Saved</punk-toast>
      <punk-production-stat label="Output"></punk-production-stat>
      <punk-connection-row removable direction="both">
        <span slot="source">Iron smelter</span><span slot="destination">Assembler</span>
      </punk-connection-row>`;
    const [toast, stat, row] = [...stage.children] as Array<
      HTMLElement & { updateComplete: Promise<boolean> }
    >;
    await Promise.all([toast, stat, row].map((element) => element?.updateComplete));
    return { toast: toast as HTMLElement, stat: stat as HTMLElement, row: row as HTMLElement };
  }

  const read = ({ toast, stat, row }: Awaited<ReturnType<typeof mounted>>) => ({
    dismiss: toast.shadowRoot?.querySelector('[part="dismiss-button"]')?.getAttribute('aria-label'),
    noValue: stat.shadowRoot?.querySelector('.visually-hidden')?.textContent,
    remove: row.shadowRoot?.querySelector('[part="remove-button"]')?.getAttribute('aria-label'),
    both: row.shadowRoot?.querySelector('.visually-hidden')?.textContent,
  });

  it('say their words in the locale, from the module, and in English again after', async () => {
    unbind = bindDocumentLocale();
    const parts = await mounted();
    const english = read(parts);
    expect(english.dismiss).toBe('Dismiss');
    await setLocale(code);
    const module = await loadLocale(code);
    const [before, between, after] = texts(module, 'removeConnection') as [string, string, string];
    await Promise.all(
      Object.values(parts).map(
        (part) => (part as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete,
      ),
    );
    const found = read(parts);
    expect(found).toEqual({
      dismiss: texts(module, 'dismiss')[0],
      noValue: texts(module, 'statNoValue')[0],
      remove: `${before}Iron smelter${between}Assembler${after}`,
      both: texts(module, 'connectionBoth')[0],
    });
    for (const [name, value] of Object.entries(found)) {
      expect(value, name).not.toBe(english[name as keyof typeof english]);
    }
    await setLocale('en');
    await Promise.all(
      Object.values(parts).map(
        (part) => (part as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete,
      ),
    );
    expect(read(parts)).toEqual(english);
  });

  async function settle(stage: HTMLElement): Promise<void> {
    const elements = [...stage.querySelectorAll('*')].filter((element) =>
      element.localName.startsWith('punk-'),
    ) as Array<Element & { updateComplete?: Promise<boolean> }>;
    await Promise.all(elements.map((element) => element.updateComplete));
    openTooltips(stage);
    await Promise.all(elements.map((element) => element.updateComplete));
  }

  const describeViolations = (violations: Result[]) =>
    violations
      .map(
        (violation) =>
          `[${violation.impact}] ${violation.id}: ${violation.nodes[0]?.html.slice(0, 120)}`,
      )
      .join('\n');

  /** The gallery as an application in this locale would hold it. */
  function mountGallery(variant: ContentVariant, width?: number) {
    const frame = document.createElement('div');
    frame.setAttribute('data-punk-theme', 'industrial');
    frame.setAttribute('data-punk-density', 'compact');
    frame.style.cssText = `background: var(--punk-color-canvas); color: var(--punk-color-text);${width ? ` width: ${width}px;` : ''}`;
    const gallery = buildGallery(variant);
    gallery.lang = code;
    gallery.dir = dirOf(code);
    frame.append(gallery);
    track(frame);
    return { frame, gallery };
  }

  it.each(['short', 'long'] as const)(
    'pass axe with the document language set (%s content)',
    async (variant) => {
      unbind = bindDocumentLocale();
      await setLocale(code);
      const { frame } = mountGallery(variant);
      await settle(frame);
      const results = await axe.run(frame, {
        resultTypes: ['violations'],
        rules: { region: { enabled: false } },
      });
      const found = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(found, describeViolations(found)).toEqual([]);

      const page = await axe.run(root, {
        resultTypes: ['violations', 'passes'],
        runOnly: ['html-has-lang', 'html-lang-valid', 'valid-lang'],
      });
      expect(page.violations.map((violation) => violation.id)).toEqual([]);
      expect(page.passes.map((rule) => rule.id)).toEqual(
        expect.arrayContaining(['html-has-lang', 'html-lang-valid']),
      );
    },
  );

  it('keeps every component inside a container from 187 to 512px', async () => {
    // The page stays left to right, as in core's reflow test: the toast stack and the popover are
    // placed against the viewport, so they are measured against the frame only that way.
    await setLocale(code);
    const problems: string[] = [];
    for (const width of [187, 256, 375, 512]) {
      for (const variant of ['short', 'long'] as const) {
        const { frame, gallery } = mountGallery(variant, width);
        await settle(frame);
        const rtl = gallery.dir === 'rtl';
        const edge = frame.getBoundingClientRect();
        for (const name of componentNames) {
          // An open tooltip is placed against the viewport, so core's own test checks it.
          if (name === 'tooltip') continue;
          for (const element of gallery.querySelectorAll(
            `[data-component="${name}"] punk-${name}`,
          )) {
            const box = element.getBoundingClientRect();
            const over = rtl ? edge.left - box.left : box.right - edge.right;
            if (over > 0.5)
              problems.push(`${variant}@${width}: <punk-${name}> is ${over.toFixed(1)}px too wide`);
          }
        }
        if (frame.scrollWidth > frame.clientWidth + 1) {
          problems.push(`${variant}@${width}: the container scrolls (${frame.scrollWidth}px)`);
        }
        frame.remove();
      }
    }
    expect(problems).toEqual([]);
  }, 120_000);
});
