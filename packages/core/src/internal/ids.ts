let counter = 0;

/** An id no element in the document has, for an ARIA relationship that stays inside one tree. */
export function uid(prefix: string): string {
  let id = `${prefix}-${++counter}`;
  while (document.getElementById(id)) id = `${prefix}-${++counter}`;
  return id;
}
