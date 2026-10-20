// The production build removes every statement that calls these, or a `warn…` method, along with
// the methods, so each call is a statement of its own (specs/package-contract.md §6).

/** Logs a development-only warning prefixed with the element's tag name. */
export function devWarn(element: Element, message: string): void {
  console.warn(`<${element.localName}> ${message}`);
}

/**
 * Warns for each problem `check` gives that it did not give last time, and returns them to pass as
 * `previous` next time. A problem is its message, unless `describe` gives the message for it.
 */
export function warnNew(
  element: Element,
  previous: ReadonlySet<string>,
  check: () => (string | false)[],
  describe: (problem: string) => string = (problem) => problem,
): Set<string> {
  const current = new Set(check().filter((problem): problem is string => Boolean(problem)));
  for (const problem of current) if (!previous.has(problem)) devWarn(element, describe(problem));
  return current;
}
