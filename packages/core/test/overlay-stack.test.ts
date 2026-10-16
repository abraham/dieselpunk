import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOverlayStack } from '../src/internal/overlay-stack.ts';
import type { OverlayEntry } from '../src/internal/overlay-stack.ts';

// A target that counts its listeners, so the "nothing while empty" rule can be asserted.
class CountingTarget extends EventTarget {
  listeners = 0;
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>): void {
    this.listeners++;
    super.addEventListener(...args);
  }
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>): void {
    this.listeners--;
    super.removeEventListener(...args);
  }
}

function press(target: EventTarget, key: string): Event {
  const event = Object.assign(new Event('keydown', { cancelable: true, bubbles: true }), { key });
  target.dispatchEvent(event);
  return event;
}

function entry(dismissible: boolean, log: string[], name: string): OverlayEntry {
  return { dismissible, close: () => log.push(name) };
}

describe('overlay stack', () => {
  it('has no listener while empty, and exactly one while not', () => {
    const target = new CountingTarget();
    const stack = createOverlayStack(() => target);
    assert.equal(target.listeners, 0);
    const a = entry(true, [], 'a');
    const b = entry(true, [], 'b');
    stack.push(a);
    stack.push(b);
    assert.equal(target.listeners, 1);
    stack.remove(a);
    assert.equal(target.listeners, 1);
    stack.remove(b);
    assert.equal(target.listeners, 0);
  });

  it('closes only the topmost entry on Escape, and stops the event', () => {
    const target = new CountingTarget();
    const stack = createOverlayStack(() => target);
    const log: string[] = [];
    stack.push(entry(true, log, 'window'));
    stack.push(entry(true, log, 'popover'));
    const event = press(target, 'Escape');
    assert.deepEqual(log, ['popover']);
    assert.equal(event.defaultPrevented, true);
  });

  it('closes each entry in turn as they are removed', () => {
    const target = new CountingTarget();
    const stack = createOverlayStack(() => target);
    const log: string[] = [];
    const window = entry(true, log, 'window');
    const popover = entry(true, log, 'popover');
    stack.push(window);
    stack.push(popover);
    press(target, 'Escape');
    stack.remove(popover);
    press(target, 'Escape');
    assert.deepEqual(log, ['popover', 'window']);
  });

  it('lets a non-dismissible entry absorb Escape without closing it or the ones beneath', () => {
    const target = new CountingTarget();
    const stack = createOverlayStack(() => target);
    const log: string[] = [];
    stack.push(entry(true, log, 'window'));
    stack.push(entry(false, log, 'persistent dialog'));
    const event = press(target, 'Escape');
    assert.deepEqual(log, []);
    assert.equal(event.defaultPrevented, true);
  });

  it('ignores other keys, and leaves them alone', () => {
    const target = new CountingTarget();
    const stack = createOverlayStack(() => target);
    const log: string[] = [];
    stack.push(entry(true, log, 'window'));
    const event = press(target, 'Enter');
    assert.deepEqual(log, []);
    assert.equal(event.defaultPrevented, false);
  });

  it('counts an entry once however often it is pushed, and ignores a removal of one it lacks', () => {
    const target = new CountingTarget();
    const stack = createOverlayStack(() => target);
    const a = entry(true, [], 'a');
    stack.push(a);
    stack.push(a);
    assert.equal(stack.size, 1);
    stack.remove(entry(true, [], 'other'));
    assert.equal(stack.size, 1);
    assert.equal(stack.top(), a);
  });
});
