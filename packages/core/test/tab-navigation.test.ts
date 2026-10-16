import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { navigateTabs, resolveSelection } from '../src/internal/tab-navigation.ts';
import type { TabActivation } from '../src/internal/tab-navigation.ts';
import type { RovingOrientation } from '../src/internal/roving-keys.ts';

const none = [false, false, false, false];
const options = (
  orientation: RovingOrientation = 'horizontal',
  rtl = false,
  activation: TabActivation = 'auto',
) => ({ orientation, rtl, activation });

describe('navigateTabs, automatic activation', () => {
  it('moves focus with the arrow of the orientation and selects what it reaches', () => {
    assert.deepEqual(navigateTabs('ArrowRight', 1, 1, none, options()), { focus: 2, select: 2 });
    assert.deepEqual(navigateTabs('ArrowLeft', 1, 1, none, options()), { focus: 0, select: 0 });
    assert.deepEqual(navigateTabs('ArrowDown', 1, 1, none, options('vertical')), {
      focus: 2,
      select: 2,
    });
    assert.deepEqual(navigateTabs('ArrowUp', 1, 1, none, options('vertical')), {
      focus: 0,
      select: 0,
    });
  });

  it('swaps the horizontal arrows in rtl and leaves the vertical ones', () => {
    assert.deepEqual(navigateTabs('ArrowLeft', 1, 1, none, options('horizontal', true)), {
      focus: 2,
      select: 2,
    });
    assert.deepEqual(navigateTabs('ArrowRight', 1, 1, none, options('horizontal', true)), {
      focus: 0,
      select: 0,
    });
    assert.deepEqual(navigateTabs('ArrowDown', 1, 1, none, options('vertical', true)), {
      focus: 2,
      select: 2,
    });
  });

  it('goes to the first and last enabled tab with Home and End', () => {
    const disabled = [true, false, false, true];
    assert.deepEqual(navigateTabs('Home', 2, 2, disabled, options()), { focus: 1, select: 1 });
    assert.deepEqual(navigateTabs('End', 1, 1, disabled, options()), { focus: 2, select: 2 });
  });

  it('skips disabled tabs and does not wrap', () => {
    const disabled = [false, true, false, false];
    assert.deepEqual(navigateTabs('ArrowRight', 0, 0, disabled, options()), {
      focus: 2,
      select: 2,
    });
    assert.deepEqual(navigateTabs('ArrowLeft', 0, 0, none, options()), { focus: 0, select: null });
    assert.deepEqual(navigateTabs('ArrowRight', 3, 3, none, options()), { focus: 3, select: null });
  });

  it('still handles an arrow at an end, so the page does not scroll', () => {
    assert.notEqual(navigateTabs('ArrowDown', 3, 3, none, options('vertical')), null);
  });

  it('ignores the arrows of the other orientation, Enter, Space, and other keys', () => {
    assert.equal(navigateTabs('ArrowDown', 1, 1, none, options()), null);
    assert.equal(navigateTabs('ArrowRight', 1, 1, none, options('vertical')), null);
    assert.equal(navigateTabs('Enter', 1, 0, none, options()), null);
    assert.equal(navigateTabs(' ', 1, 0, none, options()), null);
    assert.equal(navigateTabs('a', 1, 1, none, options()), null);
  });
});

describe('navigateTabs, manual activation', () => {
  const manual = options('horizontal', false, 'manual');

  it('moves focus without selecting', () => {
    assert.deepEqual(navigateTabs('ArrowRight', 0, 0, none, manual), { focus: 1, select: null });
    assert.deepEqual(navigateTabs('End', 0, 0, none, manual), { focus: 3, select: null });
    assert.deepEqual(navigateTabs('Home', 2, 0, none, manual), { focus: 0, select: null });
  });

  it('selects the focused tab with Enter and Space', () => {
    assert.deepEqual(navigateTabs('Enter', 2, 0, none, manual), { focus: 2, select: 2 });
    assert.deepEqual(navigateTabs(' ', 2, 0, none, manual), { focus: 2, select: 2 });
  });

  it('does nothing for Enter on the tab that is already selected', () => {
    assert.equal(navigateTabs('Enter', 2, 2, none, manual), null);
  });

  it('does not select a disabled tab', () => {
    assert.equal(navigateTabs('Enter', 1, 0, [false, true], manual), null);
  });
});

describe('resolveSelection', () => {
  it('keeps an enabled preferred tab', () => {
    assert.equal(resolveSelection(none, 2), 2);
  });

  it('moves to the nearest enabled tab, forward first', () => {
    assert.equal(resolveSelection([false, true, false], 1), 2);
    assert.equal(resolveSelection([false, true, true], 1), 0);
    assert.equal(resolveSelection([true, true, true, false], 1), 3);
    assert.equal(resolveSelection([false, true, true, true, true, false], 3), 5);
  });

  it('starts at the first tab when nothing is preferred', () => {
    assert.equal(resolveSelection(none, -1), 0);
    assert.equal(resolveSelection([true, false], -1), 1);
    assert.equal(resolveSelection(none, 9), 0);
  });

  it('returns -1 when every tab is disabled, or there are none', () => {
    assert.equal(resolveSelection([true, true], 0), -1);
    assert.equal(resolveSelection([], 0), -1);
  });
});
