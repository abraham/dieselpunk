import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  loadLocale,
  locales,
  mergeLocaleModules,
  sourceLocale,
  targetLocales,
} from '../src/index.ts';
import type { LocaleModule } from '../src/index.ts';
import { parseXliff } from '@dieselpunk/testing/xliff';

const xliff = (code: string) =>
  parseXliff(readFileSync(fileURLToPath(new URL(`../xliff/${code}.xlf`, import.meta.url)), 'utf8'));

describe('the locales', () => {
  it('are English as the source and the five languages as targets', () => {
    assert.equal(sourceLocale, 'en');
    assert.deepEqual([...targetLocales].sort(), ['ar', 'de', 'es', 'fr', 'ja']);
    assert.deepEqual(locales.map((locale) => locale.code).sort(), [
      'ar',
      'de',
      'en',
      'es',
      'fr',
      'ja',
    ]);
  });

  it('are drafts, except the English that is the source, and ar is the only right-to-left one', () => {
    for (const locale of locales) {
      assert.equal(locale.status, locale.code === 'en' ? 'reviewed' : 'draft', locale.code);
      assert.equal(locale.dir, locale.code === 'ar' ? 'rtl' : 'ltr', locale.code);
      assert.ok(locale.name.length > 0);
    }
  });
});

describe('loadLocale', () => {
  for (const code of targetLocales) {
    it(`resolves ${code} with a template for every message, equal to the XLIFF target`, async () => {
      const module = await loadLocale(code);
      const units = xliff(code).units;
      assert.deepEqual(Object.keys(module.templates).sort(), units.map((unit) => unit.id).sort());
      const close = module.templates['close'];
      assert.equal(typeof close, 'string');
      assert.equal(close, units.find((unit) => unit.id === 'close')?.target);
    });
  }

  it('turns a message with placeholders into a template that takes its values', async () => {
    const { templates } = await loadLocale('de');
    const capacity = templates['stackCapacity'] as unknown as {
      strings: string[];
      values: unknown[];
    };
    assert.deepEqual(capacity.strings, ['', ' von ', '']);
    assert.deepEqual(capacity.values, [0, 1]);
  });

  it('rejects English, an unknown code, and a name that is not a locale at all', async () => {
    for (const code of ['en', 'xx', '', 'DE', 'de-DE', 'toString', '__proto__', 'constructor']) {
      await assert.rejects(loadLocale(code), /No translations for/, JSON.stringify(code));
    }
  });

  it('is the shape that configureLocalization asks for', async () => {
    const module: LocaleModule = await loadLocale('fr');
    assert.ok(Object.keys(module.templates).length > 0);
  });
});

describe('mergeLocaleModules', () => {
  const module = (templates: Record<string, string>): LocaleModule => ({ templates });

  it('combines modules and promises of them, a later one winning an id they share', async () => {
    const merged = await mergeLocaleModules(
      module({ a: '1', b: '1' }),
      Promise.resolve(module({ b: '2', c: '2' })),
      module({ c: '3' }),
    );
    assert.deepEqual(merged.templates, { a: '1', b: '2', c: '3' });
  });

  it('does not change the modules it is given', async () => {
    const first = module({ a: '1' });
    const merged = await mergeLocaleModules(first, module({ a: '2' }));
    assert.equal(first.templates['a'], '1');
    assert.notEqual(merged.templates, first.templates);
  });

  it('merges the library with an application that overrides one of its messages', async () => {
    const merged = await mergeLocaleModules(
      loadLocale('de'),
      module({ close: 'Zumachen', mine: 'Meins' }),
    );
    assert.equal(merged.templates['close'], 'Zumachen');
    assert.equal(merged.templates['mine'], 'Meins');
    assert.equal(merged.templates['dismiss'], 'Ausblenden');
  });

  it('is empty with nothing to merge, and rejects when one of them rejects', async () => {
    assert.deepEqual((await mergeLocaleModules()).templates, {});
    await assert.rejects(
      mergeLocaleModules(module({ a: '1' }), loadLocale('nope')),
      /No translations/,
    );
  });
});
