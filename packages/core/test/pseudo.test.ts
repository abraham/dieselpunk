import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseXliff, placeholdersOf, textOf } from '../../locales/scripts/xliff.ts';
import { CLOSE, LOCALE, OPEN, pseudoFragment, pseudoXliff } from '../scripts/pseudo.ts';

const shipped = parseXliff(
  readFileSync(fileURLToPath(new URL('../../locales/xliff/de.xlf', import.meta.url)), 'utf8'),
);

describe('pseudoFragment', () => {
  it('wraps the source in the markers', () => {
    const found = pseudoFragment('Close');
    assert.ok(found.startsWith(`${OPEN}Close`));
    assert.ok(found.endsWith(CLOSE));
  });

  it('makes the text about 40% longer', () => {
    for (const text of ['Close', 'Moving. Use the arrow keys, Enter to place, Escape to cancel.']) {
      const lengthened = [...textOf(pseudoFragment(text))].length - 2;
      const ratio = lengthened / [...text].length;
      assert.ok(ratio >= 1.4 && ratio < 1.5, `${text}: ${ratio}`);
    }
  });

  it('keeps the placeholders, and does not count them as text', () => {
    const source =
      'Remove connection: <x id="0" equiv-text="${source}"/>, <x id="1" equiv-text="${destination}"/>';
    const found = pseudoFragment(source);
    assert.deepEqual(placeholdersOf(found), placeholdersOf(source));
    const text = [...textOf(source.replace(/<x\b[^>]*\/>/g, ''))].length;
    assert.equal(found.length, source.length + 2 + Math.ceil(text * 0.4));
  });
});

describe('pseudoXliff', () => {
  const file = parseXliff(pseudoXliff(shipped.units));

  it('is a file for the pseudo-locale with a target for every source unit', () => {
    assert.equal(file.targetLanguage, LOCALE);
    assert.deepEqual(
      file.units.map((unit) => unit.id),
      shipped.units.map((unit) => unit.id),
    );
    for (const unit of file.units) {
      assert.ok(unit.target?.startsWith(OPEN) && unit.target.endsWith(CLOSE), unit.id);
    }
  });

  it('keeps every unit’s source, note, and placeholders', () => {
    for (const [index, unit] of file.units.entries()) {
      const original = shipped.units[index];
      assert.equal(unit.source, original?.source);
      assert.equal(unit.note, original?.note);
      assert.deepEqual(placeholdersOf(unit.target ?? ''), placeholdersOf(original?.source ?? ''));
    }
  });
});
