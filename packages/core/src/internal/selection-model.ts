export type SelectionMode = 'none' | 'single' | 'multiple';

export interface SelectionResult {
  /** Selected keys, in item order. */
  selected: string[];
  /** Whether the operation changed the selection. */
  changed: boolean;
}

/**
 * Selection state for an ordered list of keyed items, with no DOM access.
 *
 * It never selects a disabled key and drops keys that leave the list. Operations that replace
 * the selection also drop a selected key that has since become disabled.
 */
export class SelectionModel {
  #mode: SelectionMode;
  #keys: string[] = [];
  #disabled = new Set<string>();
  #selected = new Set<string>();
  #anchor: string | undefined;

  constructor(mode: SelectionMode = 'none') {
    this.#mode = mode;
  }

  get mode(): SelectionMode {
    return this.#mode;
  }

  get selected(): string[] {
    return this.#keys.filter((key) => this.#selected.has(key));
  }

  has(key: string): boolean {
    return this.#selected.has(key);
  }

  setMode(mode: SelectionMode): SelectionResult {
    const before = this.selected;
    this.#mode = mode;
    if (mode === 'none') {
      this.#selected.clear();
      this.#anchor = undefined;
    } else if (mode === 'single' && this.#selected.size > 1) {
      this.#selected = new Set(before.slice(0, 1));
    }
    return this.#result(before);
  }

  /** Replaces the item list. Keys appearing twice count once, at their first position. */
  setItems(keys: readonly string[], disabled: Iterable<string> = []): SelectionResult {
    const before = this.selected;
    this.#keys = [...new Set(keys)];
    this.#disabled = new Set(disabled);
    this.#selected = new Set(before.filter((key) => this.#keys.includes(key)));
    if (this.#anchor !== undefined && !this.#keys.includes(this.#anchor)) this.#anchor = undefined;
    return this.#result(before);
  }

  /** Selects only `key`. */
  select(key: string): SelectionResult {
    const before = this.selected;
    if (this.#mode !== 'none' && this.#canSelect(key)) {
      this.#selected = new Set([key]);
      this.#anchor = key;
    }
    return this.#result(before);
  }

  /** Adds or removes `key`. In `single` mode it only selects, so a selection is never cleared. */
  toggle(key: string): SelectionResult {
    if (this.#mode !== 'multiple') return this.select(key);
    const before = this.selected;
    if (this.#canSelect(key)) {
      if (!this.#selected.delete(key)) this.#selected.add(key);
      this.#anchor = key;
    }
    return this.#result(before);
  }

  /** Selects the enabled keys from the anchor to `key`, inclusive, and keeps the anchor. */
  extendTo(key: string): SelectionResult {
    if (this.#mode !== 'multiple') return this.select(key);
    const before = this.selected;
    if (this.#canSelect(key)) {
      const anchor = this.#anchor ?? key;
      const [from, to] = [this.#keys.indexOf(anchor), this.#keys.indexOf(key)].sort(
        (a, b) => a - b,
      ) as [number, number];
      this.#selected = new Set(this.#keys.slice(from, to + 1).filter((k) => this.#canSelect(k)));
      this.#anchor = anchor;
    }
    return this.#result(before);
  }

  selectAll(): SelectionResult {
    const before = this.selected;
    if (this.#mode === 'multiple') {
      this.#selected = new Set(this.#keys.filter((key) => this.#canSelect(key)));
    }
    return this.#result(before);
  }

  clear(): SelectionResult {
    const before = this.selected;
    this.#selected.clear();
    this.#anchor = undefined;
    return this.#result(before);
  }

  /** Selects exactly the listed keys that exist and are enabled; `single` mode keeps the first. */
  set(keys: readonly string[]): SelectionResult {
    const before = this.selected;
    if (this.#mode !== 'none') {
      const valid = [...new Set(keys)].filter((key) => this.#canSelect(key));
      const kept = this.#mode === 'single' ? valid.slice(0, 1) : valid;
      this.#selected = new Set(kept);
      this.#anchor = kept.at(-1);
    }
    return this.#result(before);
  }

  #canSelect(key: string): boolean {
    return this.#keys.includes(key) && !this.#disabled.has(key);
  }

  #result(before: readonly string[]): SelectionResult {
    const selected = this.selected;
    // Compared as a set, so reordering the items alone is not a change.
    const changed = selected.length !== before.length || selected.some((k) => !before.includes(k));
    return { selected, changed };
  }
}
