/** Defines `tag` unless something already has, so registering twice is harmless. */
export function registerElement(tag: string, constructor: CustomElementConstructor): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, constructor);
  }
}
