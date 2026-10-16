import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decimals,
  formatValue,
  keyToValue,
  normalizeRange,
  ratioOf,
  snapValue,
  tickRatios,
  valueFromPointer,
} from '../src/internal/slider-math.ts';

const range = { min: 0, max: 100, step: 1 };

describe('decimals', () => {
  it('counts the places a number is written with', () => {
    assert.equal(decimals(1), 0);
    assert.equal(decimals(0.5), 1);
    assert.equal(decimals(0.125), 3);
    assert.equal(decimals(-2.5), 1);
    assert.equal(decimals(1e-7), 7);
    assert.equal(decimals(1.5e-7), 8);
    assert.equal(decimals(Number.NaN), 0);
  });
});

describe('normalizeRange', () => {
  it('keeps a usable range as it is', () => {
    assert.deepEqual(normalizeRange({ min: -5, max: 5, step: 0.5 }), {
      min: -5,
      max: 5,
      step: 0.5,
      repaired: false,
    });
    assert.equal(normalizeRange({ min: 3, max: 3, step: 1 }).repaired, false);
  });

  it('puts 0 to 100 in place of an inverted or non-finite range', () => {
    for (const bad of [
      { min: 10, max: 0, step: 1 },
      { min: Number.NaN, max: 10, step: 1 },
      { min: 0, max: Number.POSITIVE_INFINITY, step: 1 },
    ]) {
      const result = normalizeRange(bad);
      assert.deepEqual([result.min, result.max, result.repaired], [0, 100, true]);
    }
  });

  it('puts 1 in place of a step that is not above 0', () => {
    for (const step of [0, -1, Number.NaN]) {
      const result = normalizeRange({ min: 0, max: 10, step });
      assert.deepEqual([result.step, result.repaired], [1, true]);
    }
  });
});

describe('snapValue', () => {
  it('clamps to the range', () => {
    assert.equal(snapValue(-20, range), 0);
    assert.equal(snapValue(500, range), 100);
  });

  it('snaps to the nearest step from min, and ties go up', () => {
    assert.equal(snapValue(4.4, range), 4);
    assert.equal(snapValue(4.5, range), 5);
    assert.equal(snapValue(7, { min: 3, max: 20, step: 5 }), 8);
    assert.equal(snapValue(5.5, { min: 3, max: 20, step: 5 }), 8);
    assert.equal(snapValue(5.4, { min: 3, max: 20, step: 5 }), 3);
  });

  it('does not drift with decimal steps', () => {
    const tenths = { min: 0, max: 1, step: 0.1 };
    assert.equal(snapValue(0.1 + 0.2, tenths), 0.3);
    assert.equal(snapValue(0.7000000000000001, tenths), 0.7);
    assert.equal(snapValue(1, tenths), 1);
    const hundredths = { min: 0, max: 1, step: 0.01 };
    assert.equal(snapValue(0.29, hundredths), 0.29);
    assert.equal(snapValue(0.57, hundredths), 0.57);
  });

  it('works from a negative or fractional min', () => {
    assert.equal(snapValue(0, { min: -1, max: 1, step: 0.25 }), 0);
    assert.equal(snapValue(0.3, { min: -1, max: 1, step: 0.25 }), 0.25);
    assert.equal(snapValue(0.4, { min: 0.05, max: 1, step: 0.1 }), 0.45);
  });

  it('never reaches a max that is not a whole number of steps from min', () => {
    assert.equal(snapValue(10, { min: 0, max: 10, step: 3 }), 9);
    assert.equal(snapValue(100, { min: 0, max: 10, step: 3 }), 9);
    assert.equal(snapValue(9.9, { min: 1, max: 10, step: 4 }), 9);
  });

  it('rounds down to the last step below max, when nearest would pass it', () => {
    assert.equal(snapValue(11, { min: 0, max: 11, step: 4 }), 8);
    assert.equal(snapValue(10, { min: 0, max: 11, step: 4 }), 8);
  });

  it('gives min for a value that is not a number', () => {
    assert.equal(snapValue(Number.NaN, { min: 2, max: 10, step: 1 }), 2);
  });

  it('handles a range with no width', () => {
    assert.equal(snapValue(5, { min: 3, max: 3, step: 1 }), 3);
  });
});

describe('ratioOf', () => {
  it('is where the value sits in the range', () => {
    assert.equal(ratioOf(0, range), 0);
    assert.equal(ratioOf(25, range), 0.25);
    assert.equal(ratioOf(100, range), 1);
    assert.equal(ratioOf(5, { min: 0, max: 10, step: 1 }), 0.5);
    assert.equal(ratioOf(0, { min: -10, max: 10, step: 1 }), 0.5);
  });

  it('stays inside 0 to 1, and is 0 for a range with no width', () => {
    assert.equal(ratioOf(-5, range), 0);
    assert.equal(ratioOf(500, range), 1);
    assert.equal(ratioOf(3, { min: 3, max: 3, step: 1 }), 0);
  });
});

describe('valueFromPointer', () => {
  const track = { left: 100, width: 200 };

  it('maps a position on the track to a value', () => {
    assert.equal(valueFromPointer(100, track, range, false), 0);
    assert.equal(valueFromPointer(200, track, range, false), 50);
    assert.equal(valueFromPointer(300, track, range, false), 100);
    assert.equal(valueFromPointer(250, track, range, false), 75);
  });

  it('clamps a pointer outside the track', () => {
    assert.equal(valueFromPointer(0, track, range, false), 0);
    assert.equal(valueFromPointer(900, track, range, false), 100);
  });

  it('snaps to the step', () => {
    assert.equal(valueFromPointer(212, track, { min: 0, max: 100, step: 10 }, false), 60);
  });

  it('puts the start of the range on the right in rtl', () => {
    assert.equal(valueFromPointer(100, track, range, true), 100);
    assert.equal(valueFromPointer(300, track, range, true), 0);
    assert.equal(valueFromPointer(250, track, range, true), 25);
  });

  it('gives min for a track with no width', () => {
    assert.equal(valueFromPointer(150, { left: 100, width: 0 }, range, false), 0);
  });
});

describe('keyToValue', () => {
  it('steps with the arrow keys', () => {
    assert.equal(keyToValue('ArrowRight', 10, range, false), 11);
    assert.equal(keyToValue('ArrowUp', 10, range, false), 11);
    assert.equal(keyToValue('ArrowLeft', 10, range, false), 9);
    assert.equal(keyToValue('ArrowDown', 10, range, false), 9);
  });

  it('swaps left and right in rtl, and leaves up and down alone', () => {
    assert.equal(keyToValue('ArrowLeft', 10, range, true), 11);
    assert.equal(keyToValue('ArrowRight', 10, range, true), 9);
    assert.equal(keyToValue('ArrowUp', 10, range, true), 11);
    assert.equal(keyToValue('ArrowDown', 10, range, true), 9);
  });

  it('stays at the ends, and still handles the key', () => {
    assert.equal(keyToValue('ArrowRight', 100, range, false), 100);
    assert.equal(keyToValue('ArrowLeft', 0, range, false), 0);
  });

  it('goes to the ends with Home and End', () => {
    assert.equal(keyToValue('Home', 40, range, false), 0);
    assert.equal(keyToValue('End', 40, range, false), 100);
    assert.equal(keyToValue('End', 0, { min: 0, max: 10, step: 3 }, false), 9);
    assert.equal(keyToValue('Home', 5, { min: 2, max: 10, step: 1 }, true), 2);
  });

  it('moves by a tenth of the range with the Page keys, and never by less than a step', () => {
    assert.equal(keyToValue('PageUp', 10, range, false), 20);
    assert.equal(keyToValue('PageDown', 10, range, false), 0);
    assert.equal(keyToValue('PageUp', 0, { min: 0, max: 5, step: 1 }, false), 1);
    assert.equal(keyToValue('PageUp', 0, { min: 0, max: 1000, step: 25 }, false), 100);
    assert.equal(keyToValue('PageUp', 95, range, false), 100);
  });

  it('does not drift with decimal steps', () => {
    const tenths = { min: 0, max: 1, step: 0.1 };
    let value = 0;
    for (let press = 0; press < 3; press++) value = keyToValue('ArrowRight', value, tenths, false)!;
    assert.equal(value, 0.3);
  });

  it('snaps a value that is between steps before it moves', () => {
    assert.equal(keyToValue('ArrowRight', 10.4, range, false), 11);
  });

  it('is null for a key it does not handle', () => {
    for (const key of ['a', 'Enter', ' ', 'Tab', 'Escape']) {
      assert.equal(keyToValue(key, 10, range, false), null);
    }
  });
});

describe('tickRatios', () => {
  it('has a tick at every step when there are 20 steps or fewer', () => {
    assert.deepEqual(tickRatios({ min: 0, max: 4, step: 1 }), [0, 0.25, 0.5, 0.75, 1]);
    assert.equal(tickRatios({ min: 0, max: 20, step: 1 }).length, 21);
  });

  it('has a tick at every ceil(steps / 20) steps past that', () => {
    const ratios = tickRatios({ min: 0, max: 21, step: 1 });
    assert.equal(ratios.length, 11);
    assert.equal(ratios[1], 2 / 21);
    const hundred = tickRatios({ min: 0, max: 100, step: 1 });
    assert.equal(hundred.length, 21);
    assert.equal(hundred[1], 0.05);
  });

  it('counts steps from min, and handles decimal steps', () => {
    assert.equal(tickRatios({ min: 5, max: 15, step: 5 }).length, 3);
    assert.equal(tickRatios({ min: 0, max: 1, step: 0.1 }).length, 11);
  });

  it('has none for a range with no width', () => {
    assert.deepEqual(tickRatios({ min: 3, max: 3, step: 1 }), []);
  });
});

describe('formatValue', () => {
  it('formats in the language it is given', () => {
    assert.equal(formatValue(1234.5, 'en'), '1,234.5');
    assert.equal(formatValue(1234.5, 'de'), '1.234,5');
  });

  it('falls back to the default language for one that is not valid', () => {
    assert.equal(typeof formatValue(1234.5, 'not a language!'), 'string');
    assert.equal(typeof formatValue(3, ''), 'string');
  });
});
