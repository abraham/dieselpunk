import { describe, expect, it } from 'vitest';
import { computePosition } from './position.ts';
import type { PositionInput } from './position.ts';

const base: PositionInput = {
  anchor: { left: 400, top: 300, width: 40, height: 20 },
  surface: { width: 100, height: 30 },
  viewport: { width: 1000, height: 800 },
  placement: 'top',
  offset: 8,
  margin: 8,
  rtl: false,
};

describe('computePosition', () => {
  it('centers the surface above the anchor', () => {
    expect(computePosition(base)).toEqual({ side: 'top', left: 370, top: 262 });
  });

  it('centers the surface below the anchor', () => {
    expect(computePosition({ ...base, placement: 'bottom' })).toEqual({
      side: 'bottom',
      left: 370,
      top: 328,
    });
  });

  it('places start and end on the left and right, centered vertically', () => {
    expect(computePosition({ ...base, placement: 'start' })).toMatchObject({
      side: 'left',
      left: 292,
      top: 295,
    });
    expect(computePosition({ ...base, placement: 'end' })).toMatchObject({
      side: 'right',
      left: 448,
      top: 295,
    });
  });

  it('swaps start and end in a right-to-left context', () => {
    expect(computePosition({ ...base, placement: 'start', rtl: true }).side).toBe('right');
    expect(computePosition({ ...base, placement: 'end', rtl: true }).side).toBe('left');
  });

  it('flips to the opposite side when the requested side does not fit', () => {
    const nearTop = { ...base, anchor: { ...base.anchor, top: 10 } };
    expect(computePosition(nearTop).side).toBe('bottom');

    const nearBottom = {
      ...base,
      placement: 'bottom' as const,
      anchor: { ...base.anchor, top: 770 },
    };
    expect(computePosition(nearBottom).side).toBe('top');

    const nearLeft = { ...base, placement: 'start' as const, anchor: { ...base.anchor, left: 20 } };
    expect(computePosition(nearLeft).side).toBe('right');
  });

  it('keeps the requested side when neither side fits', () => {
    const tall = { ...base, surface: { width: 100, height: 900 } };
    expect(computePosition(tall).side).toBe('top');
  });

  it('does not flip when the requested side fits exactly at the margin', () => {
    const exact = { ...base, anchor: { ...base.anchor, top: 8 + 30 + 8 } };
    expect(computePosition(exact)).toMatchObject({ side: 'top', top: 8 });
  });

  it('shifts along the cross axis to stay inside the margin', () => {
    const nearRight = { ...base, anchor: { ...base.anchor, left: 980 } };
    expect(computePosition(nearRight).left).toBe(1000 - 8 - 100);

    const nearLeftEdge = { ...base, anchor: { ...base.anchor, left: 0 } };
    expect(computePosition(nearLeftEdge).left).toBe(8);

    const sideNearBottom = {
      ...base,
      placement: 'end' as const,
      anchor: { ...base.anchor, top: 790 },
    };
    expect(computePosition(sideNearBottom).top).toBe(800 - 8 - 30);
  });

  it('pins to the margin when the surface is wider than the viewport allows', () => {
    const wide = { ...base, surface: { width: 2000, height: 30 } };
    expect(computePosition(wide).left).toBe(8);
  });
});
