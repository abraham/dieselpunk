import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveMeter } from '../src/components/meter/meter-state.ts';
import type { MeterInput } from '../src/components/meter/meter-state.ts';

const base: MeterInput = { value: 50, min: 0, max: 100, segments: 10 };
const meter = (input: Partial<MeterInput>) => resolveMeter({ ...base, ...input });

describe('meter state', () => {
  it('has none when no boundary is given', () => {
    for (const value of [0, 30, 50, 100]) assert.equal(meter({ value }).state, 'none');
  });

  // low 30, high 70. Rows: where the optimum is. Columns: where the value is.
  const regions = { low: 10, mid: 50, high: 90 } as const;
  const expected = {
    low: { low: 'optimal', mid: 'suboptimal', high: 'critical' },
    mid: { low: 'suboptimal', mid: 'optimal', high: 'suboptimal' },
    high: { low: 'critical', mid: 'suboptimal', high: 'optimal' },
  } as const;

  for (const [optimumRegion, row] of Object.entries(expected)) {
    for (const [valueRegion, state] of Object.entries(row)) {
      it(`is ${state} for a value in the ${valueRegion} region when the optimum is in the ${optimumRegion} one`, () => {
        const result = meter({
          low: 30,
          high: 70,
          optimum: regions[optimumRegion as keyof typeof regions],
          value: regions[valueRegion as keyof typeof regions],
        });
        assert.equal(result.state, state);
        assert.deepEqual(result.problems, []);
      });
    }
  }

  it('counts the boundaries themselves as the middle region', () => {
    for (const value of [30, 70]) {
      assert.equal(meter({ low: 30, high: 70, optimum: 50, value }).state, 'optimal');
      assert.equal(meter({ low: 30, high: 70, optimum: 10, value }).state, 'suboptimal');
    }
    assert.equal(meter({ low: 30, high: 70, optimum: 30, value: 50 }).state, 'optimal');
    assert.equal(meter({ low: 30, high: 70, optimum: 70, value: 50 }).state, 'optimal');
  });

  it('fills in what is missing as the HTML meter does: the ends, and the middle for the optimum', () => {
    // Only `low`: high is the maximum, and the optimum is in the middle region.
    assert.equal(meter({ low: 30, value: 10 }).state, 'suboptimal');
    assert.equal(meter({ low: 30, value: 90 }).state, 'optimal');
    // Only `high`: low is the minimum.
    assert.equal(meter({ high: 70, value: 90 }).state, 'suboptimal');
    assert.equal(meter({ high: 70, value: 10 }).state, 'optimal');
    // Only `optimum`: the whole range is the middle region, so everything is optimal.
    assert.equal(meter({ optimum: 80, value: 20 }).state, 'optimal');
  });

  it('works with a range that does not start at zero, and a negative one', () => {
    const range = { min: -50, max: 50, low: -20, high: 20, optimum: 0 };
    assert.equal(meter({ ...range, value: -40 }).state, 'suboptimal');
    assert.equal(meter({ ...range, value: 0 }).state, 'optimal');
    assert.equal(meter({ ...range, value: 40 }).state, 'suboptimal');
    assert.equal(meter({ ...range, optimum: -40, value: 40 }).state, 'critical');
  });
});

describe('meter clamping and repair', () => {
  it('clamps a value outside the range and reports it', () => {
    assert.deepEqual(
      [meter({ value: 140 }).value, meter({ value: 140 }).problems],
      [100, ['value-range']],
    );
    assert.deepEqual(
      [meter({ value: -3 }).value, meter({ value: -3 }).problems],
      [0, ['value-range']],
    );
  });

  it('uses the minimum for a value that is not a number', () => {
    const result = meter({ value: Number.NaN, min: 10, max: 20 });
    assert.equal(result.value, 10);
    assert.deepEqual(result.problems, ['value']);
    assert.equal(meter({ value: Infinity }).problems[0], 'value');
  });

  it('falls back to 0 to 100 for a range that is empty, reversed, or not a number', () => {
    for (const range of [
      { min: 5, max: 5 },
      { min: 10, max: 2 },
      { min: Number.NaN, max: 10 },
      { min: 0, max: Infinity },
    ]) {
      const result = meter({ ...range, value: 40 });
      assert.deepEqual(
        [result.min, result.max, result.value, result.problems],
        [0, 100, 40, ['range']],
      );
    }
  });

  it('clamps boundaries into the range, and ignores ones that are not numbers', () => {
    const result = meter({ low: -10, high: 500, optimum: 50, value: 50 });
    assert.deepEqual(result.problems.sort(), ['high', 'low']);
    assert.equal(result.state, 'optimal');
    const junk = meter({ low: Number.NaN, value: 10 });
    assert.deepEqual(junk.problems, ['low']);
    assert.equal(junk.state, 'none');
  });

  it('raises a high boundary that is below the low one', () => {
    const result = meter({ low: 60, high: 40, optimum: 90, value: 70 });
    assert.deepEqual(result.problems, ['bounds']);
    assert.equal(result.state, 'optimal');
  });
});

describe('meter segments', () => {
  const lit = (value: number, segments = 10) => meter({ value, segments }).lit;

  it('lights none at the minimum and all at the maximum', () => {
    assert.equal(lit(0), 0);
    assert.equal(lit(100), 10);
  });

  it('snaps to the nearest whole segment in between', () => {
    assert.equal(lit(14), 1);
    assert.equal(lit(26), 3);
    assert.equal(lit(50), 5);
    assert.equal(lit(64), 6);
    assert.equal(lit(75), 8);
  });

  it('lights at least one segment above the minimum, and not all below the maximum', () => {
    assert.equal(lit(0.1), 1);
    assert.equal(lit(2), 1);
    assert.equal(lit(99.9), 9);
    assert.equal(lit(97), 9);
  });

  it('follows a range that does not start at zero', () => {
    assert.equal(meter({ value: 15, min: 10, max: 20 }).lit, 5);
    assert.equal(meter({ value: 10, min: 10, max: 20 }).lit, 0);
  });

  it('stays within two segments when there are only two', () => {
    assert.deepEqual([lit(1, 2), lit(50, 2), lit(99, 2)], [1, 1, 1]);
    assert.deepEqual([lit(0, 2), lit(100, 2)], [0, 2]);
  });

  it('keeps the segment count between 2 and 100 and whole, and reports a change', () => {
    assert.deepEqual(
      [meter({ segments: 1 }).segments, meter({ segments: 1 }).problems],
      [2, ['segments']],
    );
    assert.equal(meter({ segments: 500 }).segments, 100);
    assert.equal(meter({ segments: 7.6 }).segments, 8);
    assert.equal(meter({ segments: Number.NaN }).segments, 10);
    assert.deepEqual(meter({ segments: 10 }).problems, []);
  });

  it('reports the ratio of the clamped value', () => {
    assert.equal(meter({ value: 25 }).ratio, 0.25);
    assert.equal(meter({ value: 500 }).ratio, 1);
  });
});
