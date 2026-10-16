export interface TimerClock {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  now(): number;
}

export const realClock: TimerClock = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => globalThis.performance.now(),
};

export interface ToastTimer {
  /** Begins the countdown from the full duration. It waits while anything holds it. */
  start(): void;
  /** Pauses the countdown until every reason that holds it has been released. */
  hold(reason: string): void;
  release(reason: string): void;
  /** Cancels the countdown, so `onElapsed` is not called. */
  stop(): void;
  /** Time left, in milliseconds. */
  readonly remaining: number;
}

/**
 * A countdown that pauses and resumes with the time it had left (WCAG 2.2 SC 2.2.1). Holds are
 * kept by reason, so hover and focus each pause it and it resumes only when both are gone. At most
 * one timer exists at a time, and none while it is held or once it has elapsed.
 */
export function createToastTimer(
  duration: number,
  onElapsed: () => void,
  clock: TimerClock = realClock,
): ToastTimer {
  const holds = new Set<string>();
  let remaining = duration;
  let started = false;
  let handle: unknown;
  let runningSince = 0;

  const isRunning = (): boolean => handle !== undefined;

  const run = (): void => {
    runningSince = clock.now();
    handle = clock.setTimeout(
      () => {
        handle = undefined;
        started = false;
        remaining = 0;
        onElapsed();
      },
      Math.max(0, remaining),
    );
  };

  const pause = (): void => {
    if (!isRunning()) return;
    clock.clearTimeout(handle);
    handle = undefined;
    remaining = Math.max(0, remaining - (clock.now() - runningSince));
  };

  return {
    start() {
      pause();
      remaining = duration;
      started = Number.isFinite(duration) && duration > 0;
      if (started && holds.size === 0) run();
    },
    hold(reason) {
      holds.add(reason);
      pause();
    },
    release(reason) {
      holds.delete(reason);
      if (started && holds.size === 0 && !isRunning()) run();
    },
    stop() {
      pause();
      started = false;
    },
    get remaining() {
      return isRunning() ? Math.max(0, remaining - (clock.now() - runningSince)) : remaining;
    },
  };
}
