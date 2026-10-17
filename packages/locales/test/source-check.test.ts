import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { messageCallProblems } from '../scripts/source-check.ts';

const check = (text: string) => messageCallProblems([{ path: 'a.ts', text }]);

describe('messageCallProblems', () => {
  it('accepts a call with an id and a desc, in a plain or a str message', () => {
    assert.deepEqual(check("msg('Close', { id: 'close', desc: 'Closes it.' });"), []);
    assert.deepEqual(check('msg(str`${a} of ${b}`, { id: "of", desc: `Count of total.` });'), []);
  });

  it('flags a call with no options, with a missing id, and with a missing desc', () => {
    assert.match(check("msg('Close');")[0] as string, /a\.ts:1: msg\(\) has no options/);
    assert.match(check("msg('Close', { desc: 'x' });")[0] as string, /an `id`/);
    assert.match(check("msg('Close', { id: 'close' });")[0] as string, /a `desc`/);
  });

  it('flags an id or a desc that is not a string literal', () => {
    assert.equal(check("msg('Close', { id: name, desc: 'x' });").length, 1);
    assert.equal(check("msg('Close', { id: 'close', desc: text });").length, 1);
    assert.equal(check("msg('Close', { id: 'close', desc });").length, 1);
  });

  it('reports the line of each call, and ignores other functions', () => {
    const problems = check("const a = 1;\nconst b = msg('x', { id: 'x' });\nother('y');");
    assert.equal(problems.length, 1);
    assert.match(problems[0] as string, /a\.ts:2:/);
  });

  it('finds a call inside a template', () => {
    assert.equal(check("html`${msg('Close', { id: 'close' })}`;").length, 1);
  });
});
