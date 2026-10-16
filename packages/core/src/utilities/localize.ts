const defaults = { loading: 'Loading' } as const;

export type StringKey = keyof typeof defaults;

let strings: Record<StringKey, string> = { ...defaults };

/**
 * Replaces built-in strings, for example to translate them. Call it before components render:
 * components read strings when they render and are not updated when strings change.
 */
export function setStrings(partial: Partial<Record<StringKey, string>>): void {
  strings = { ...strings, ...partial };
}

export function resetStrings(): void {
  strings = { ...defaults };
}

export function t(key: StringKey): string {
  return strings[key];
}
