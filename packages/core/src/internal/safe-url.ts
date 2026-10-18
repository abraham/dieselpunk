// Parsed against a placeholder base, a relative URL takes the base's scheme.
const base = 'https://relative.invalid/';
const allowed = new Set(['http:', 'https:', 'mailto:']);

/**
 * `url` if following it cannot run script: an `http:`, `https:`, or `mailto:` URL, or a relative
 * one. Otherwise `undefined`. It parses as the browser does, so whitespace or control characters
 * cannot hide a `javascript:` scheme (specs/security.md §4.2).
 */
export function safeUrl(url: string): string | undefined {
  try {
    return allowed.has(new URL(url, base).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
