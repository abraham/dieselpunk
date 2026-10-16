import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextRovingIndex } from '../src/internal/roving-keys.ts';
import type { RovingOrientation } from '../src/internal/roving-keys.ts';

const none = [false, false, false, false, false];
const horizontal = { orientation: 'horizontal' as RovingOrientation, rtl: false };
const rtl = { orientation: 'horizontal' as RovingOrientation, rtl: true };
const vertical = { orientation: 'vertical' as RovingOrientation, rtl: false };

describe('nextRovingIndex', () => {
  it('steps with the arrow of the orientation, and does not wrap', () => {
    assert.equal(nextRovingIndex('ArrowRight', 1, none, horizontal), 2);
    assert.equal(nextRovingIndex('ArrowLeft', 1, none, horizontal), 0);
    assert.equal(nextRovingIndex('ArrowLeft', 0, none, horizontal), 0);
    assert.equal(nextRovingIndex('ArrowRight', 4, none, horizontal), 4);
    assert.equal(nextRovingIndex('ArrowDown', 1, none, vertical), 2);
    assert.equal(nextRovingIndex('ArrowUp', 1, none, vertical), 0);
  });

  it('ignores the arrows of the other orientation', () => {
    assert.equal(nextRovingIndex('ArrowDown', 1, none, horizontal), 1);
    assert.equal(nextRovingIndex('ArrowRight', 1, none, vertical), 1);
  });

  it('swaps the horizontal arrows in rtl, and not the vertical ones', () => {
    assert.equal(nextRovingIndex('ArrowLeft', 1, none, rtl), 2);
    assert.equal(nextRovingIndex('ArrowRight', 1, none, rtl), 0);
    assert.equal(nextRovingIndex('ArrowDown', 1, none, { ...vertical, rtl: true }), 2);
  });

  it('skips disabled items in both directions', () => {
    const disabled = [false, true, true, false, false];
    assert.equal(nextRovingIndex('ArrowRight', 0, disabled, horizontal), 3);
    assert.equal(nextRovingIndex('ArrowLeft', 3, disabled, horizontal), 0);
  });

  it('stays put when every item beyond is disabled', () => {
    const disabled = [false, false, true, true, true];
    assert.equal(nextRovingIndex('ArrowRight', 1, disabled, horizontal), 1);
  });

  it('goes to the first and last enabled item with Home and End', () => {
    const disabled = [true, false, false, false, true];
    assert.equal(nextRovingIndex('Home', 2, disabled, horizontal), 1);
    assert.equal(nextRovingIndex('End', 2, disabled, horizontal), 3);
    assert.equal(nextRovingIndex('Home', 2, disabled, rtl), 1);
  });

  it('returns from for a key it does not handle, and for an empty or all-disabled list', () => {
    assert.equal(nextRovingIndex('a', 2, none, horizontal), 2);
    assert.equal(nextRovingIndex('Home', 0, [], horizontal), 0);
    assert.equal(nextRovingIndex('End', 1, [true, true], horizontal), 1);
  });
});
