import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createToastTimer } from '../src/internal/toast-timer.ts';
import type { TimerClock } from '../src/internal/toast-timer.ts';

// A clock the test drives, that also counts the timers it has pending.
class FakeClock implements TimerClock {
  time = 0;
  #next = 1;
  #pending = new Map<number, { at: number; callback: () => void }>();

  get pending(): number {
    return this.#pending.size;
  }

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, ms: number): number {
    const id = this.#next++;
    this.#pending.set(id, { at: this.time + ms, callback });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.#pending.delete(handle as number);
  }

  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      const due = [...this.#pending.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.#pending.delete(due[0]);
      this.time = due[1].at;
      due[1].callback();
    }
    this.time = target;
  }
}

function setup(duration = 1000) {
  const clock = new FakeClock();
  let elapsed = 0;
  const timer = createToastTimer(duration, () => elapsed++, clock);
  return { clock, timer, elapsed: () => elapsed };
}

describe('toast timer', () => {
  it('calls back once, after the duration', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    clock.advance(999);
    assert.equal(elapsed(), 0);
    clock.advance(1);
    assert.equal(elapsed(), 1);
    clock.advance(5000);
    assert.equal(elapsed(), 1);
  });

  it('resumes with the time that was left', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    clock.advance(400);
    timer.hold('hover');
    assert.equal(timer.remaining, 600);
    clock.advance(10_000);
    assert.equal(elapsed(), 0);
    timer.release('hover');
    clock.advance(599);
    assert.equal(elapsed(), 0);
    clock.advance(1);
    assert.equal(elapsed(), 1);
  });

  it('keeps waiting until every reason has been released', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    timer.hold('hover');
    timer.hold('focus');
    timer.release('hover');
    clock.advance(5000);
    assert.equal(elapsed(), 0);
    timer.release('focus');
    clock.advance(1000);
    assert.equal(elapsed(), 1);
  });

  it('counts one reason once, however often it is held', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    timer.hold('hover');
    timer.hold('hover');
    timer.release('hover');
    clock.advance(1000);
    assert.equal(elapsed(), 1);
  });

  it('waits to begin while it is held', () => {
    const { clock, timer, elapsed } = setup();
    timer.hold('hidden');
    timer.start();
    assert.equal(clock.pending, 0);
    clock.advance(5000);
    assert.equal(elapsed(), 0);
    timer.release('hidden');
    clock.advance(1000);
    assert.equal(elapsed(), 1);
  });

  it('does not begin from a release alone', () => {
    const { clock, timer, elapsed } = setup();
    timer.hold('hover');
    timer.release('hover');
    clock.advance(5000);
    assert.equal(elapsed(), 0);
    assert.equal(clock.pending, 0);
  });

  it('has no timer while held, and none once it has elapsed', () => {
    const { clock, timer } = setup();
    timer.start();
    assert.equal(clock.pending, 1);
    timer.hold('focus');
    assert.equal(clock.pending, 0);
    timer.release('focus');
    assert.equal(clock.pending, 1);
    clock.advance(1000);
    assert.equal(clock.pending, 0);
  });

  it('never has more than one timer, however often it is held and released', () => {
    const { clock, timer } = setup();
    timer.start();
    for (let round = 0; round < 20; round++) {
      timer.hold('hover');
      timer.release('hover');
      timer.start();
      assert.ok(clock.pending <= 1);
    }
  });

  it('still calls back after a hold that came when the time had run out but the callback had not', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    clock.time = 1000;
    timer.hold('hover');
    assert.equal(timer.remaining, 0);
    assert.equal(clock.pending, 0);
    timer.release('hover');
    clock.advance(0);
    assert.equal(elapsed(), 1);
  });

  it('does not run for a duration that is not above zero', () => {
    for (const duration of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { clock, timer, elapsed } = setup(duration);
      timer.start();
      assert.equal(clock.pending, 0, `duration ${duration}`);
      clock.advance(100_000);
      assert.equal(elapsed(), 0);
    }
  });

  it('stops without calling back, and can be started again from the full duration', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    clock.advance(500);
    timer.stop();
    assert.equal(clock.pending, 0);
    clock.advance(5000);
    assert.equal(elapsed(), 0);
    timer.start();
    clock.advance(999);
    assert.equal(elapsed(), 0);
    clock.advance(1);
    assert.equal(elapsed(), 1);
  });

  it('is not restarted by a release after it was stopped', () => {
    const { clock, timer, elapsed } = setup();
    timer.start();
    timer.hold('hover');
    timer.stop();
    timer.release('hover');
    clock.advance(5000);
    assert.equal(elapsed(), 0);
  });

  it('reports the time left while running', () => {
    const { clock, timer } = setup();
    timer.start();
    clock.advance(250);
    assert.equal(timer.remaining, 750);
  });
});
