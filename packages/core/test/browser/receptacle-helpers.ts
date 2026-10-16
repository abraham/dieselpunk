const color = /(?:rgba?|color|oklab|oklch|lab|lch)\([^)]*\)/g;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two `#rrggbb` colors. */
export function ratio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** `rgb(r, g, b)` as the `#rrggbb` the contrast helpers take. */
export function toHex(value: string): string {
  const [r, g, b] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number) as [
    number,
    number,
    number,
  ];
  return `#${[r, g, b].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;
}

/** The color of the outer ring of a receptacle, drawn as a spread-only box-shadow layer. */
export function ringColor(slot: Element): string {
  const ring = /(rgba?\([^)]*\))\s+0px 0px 0px [\d.]+px(?!\s+inset)/.exec(
    getComputedStyle(slot).boxShadow,
  );
  if (!ring?.[1]) throw new Error(`No ring in "${getComputedStyle(slot).boxShadow}"`);
  return toHex(ring[1]);
}

/** What a receptacle looks like with every color replaced by `C`, so it shows what color-blind users get. */
export function structure(host: Element): string {
  const slot = host.shadowRoot?.querySelector('.slot') as HTMLElement;
  const content = host.shadowRoot?.querySelector('.content') as HTMLElement;
  const style = getComputedStyle(slot);
  return JSON.stringify({
    shadow: style.boxShadow.replace(color, 'C'),
    outline: [style.outlineStyle, style.outlineWidth, style.outlineOffset],
    border: [style.borderTopStyle, style.borderTopWidth],
    hatch: getComputedStyle(slot, '::before').content,
    content: [getComputedStyle(content).opacity, getComputedStyle(content).filter],
  });
}

export function slotOf(host: Element): HTMLElement {
  return host.shadowRoot?.querySelector('.slot') as HTMLElement;
}
