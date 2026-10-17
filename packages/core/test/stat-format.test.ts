import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveStat } from '../src/internal/stat-format.ts';

const languages = ['en', 'de', 'ar', 'ja'];
const number = (lang: string, value: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(lang, options).format(value);

describe('resolveStat: the value', () => {
  it('formats the number for the language', () => {
    for (const lang of languages) {
      const stat = resolveStat({ value: 1234567.891 }, lang);
      assert.equal(stat.fullValueText, number(lang, 1234567.891));
      assert.equal(stat.valueText, stat.fullValueText);
    }
  });

  it('applies decimals as a fixed number of digits', () => {
    for (const lang of languages) {
      const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      assert.equal(
        resolveStat({ value: 12.5, decimals: 2 }, lang).fullValueText,
        number(lang, 12.5, options),
      );
      assert.equal(
        resolveStat({ value: 12.5678, decimals: 0 }, lang).fullValueText,
        number(lang, 12.5678, { maximumFractionDigits: 0 }),
      );
    }
  });

  it('abbreviates what is shown and keeps the full number', () => {
    for (const lang of languages) {
      const stat = resolveStat({ value: 1234567, compact: true }, lang);
      assert.equal(stat.valueText, number(lang, 1234567, { notation: 'compact' }));
      assert.equal(stat.fullValueText, number(lang, 1234567));
      assert.notEqual(stat.valueText, stat.fullValueText);
    }
  });

  it('limits the digits of a compact value to decimals', () => {
    const stat = resolveStat({ value: 1234567, compact: true, decimals: 0 }, 'en');
    assert.equal(
      stat.valueText,
      number('en', 1234567, { notation: 'compact', maximumFractionDigits: 0 }),
    );
  });

  it('shows no value for none, and lists a value that is not a number', () => {
    assert.deepEqual(resolveStat({ value: undefined }, 'en'), {
      valueText: '',
      fullValueText: '',
      trend: undefined,
      deltaText: '',
      repairs: [],
    });
    for (const value of [NaN, Infinity, -Infinity]) {
      const stat = resolveStat({ value }, 'en');
      assert.equal(stat.fullValueText, '');
      assert.equal(stat.repairs.length, 1);
    }
  });

  it('formats negative and very large values', () => {
    assert.equal(resolveStat({ value: -42.5 }, 'de').fullValueText, number('de', -42.5));
    assert.equal(resolveStat({ value: 1e15 }, 'en').fullValueText, number('en', 1e15));
    assert.equal(resolveStat({ value: 0 }, 'en').fullValueText, '0');
  });

  it('falls back to the browser language for an invalid tag', () => {
    assert.equal(
      resolveStat({ value: 1234.5 }, 'not a tag').fullValueText,
      resolveStat({ value: 1234.5 }, undefined).fullValueText,
    );
  });
});

describe('resolveStat: decimals', () => {
  it('rounds a fraction and clamps to 0 to 6, listing each repair', () => {
    const rounded = resolveStat({ value: 1, decimals: 1.6 }, 'en');
    assert.equal(
      rounded.fullValueText,
      number('en', 1, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
    assert.equal(rounded.repairs.length, 1);

    const high = resolveStat({ value: 1, decimals: 9 }, 'en');
    assert.equal(
      high.fullValueText,
      number('en', 1, { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
    );
    assert.equal(high.repairs.length, 1);

    const low = resolveStat({ value: 1, decimals: -3 }, 'en');
    assert.equal(low.fullValueText, '1');
    assert.equal(low.repairs.length, 1);
  });

  it('ignores one that is not a number', () => {
    const stat = resolveStat({ value: 1.23456, decimals: NaN }, 'en');
    assert.equal(stat.fullValueText, number('en', 1.23456));
    assert.equal(stat.repairs.length, 1);
  });
});

describe('resolveStat: the change and the trend', () => {
  it('shows a signed plain change, with no sign for zero', () => {
    for (const lang of languages) {
      const signed = { signDisplay: 'exceptZero' } as const;
      assert.equal(resolveStat({ value: 1, delta: 12 }, lang).deltaText, number(lang, 12, signed));
      assert.equal(
        resolveStat({ value: 1, delta: -12 }, lang).deltaText,
        number(lang, -12, signed),
      );
      assert.equal(resolveStat({ value: 1, delta: 0 }, lang).deltaText, number(lang, 0, signed));
    }
  });

  it('shows a percent change from a ratio, with one digit unless decimals says otherwise', () => {
    for (const lang of languages) {
      const percent = { style: 'percent', signDisplay: 'exceptZero' } as const;
      assert.equal(
        resolveStat({ value: 1, delta: 0.1234, deltaPercent: true }, lang).deltaText,
        number(lang, 0.1234, { ...percent, maximumFractionDigits: 1 }),
      );
      assert.equal(
        resolveStat({ value: 1, delta: 0.1234, deltaPercent: true, decimals: 0 }, lang).deltaText,
        number(lang, 0.1234, { ...percent, maximumFractionDigits: 0 }),
      );
    }
  });

  it('follows the sign of the change when the trend is not set', () => {
    assert.equal(resolveStat({ value: 1, delta: 3 }, 'en').trend, 'up');
    assert.equal(resolveStat({ value: 1, delta: -3 }, 'en').trend, 'down');
    assert.equal(resolveStat({ value: 1, delta: 0 }, 'en').trend, 'flat');
    assert.equal(resolveStat({ value: 1 }, 'en').trend, undefined);
  });

  it('calls a change that rounds to zero at the digits shown flat, so the arrow and the number agree', () => {
    assert.equal(resolveStat({ value: 1, delta: 0.0004 }, 'en').trend, 'flat');
    assert.equal(resolveStat({ value: 1, delta: 0.0004, decimals: 4 }, 'en').trend, 'up');
    assert.equal(resolveStat({ value: 1, delta: -0.0004, deltaPercent: true }, 'en').trend, 'flat');
    assert.equal(resolveStat({ value: 1, delta: 0.004, deltaPercent: true }, 'en').trend, 'up');
    assert.equal(
      resolveStat({ value: 1, delta: 0.004, deltaPercent: true, decimals: 0 }, 'en').trend,
      'flat',
    );
  });

  it("keeps the author's trend, even against the change", () => {
    assert.equal(resolveStat({ value: 1, delta: 5, trend: 'down' }, 'en').trend, 'down');
    assert.equal(resolveStat({ value: 1, trend: 'flat' }, 'en').trend, 'flat');
  });

  it('ignores a trend that is not one of the three words, and lists it', () => {
    const stat = resolveStat({ value: 1, delta: 5, trend: 'sideways' }, 'en');
    assert.equal(stat.trend, 'up');
    assert.equal(stat.repairs.length, 1);
    assert.equal(resolveStat({ value: 1, trend: 'sideways' }, 'en').trend, undefined);
  });

  it('ignores a change that is not a number, and lists it', () => {
    const stat = resolveStat({ value: 1, delta: NaN }, 'en');
    assert.equal(stat.deltaText, '');
    assert.equal(stat.trend, undefined);
    assert.equal(stat.repairs.length, 1);
  });
});
