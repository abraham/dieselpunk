import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { format, resetStrings, setStrings, t } from '../src/utilities/localize.ts';

afterEach(resetStrings);

describe('t', () => {
  it('returns the default until a string is replaced', () => {
    assert.equal(t('invalid', 'invalid'), 'invalid');
    setStrings({ invalid: 'ungültig' });
    assert.equal(t('invalid', 'invalid'), 'ungültig');
  });

  it('keeps earlier replacements when more are set', () => {
    setStrings({ invalid: 'ungültig' });
    setStrings({ loading: 'Lädt' });
    assert.equal(t('invalid', 'invalid'), 'ungültig');
    assert.equal(t('loading', 'Loading'), 'Lädt');
  });

  it('restores the defaults', () => {
    setStrings({ invalid: 'ungültig' });
    resetStrings();
    assert.equal(t('invalid', 'invalid'), 'invalid');
  });

  it('accepts an empty replacement, which hides the word', () => {
    setStrings({ invalid: '' });
    assert.equal(t('invalid', 'invalid'), '');
  });
});

describe('format', () => {
  const capacity = '{count} of {capacity}';

  it('returns a string without placeholders as written', () => {
    assert.equal(format('invalid', 'invalid', { unused: 1 }), 'invalid');
  });

  it('fills placeholders with strings and numbers', () => {
    assert.equal(format('stackCapacity', capacity, { count: '75', capacity: 100 }), '75 of 100');
    assert.equal(format('quality', 'quality {level}', { level: 0 }), 'quality 0');
  });

  it('fills a placeholder that appears twice', () => {
    assert.equal(format('craftable', '{count} / {count}', { count: 3 }), '3 / 3');
  });

  it('leaves a placeholder with no value as written', () => {
    assert.equal(format('stackCapacity', capacity, { count: '75' }), '75 of {capacity}');
    assert.equal(format('stackCapacity', capacity, {}), capacity);
  });

  it('does not read inherited properties as values', () => {
    assert.equal(format('invalid', '{toString}', {}), '{toString}');
  });

  it('does not re-expand a placeholder inside a value', () => {
    assert.equal(
      format('stackCapacity', capacity, { count: '{capacity}', capacity: 5 }),
      '{capacity} of 5',
    );
  });

  it('fills a replacement string, with the placeholders in the translator order', () => {
    setStrings({ stackCapacity: '{capacity} max, {count} da' });
    assert.equal(format('stackCapacity', capacity, { count: 3, capacity: 9 }), '9 max, 3 da');
  });

  it('inserts a value literally, even one that looks like a replacement pattern', () => {
    assert.equal(format('stackCount', '{count}', { count: '$&' }), '$&');
  });
});
