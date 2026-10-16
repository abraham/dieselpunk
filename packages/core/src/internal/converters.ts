/** An empty attribute means "not set", which is undefined, not zero. */
export const optionalNumber = {
  fromAttribute: (attribute: string | null): number | undefined =>
    attribute === null || attribute === '' ? undefined : Number(attribute),
  toAttribute: (value: number | undefined): string | null =>
    value === undefined ? null : String(value),
};
