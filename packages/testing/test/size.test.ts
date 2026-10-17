import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkReasons } from '../src/size.ts';

describe('checkReasons', () => {
  it('passes when every entry has a reason and nothing is left over', () => {
    assert.deepEqual(checkReasons(['a', 'b'], { a: 'Within budget.', b: 'Over 5 kB: why.' }), []);
  });

  it('names an entry with no reason, or only blanks', () => {
    assert.deepEqual(checkReasons(['a', 'b'], { a: 'Reason.', b: '  ' }), [
      '"b" has no reason for its limit',
    ]);
    assert.deepEqual(checkReasons(['a'], {}), ['"a" has no reason for its limit']);
  });

  it('names a reason whose entry was renamed or removed', () => {
    assert.deepEqual(checkReasons(['a'], { a: 'Reason.', old: 'Reason.' }), [
      '"old" has a reason but no size entry',
    ]);
  });
});
