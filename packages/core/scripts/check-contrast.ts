import { themeNames, themes } from '../src/tokens/themes.ts';
import type { Theme, ThemeName } from '../src/tokens/themes.ts';

export interface ContrastFailure {
  theme: string;
  rule: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected a 6-digit hex color, got "${hex}"`);
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => channel(parseInt(part ?? '', 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TEXT_SURFACES = ['canvas', 'panel', 'panel-raised', 'panel-inset'];
const MUTED_TEXT_SURFACES = ['canvas', 'panel', 'panel-inset'];
const FILLS = ['accent', 'accent-strong', 'warning', 'danger', 'success', 'info'];
const FOCUS_SURFACES = TEXT_SURFACES;
// Selection and highlight outlines; panel-inset is already covered by the fill rule.
const OUTLINES = ['accent', 'warning'];
const OUTLINE_SURFACES = ['canvas', 'panel', 'panel-raised'];

/** Checks every theme against the rules in SPEC-PHASE-1.md section 6.8 and SPEC-PHASE-2.md section 6.3. */
export function evaluateContrast(
  themeMap: Readonly<Record<string, Theme>> = themes,
): ContrastFailure[] {
  const failures: ContrastFailure[] = [];

  for (const [themeName, theme] of Object.entries(themeMap)) {
    const textRequired = themeName === ('high-contrast' satisfies ThemeName) ? 7 : 4.5;

    const color = (name: string): string => {
      const value = theme.tokens[`color-${name}`];
      if (value === undefined) throw new Error(`Theme "${themeName}" is missing color-${name}`);
      return value;
    };

    const check = (rule: string, foreground: string, background: string, required: number) => {
      const ratio = contrastRatio(color(foreground), color(background));
      if (ratio < required) {
        failures.push({
          theme: themeName,
          rule,
          foreground,
          background,
          ratio,
          required,
        });
      }
    };

    for (const surface of TEXT_SURFACES) check('text', 'text', surface, textRequired);
    for (const surface of MUTED_TEXT_SURFACES) {
      check('text-muted', 'text-muted', surface, textRequired);
    }
    for (const fill of FILLS) check('fill', fill, 'panel-inset', 3);
    for (const outline of OUTLINES) {
      for (const surface of OUTLINE_SURFACES) check('outline', outline, surface, 3);
    }
    for (const surface of TEXT_SURFACES) check('control-edge', 'control-edge', surface, 3);
    check('accent-text', 'accent-text', 'accent', textRequired);
    check('danger-text', 'danger-text', 'danger', textRequired);
    for (const surface of FOCUS_SURFACES) check('focus-outer', 'focus', surface, 3);
    check('focus-pair', 'focus-inner', 'focus', 3);
  }

  return failures;
}

export function formatFailures(failures: readonly ContrastFailure[]): string {
  return failures
    .map(
      (f) =>
        `${f.theme}: ${f.rule} ${f.foreground} on ${f.background} is ${f.ratio.toFixed(2)}:1, needs ${f.required}:1`,
    )
    .join('\n');
}

if (import.meta.main) {
  const failures = evaluateContrast();
  if (failures.length > 0) {
    console.error(formatFailures(failures));
    process.exit(1);
  }
  console.log(`Contrast gate passed for ${themeNames.length} themes.`);
}
