// Helpers for the interaction stories (specs/workbench.md §5). Each is tagged
// `['!dev', '!autodocs', 'flow']`, written out in place since Storybook reads tags statically.

export const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The focused host in the story's document, as `tag:value` or `tag:id`. */
export function focused(canvas: HTMLElement): string {
  const host = canvas.ownerDocument.activeElement;
  return host ? `${host.localName}:${host.getAttribute('value') ?? host.id}` : 'none';
}

/** The light-DOM host whose text is `text`, such as a `punk-button`. */
export function byText<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string,
  text: string,
): T {
  const found = [...root.querySelectorAll<T>(selector)].find(
    (element) => element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No ${selector} with the text "${text}"`);
  return found;
}
