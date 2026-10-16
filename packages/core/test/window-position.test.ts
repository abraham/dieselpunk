import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampOffset, keyboardStep, offsetForCenter } from '../src/internal/window-position.ts';

const viewport = { width: 1000, height: 800 };
// A 400 by 300 window at (300, 250): the room to move is 300 left, 300 right, 250 up, 250 down.
const base = { left: 300, top: 250, width: 400, height: 300 };

describe('clampOffset', () => {
  it('leaves an offset that keeps the window in view', () => {
    assert.deepEqual(clampOffset({ x: 120, y: -80 }, base, viewport), { x: 120, y: -80 });
    assert.deepEqual(clampOffset({ x: 0, y: 0 }, base, viewport), { x: 0, y: 0 });
  });

  it('stops each edge at the viewport', () => {
    assert.deepEqual(clampOffset({ x: -999, y: 0 }, base, viewport), { x: -300, y: 0 });
    assert.deepEqual(clampOffset({ x: 999, y: 0 }, base, viewport), { x: 300, y: 0 });
    assert.deepEqual(clampOffset({ x: 0, y: -999 }, base, viewport), { x: 0, y: -250 });
    assert.deepEqual(clampOffset({ x: 0, y: 999 }, base, viewport), { x: 0, y: 250 });
  });

  it('clamps both axes at a corner', () => {
    assert.deepEqual(clampOffset({ x: 999, y: 999 }, base, viewport), { x: 300, y: 250 });
    assert.deepEqual(clampOffset({ x: -999, y: -999 }, base, viewport), { x: -300, y: -250 });
  });

  it('allows a window that exactly fills the viewport no offset', () => {
    const full = { left: 0, top: 0, width: 1000, height: 800 };
    assert.deepEqual(clampOffset({ x: 50, y: 50 }, full, viewport), { x: 0, y: 0 });
  });

  it('pins the left edge on an axis where the window is wider than the viewport', () => {
    const wide = { left: 100, top: 250, width: 1400, height: 300 };
    assert.deepEqual(clampOffset({ x: 40, y: 0 }, wide, viewport), { x: -100, y: 0 });
    assert.deepEqual(clampOffset({ x: -500, y: 0 }, wide, viewport), { x: -100, y: 0 });
  });

  it('pins the right edge when the window is wider than the viewport in rtl', () => {
    const wide = { left: -100, top: 250, width: 1400, height: 300 };
    // The right edge is at 1300 with no offset; it is brought to 1000.
    assert.deepEqual(clampOffset({ x: 0, y: 0 }, wide, viewport, true), { x: -300, y: 0 });
  });

  it('pins the top edge on an axis where the window is taller than the viewport', () => {
    const tall = { left: 300, top: 60, width: 400, height: 1200 };
    assert.deepEqual(clampOffset({ x: 0, y: 200 }, tall, viewport), { x: 0, y: -60 });
  });

  it('keeps the other axis free while one is pinned', () => {
    const wide = { left: 100, top: 250, width: 1400, height: 300 };
    assert.deepEqual(clampOffset({ x: 0, y: 100 }, wide, viewport), { x: -100, y: 100 });
  });
});

describe('offsetForCenter', () => {
  it('moves the titlebar center to the point', () => {
    const titlebar = { left: 300, top: 250, width: 400, height: 40 };
    assert.deepEqual(offsetForCenter({ x: 500, y: 270 }, titlebar), { x: 0, y: 0 });
    assert.deepEqual(offsetForCenter({ x: 800, y: 100 }, titlebar), { x: 300, y: -170 });
  });
});

describe('keyboardStep', () => {
  it('moves by 8px, and 32px with Shift', () => {
    assert.deepEqual(keyboardStep('ArrowRight', false), { x: 8, y: 0 });
    assert.deepEqual(keyboardStep('ArrowLeft', false), { x: -8, y: 0 });
    assert.deepEqual(keyboardStep('ArrowDown', false), { x: 0, y: 8 });
    assert.deepEqual(keyboardStep('ArrowUp', true), { x: 0, y: -32 });
  });

  it('ignores other keys', () => {
    assert.equal(keyboardStep('Enter', false), null);
    assert.equal(keyboardStep('a', true), null);
  });
});
