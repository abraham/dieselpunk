/** WCAG 2 contrast arithmetic on hex colors, as measured from the page's computed tokens. */

type Rgb = readonly [number, number, number];

export function parseHex(value: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  const hex = match?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as unknown as Rgb;
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export interface ContrastCheck {
  foreground: string;
  background: string;
  /** Minimum ratio for this theme. */
  required: number;
}

/** The pairs the contrast gate enforces (specs/visual-system.md §4.1), as tokens without the `color-` prefix. */
export function checksFor(theme: string): ContrastCheck[] {
  const text = theme === 'high-contrast' ? 7 : 4.5;
  const checks: ContrastCheck[] = [];
  const add = (foreground: string, backgrounds: string[], required: number) => {
    for (const background of backgrounds) {
      checks.push({ foreground, background, required });
    }
  };

  add('text', ['canvas', 'panel', 'panel-raised', 'panel-inset'], text);
  add('text-muted', ['canvas', 'panel', 'panel-inset'], text);
  add('accent-text', ['accent'], text);
  add('danger-text', ['danger'], text);
  add('success-text', ['success'], text);
  add('accent', ['panel-inset'], 3);
  add('accent-strong', ['panel-inset'], 3);
  add('warning', ['panel-inset'], 3);
  add('danger', ['panel-inset'], 3);
  add('success', ['panel-inset'], 3);
  add('info', ['panel-inset'], 3);
  add('accent', ['canvas', 'panel', 'panel-raised'], 3);
  add('warning', ['canvas', 'panel', 'panel-raised'], 3);
  add('control-edge', ['canvas', 'panel', 'panel-raised', 'panel-inset'], 3);
  add('focus', ['canvas', 'panel', 'panel-raised', 'panel-inset'], 3);
  add('focus-inner', ['focus'], 3);
  return checks;
}
