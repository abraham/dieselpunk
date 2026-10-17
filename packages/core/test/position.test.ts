import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computePosition } from '../src/utilities/position.ts';
import type { PositionInput, PositionResult } from '../src/utilities/position.ts';

const base: PositionInput = {
  anchor: { left: 400, top: 300, width: 40, height: 20 },
  surface: { width: 100, height: 30 },
  viewport: { width: 1000, height: 800 },
  placement: 'top',
  offset: 8,
  margin: 8,
  rtl: false,
};

/** Asserts the parts of a result that `expected` names. */
function matches(input: PositionInput, expected: Partial<PositionResult>): void {
  const result = computePosition(input);
  const picked = Object.fromEntries(
    Object.keys(expected).map((key) => [key, result[key as keyof PositionResult]]),
  );
  assert.deepEqual(picked, expected);
}

describe('computePosition', () => {
  it('centers the surface above the anchor', () => {
    assert.deepEqual(computePosition(base), { side: 'top', left: 370, top: 262 });
  });

  it('centers the surface below the anchor', () => {
    assert.deepEqual(computePosition({ ...base, placement: 'bottom' }), {
      side: 'bottom',
      left: 370,
      top: 328,
    });
  });

  it('places start and end on the left and right, centered vertically', () => {
    matches({ ...base, placement: 'start' }, { side: 'left', left: 292, top: 295 });
    matches({ ...base, placement: 'end' }, { side: 'right', left: 448, top: 295 });
  });

  it('swaps start and end in a right-to-left context', () => {
    assert.equal(computePosition({ ...base, placement: 'start', rtl: true }).side, 'right');
    assert.equal(computePosition({ ...base, placement: 'end', rtl: true }).side, 'left');
  });

  it('flips to the opposite side when the requested side does not fit', () => {
    const nearTop = { ...base, anchor: { ...base.anchor, top: 10 } };
    assert.equal(computePosition(nearTop).side, 'bottom');

    const nearBottom = {
      ...base,
      placement: 'bottom' as const,
      anchor: { ...base.anchor, top: 770 },
    };
    assert.equal(computePosition(nearBottom).side, 'top');

    const nearLeft = { ...base, placement: 'start' as const, anchor: { ...base.anchor, left: 20 } };
    assert.equal(computePosition(nearLeft).side, 'right');
  });

  it('moves above or below when neither side of a beside placement fits', () => {
    const narrow = { ...base, placement: 'end' as const, viewport: { width: 150, height: 800 } };
    matches({ ...narrow, anchor: { ...narrow.anchor, left: 40 } }, { side: 'bottom', left: 10 });
  });

  it('keeps the requested side when neither side fits', () => {
    const tall = { ...base, surface: { width: 100, height: 900 } };
    assert.equal(computePosition(tall).side, 'top');
  });

  it('does not flip when the requested side fits exactly at the margin', () => {
    const exact = { ...base, anchor: { ...base.anchor, top: 8 + 30 + 8 } };
    matches(exact, { side: 'top', top: 8 });
  });

  it('shifts along the cross axis to stay inside the margin', () => {
    const nearRight = { ...base, anchor: { ...base.anchor, left: 980 } };
    assert.equal(computePosition(nearRight).left, 1000 - 8 - 100);

    const nearLeftEdge = { ...base, anchor: { ...base.anchor, left: 0 } };
    assert.equal(computePosition(nearLeftEdge).left, 8);

    const sideNearBottom = {
      ...base,
      placement: 'end' as const,
      anchor: { ...base.anchor, top: 790 },
    };
    assert.equal(computePosition(sideNearBottom).top, 800 - 8 - 30);
  });

  it('pins to the margin when the surface is wider than the viewport allows', () => {
    const wide = { ...base, surface: { width: 2000, height: 30 } };
    assert.equal(computePosition(wide).left, 8);
  });
});
