import { PUNK_DEV } from '#dev';

/** Logs a development-only warning prefixed with the element's tag name. */
export function devWarn(element: Element, message: string): void {
  if (PUNK_DEV) {
    console.warn(`<${element.localName}> ${message}`);
  }
}
