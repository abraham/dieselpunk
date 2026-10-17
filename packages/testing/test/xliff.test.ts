import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseXliff, placeholdersOf, textOf } from '../src/xliff.ts';

const xlf = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
<file target-language="de" source-language="en" original="lit-localize-inputs" datatype="plaintext">
<body>
<trans-unit id="close">
  <source>Close</source>
  <target>Schließen</target>
  <note from="lit-localize">The name of the button that closes a window.</note>
</trans-unit>
<trans-unit id="stackCapacity">
  <source><x id="0" equiv-text="\${count}"/> of <x id="1" equiv-text="\${capacity}"/></source>
  <note from="lit-localize">A count &amp; its capacity.</note>
</trans-unit>
</body>
</file>
</xliff>`;

describe('parseXliff', () => {
  const file = parseXliff(xlf);

  it('reads the languages', () => {
    assert.equal(file.sourceLanguage, 'en');
    assert.equal(file.targetLanguage, 'de');
  });

  it('reads each unit, with a target only where there is one', () => {
    assert.deepEqual(
      file.units.map((unit) => [unit.id, unit.target]),
      [
        ['close', 'Schließen'],
        ['stackCapacity', undefined],
      ],
    );
  });

  it('decodes entities in the description', () => {
    assert.equal(file.units[1]?.note, 'A count & its capacity.');
  });

  it('rejects a document with no file, and a unit with no id', () => {
    assert.throws(() => parseXliff('<xliff/>'));
    assert.throws(() =>
      parseXliff('<file source-language="en"><trans-unit><source>a</source></trans-unit></file>'),
    );
  });
});

describe('placeholders', () => {
  const unit = parseXliff(xlf).units[1]!;

  it('lists the expressions in order', () => {
    assert.deepEqual(placeholdersOf(unit.source), ['${count}', '${capacity}']);
    assert.deepEqual(placeholdersOf('plain'), []);
  });

  it('writes a fragment as text', () => {
    assert.equal(textOf(unit.source), '${count} of ${capacity}');
    assert.equal(textOf('Tom &amp; Jerry'), 'Tom & Jerry');
  });
});
