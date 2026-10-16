export interface Offset {
  x: number;
  y: number;
}

/** A rectangle in viewport pixels: where the window sits with no translation. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

function clampAxis(
  desired: number,
  start: number,
  size: number,
  available: number,
  pinEnd: boolean,
): number {
  // Larger than the viewport: no offset keeps all of it in view, so one edge stays put.
  // Adding 0 turns a negative zero into 0.
  if (size >= available) return (pinEnd ? available - start - size : -start) + 0;
  return Math.min(Math.max(desired, -start), available - start - size) + 0;
}

/**
 * The translation nearest `desired` that keeps the window inside the viewport. `base` is the
 * window with no translation. On an axis where the window is larger than the viewport its start
 * edge stays at the viewport's: the left edge, or the right edge when `rtl`, and always the top.
 */
export function clampOffset(desired: Offset, base: Box, viewport: Viewport, rtl = false): Offset {
  return {
    x: clampAxis(desired.x, base.left, base.width, viewport.width, rtl),
    y: clampAxis(desired.y, base.top, base.height, viewport.height, false),
  };
}

/** The translation that puts the center of `titlebar` (with no translation) at `point`. */
export function offsetForCenter(point: Offset, titlebar: Box): Offset {
  return {
    x: point.x - (titlebar.left + titlebar.width / 2),
    y: point.y - (titlebar.top + titlebar.height / 2),
  };
}

/** The arrow key's step in move mode: 8px, or 32px with Shift. Other keys return `null`. */
export function keyboardStep(key: string, shift: boolean): Offset | null {
  const step = shift ? 32 : 8;
  switch (key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 };
    case 'ArrowRight':
      return { x: step, y: 0 };
    case 'ArrowUp':
      return { x: 0, y: -step };
    case 'ArrowDown':
      return { x: 0, y: step };
    default:
      return null;
  }
}
