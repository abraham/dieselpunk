import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dropDescriptions } from '../scripts/drop-descriptions.ts';

describe('dropDescriptions', () => {
  it('removes the desc of a msg call, wherever it is in the options', () => {
    assert.equal(
      dropDescriptions("msg('a', { id: 'a', desc: 'For translators.' });"),
      "msg('a', { id: 'a' });",
    );
    assert.equal(
      dropDescriptions("msg(str`b ${x}`, { desc: 'Why, with a comma.', id: 'b' });"),
      "msg(str`b ${x}`, { id: 'b' });",
    );
  });

  it('leaves other calls and a msg without a desc alone', () => {
    const code = "other('a', { desc: 'kept' }); msg('c', { id: 'c' });";
    assert.equal(dropDescriptions(code), code);
  });
});
