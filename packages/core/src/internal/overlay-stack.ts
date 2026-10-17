/** An open overlay that takes part in the Escape rule. */
export interface OverlayEntry {
  /** A non-dismissible entry still keeps Escape from reaching the entries beneath it. */
  readonly dismissible: boolean;
  close(): void;
}

export interface OverlayStack {
  push(entry: OverlayEntry): void;
  remove(entry: OverlayEntry): void;
  top(): OverlayEntry | undefined;
  readonly size: number;
}

/**
 * The open overlays, in the order they opened. Escape closes only the topmost one (specs/overlays.md §2).
 * One capturing `keydown` listener exists on `target` while the stack is not empty, and none
 * otherwise, so closed overlays cost nothing.
 */
export function createOverlayStack(target: () => EventTarget): OverlayStack {
  const entries: OverlayEntry[] = [];
  let listening: EventTarget | undefined;

  const onKeyDown = (event: Event): void => {
    if ((event as Event & { key?: string }).key !== 'Escape') return;
    const top = entries[entries.length - 1];
    if (!top) return;
    // Stopping the default as well keeps a native <dialog> underneath from also closing.
    event.stopPropagation();
    event.preventDefault();
    if (top.dismissible) top.close();
  };

  const sync = (): void => {
    if (entries.length > 0 && !listening) {
      listening = target();
      listening.addEventListener('keydown', onKeyDown, true);
    } else if (entries.length === 0 && listening) {
      listening.removeEventListener('keydown', onKeyDown, true);
      listening = undefined;
    }
  };

  return {
    push(entry) {
      if (!entries.includes(entry)) entries.push(entry);
      sync();
    },
    remove(entry) {
      const index = entries.indexOf(entry);
      if (index >= 0) entries.splice(index, 1);
      sync();
    },
    top: () => entries[entries.length - 1],
    get size() {
      return entries.length;
    },
  };
}
