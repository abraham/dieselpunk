/**
 * Every string a component renders. The English default lives beside the component that renders
 * it, so a bundle only carries the words it uses.
 */
export type StringKey =
  | 'loading'
  | 'invalid'
  | 'stackCount'
  | 'stackCapacity'
  | 'durability'
  | 'quality'
  | 'unavailable'
  | 'craftable'
  | 'meterWarning'
  | 'meterCritical'
  | 'close'
  | 'dismiss'
  | 'moveWindow'
  | 'moving'
  | 'increase'
  | 'decrease'
  | 'notifications'
  | 'invalidField'
  | 'moreActions';

export type StringValues = Readonly<Record<string, string | number>>;

let overrides: Partial<Record<StringKey, string>> = {};

/**
 * Replaces built-in strings, for example to translate them. Call it before components render:
 * components read strings when they render and are not updated when strings change. A string
 * may contain `{name}` placeholders, which components fill with already formatted values.
 */
export function setStrings(partial: Partial<Record<StringKey, string>>): void {
  overrides = { ...overrides, ...partial };
}

export function resetStrings(): void {
  overrides = {};
}

/** The replacement set by `setStrings`, else `fallback`, the English default. */
export function t(key: StringKey, fallback: string): string {
  return overrides[key] ?? fallback;
}

/** `t` with its `{name}` placeholders filled; an unknown placeholder stays as written. */
export function format(key: StringKey, fallback: string, values: StringValues): string {
  return t(key, fallback).replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
