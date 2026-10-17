import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { messageProblems } from '../scripts/messages.ts';

describe('messageProblems', () => {
  it('accepts an explicit id with a description', () => {
    const units = [{ id: 'close', source: 'Close', target: undefined, note: 'Closes a window.' }];
    assert.deepEqual(messageProblems(units), []);
  });

  it('flags an id made from a hash', () => {
    const units = [{ id: 's3d58dee72d4e0c27', source: 'Hello', target: undefined, note: 'Hi.' }];
    assert.equal(messageProblems(units).length, 1);
    assert.match(messageProblems(units)[0] as string, /explicit id/);
  });

  it('flags a message with no description', () => {
    const units = [{ id: 'close', source: 'Close', target: undefined, note: undefined }];
    assert.match(messageProblems(units)[0] as string, /no description/);
  });
});
