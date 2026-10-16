export type TooltipPlacement = 'top' | 'bottom' | 'start' | 'end';

/** A physical side of the anchor. */
export type Side = 'top' | 'bottom' | 'left' | 'right';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

export interface PositionInput {
  anchor: Box;
  surface: Size;
  viewport: Size;
  placement: TooltipPlacement;
  /** Gap between the anchor and the surface. */
  offset: number;
  /** Minimum distance kept between the surface and the viewport edge. */
  margin: number;
  rtl: boolean;
}

export interface PositionResult {
  left: number;
  top: number;
  /** The side actually used, after any flip. */
  side: Side;
}

const opposite: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function toSide(placement: TooltipPlacement, rtl: boolean): Side {
  if (placement === 'top' || placement === 'bottom') return placement;
  const start: Side = rtl ? 'right' : 'left';
  return placement === 'start' ? start : opposite[start];
}

function clamp(value: number, min: number, max: number): number {
  return max < min ? min : Math.min(Math.max(value, min), max);
}

/**
 * Places a surface beside an anchor: on the requested side, flipped to the opposite side when it
 * does not fit but the opposite does (or above or below when neither side fits), then shifted to
 * stay inside the viewport margin. `start` and `end` follow the writing direction.
 */
export function computePosition(input: PositionInput): PositionResult {
  const { anchor, surface, viewport, offset, margin } = input;
  const right = anchor.left + anchor.width;
  const bottom = anchor.top + anchor.height;

  const place = (side: Side): { left: number; top: number } => {
    const centeredLeft = anchor.left + (anchor.width - surface.width) / 2;
    const centeredTop = anchor.top + (anchor.height - surface.height) / 2;
    switch (side) {
      case 'top':
        return { left: centeredLeft, top: anchor.top - surface.height - offset };
      case 'bottom':
        return { left: centeredLeft, top: bottom + offset };
      case 'left':
        return { left: anchor.left - surface.width - offset, top: centeredTop };
      case 'right':
        return { left: right + offset, top: centeredTop };
    }
  };

  const fits = (side: Side): boolean => {
    const { left, top } = place(side);
    return side === 'top' || side === 'bottom'
      ? top >= margin && top + surface.height <= viewport.height - margin
      : left >= margin && left + surface.width <= viewport.width - margin;
  };

  let side = toSide(input.placement, input.rtl);
  if (!fits(side) && fits(opposite[side])) side = opposite[side];
  // Beside the anchor on a viewport too narrow for either side: use above or below instead.
  if ((side === 'left' || side === 'right') && !fits(side)) {
    const stacked = (['bottom', 'top'] as const).find(fits);
    if (stacked) side = stacked;
  }

  const placed = place(side);
  const vertical = side === 'top' || side === 'bottom';
  return {
    side,
    left: clamp(placed.left, margin, viewport.width - margin - surface.width),
    top: vertical
      ? placed.top
      : clamp(placed.top, margin, viewport.height - margin - surface.height),
  };
}
