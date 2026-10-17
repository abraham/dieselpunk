import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  directionOf,
  metadataProblems,
  shippedProblems,
  translationProblems,
} from '../scripts/locale-rules.ts';
import { parseXliff } from '@dieselpunk/testing/xliff';
import type { LocaleInfo } from '../src/locales.ts';

const unit = (id: string, source: string, target?: string) =>
  `<trans-unit id="${id}"><source>${source}</source>${target === undefined ? '' : `<target>${target}</target>`}<note from="lit-localize">A note.</note></trans-unit>`;

const file = (units: string, language = 'de') =>
  parseXliff(
    `<xliff><file target-language="${language}" source-language="en"><body>${units}</body></file></xliff>`,
  );

const count = '<x id="0" equiv-text="${count}"/>';
const capacity = '<x id="1" equiv-text="${capacity}"/>';
const good = (): string =>
  unit('close', 'Close', 'Schließen') +
  unit('stackCapacity', `${count} of ${capacity}`, `${capacity} max, ${count} da`);
const ids = ['close', 'stackCapacity'];

const problems = (units: string, language = 'de', reference = ids) =>
  translationProblems(language, file(units, language), reference);

describe('translationProblems', () => {
  it('accepts a complete translation, with its placeholders in another order', () => {
    assert.deepEqual(problems(good()), []);
  });

  it('fails a unit with no target, and one with an empty or blank target', () => {
    for (const target of [undefined, '', '   ']) {
      const found = problems(
        unit('close', 'Close', target) +
          unit('stackCapacity', `${count} of ${capacity}`, `${count}/${capacity}`),
      );
      assert.equal(found.length, 1, String(target));
      assert.match(found[0] as string, /de\.close: has no target/);
    }
  });

  it('fails a unit that is missing, and one that the source does not have', () => {
    assert.match(
      problems(unit('close', 'Close', 'Schließen')).join('\n'),
      /has no unit "stackCapacity"/,
    );
    assert.match(
      problems(good() + unit('extra', 'Extra', 'Extra')).join('\n'),
      /unit "extra" that the source has not/,
    );
  });

  it('fails a placeholder that is dropped, added, or changed', () => {
    const base = unit('close', 'Close', 'Schließen');
    for (const target of [
      `${count}`,
      `${count} von ${capacity} ${count}`,
      `${count} von <x id="1" equiv-text="\${other}"/>`,
    ]) {
      const found = problems(base + unit('stackCapacity', `${count} of ${capacity}`, target));
      assert.match(found.join('\n'), /placeholders/, target);
    }
    assert.match(
      problems(
        unit('close', 'Close', `Schließen ${count}`) +
          unit('stackCapacity', `${count} of ${capacity}`, `${count} ${capacity}`),
      ).join('\n'),
      /de\.close: placeholders/,
    );
  });

  it('fails leading and trailing whitespace, including a no-break space', () => {
    for (const target of [' Schließen', 'Schließen ', 'Schließen\u00a0', '\tSchließen']) {
      const found = problems(
        unit('close', 'Close', target) +
          unit('stackCapacity', `${count} of ${capacity}`, `${count}/${capacity}`),
      );
      assert.match(
        found.join('\n'),
        /de\.close: starts or ends with whitespace/,
        JSON.stringify(target),
      );
    }
  });

  it('fails a control character, and each bidirectional override or isolate', () => {
    const rest = unit('stackCapacity', `${count} of ${capacity}`, `${count}/${capacity}`);
    for (const character of ['\u0007', '\n', '\u0085']) {
      assert.match(
        problems(unit('close', 'Close', `Schlie${character}ßen`) + rest).join('\n'),
        /control character/,
      );
    }
    for (const code of [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]) {
      const text = `Schlie${String.fromCodePoint(code)}ßen`;
      assert.match(
        problems(unit('close', 'Close', text) + rest).join('\n'),
        /bidirectional/,
        code.toString(16),
      );
    }
  });

  it('allows a no-break space inside a message, as French needs before a colon', () => {
    assert.deepEqual(
      problems(
        unit('close', 'Close', 'Fermer\u00a0: oui') +
          unit('stackCapacity', `${count} of ${capacity}`, `${count}/${capacity}`),
      ),
      [],
    );
  });

  it('fails a file whose target-language is not its locale', () => {
    assert.match(
      translationProblems('de', file(good(), 'fr'), ids).join('\n'),
      /target-language is "fr"/,
    );
  });
});

describe('metadataProblems', () => {
  const info = (code: string, dir: 'ltr' | 'rtl' = 'ltr', status = 'draft'): LocaleInfo =>
    ({ code, name: code, dir, status }) as LocaleInfo;
  const list = [info('en'), info('de'), info('ar', 'rtl')];
  const check = (
    locales: readonly LocaleInfo[],
    targets = ['de', 'ar'],
    names = ['de.xlf', 'ar.xlf'],
  ) => metadataProblems(locales, 'en', targets, names);

  it('accepts a list that agrees with the files and with Intl', () => {
    assert.deepEqual(check(list), []);
  });

  it('fails a code that is not a canonical language tag', () => {
    for (const code of ['DE', 'de_DE', 'not a tag', 'EN-us']) {
      assert.match(
        check([...list, info(code)], ['de', 'ar', code], ['de.xlf', 'ar.xlf', `${code}.xlf`]).join(
          '\n',
        ),
        /not a canonical language tag/,
        code,
      );
    }
  });

  it('fails a locale with no XLIFF file, and one that is not a target', () => {
    assert.match(check(list, ['de', 'ar'], ['de.xlf']).join('\n'), /ar: has no XLIFF file/);
    assert.match(
      check([...list, info('fr')], ['de', 'ar'], ['de.xlf', 'ar.xlf', 'fr.xlf']).join('\n'),
      /fr: is in locales and is not a target/,
    );
  });

  it('fails a target locale that is not listed', () => {
    assert.match(
      check([info('en'), info('de')]).join('\n'),
      /ar: is a target locale and is not in locales/,
    );
  });

  it('fails a dir that Intl does not give', () => {
    assert.match(
      check([info('en'), info('de'), info('ar', 'ltr')]).join('\n'),
      /ar: dir is "ltr", and Intl says "rtl"/,
    );
    assert.match(
      check([info('en'), info('de', 'rtl'), info('ar', 'rtl')]).join('\n'),
      /de: dir is "rtl"/,
    );
  });

  it('fails a status that is neither draft nor reviewed', () => {
    assert.match(
      check([info('en'), info('de', 'ltr', 'done'), info('ar', 'rtl')]).join('\n'),
      /de: has the status "done"/,
    );
  });

  it('asks Intl for the direction', () => {
    assert.equal(directionOf('ar'), 'rtl');
    assert.equal(directionOf('he-IL'), 'rtl');
    assert.equal(directionOf('de'), 'ltr');
  });
});

describe('the shipped files', () => {
  it('pass every rule', () => {
    const { problems, count } = shippedProblems(fileURLToPath(new URL('..', import.meta.url)));
    assert.deepEqual(problems, []);
    assert.ok(count >= 26);
  });
});
