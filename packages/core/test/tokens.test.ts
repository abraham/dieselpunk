import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildCss } from '../scripts/build-css.ts';
import { contrastRatio, evaluateContrast, formatFailures } from '../scripts/check-contrast.ts';
import { renderThemesCss, renderTokensCss } from '../scripts/render-css.ts';
import { baseTokens } from '../src/tokens/base.ts';
import type { TokenMap } from '../src/tokens/base.ts';
import { density, densityModes } from '../src/tokens/density.ts';
import { darkTokens } from '../src/tokens/default-theme.ts';
import { autoLightThemeName, defaultThemeName, themeNames, themes } from '../src/tokens/themes.ts';

interface ParsedRule {
  media: string | undefined;
  selector: string;
  declarations: Record<string, string>;
}

function parseDeclarations(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    result[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
  }
  return result;
}

function parseCss(css: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const parseBlock = (source: string, media?: string): void => {
    let index = 0;
    while (index < source.length) {
      const open = source.indexOf('{', index);
      if (open === -1) break;
      let depth = 1;
      let close = open + 1;
      while (close < source.length && depth > 0) {
        if (source[close] === '{') depth++;
        else if (source[close] === '}') depth--;
        close++;
      }
      const header = source.slice(index, open).trim().replace(/\s+/g, ' ');
      const body = source.slice(open + 1, close - 1);
      if (header.startsWith('@media')) parseBlock(body, header);
      else rules.push({ media, selector: header, declarations: parseDeclarations(body) });
      index = close;
    }
  };
  parseBlock(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  return rules;
}

function prefixed(tokens: TokenMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [`--punk-${name}`, value]),
  );
}

function themeDeclarations(name: (typeof themeNames)[number]): Record<string, string> {
  const theme = themes[name];
  return { 'color-scheme': theme.colorScheme, ...prefixed(theme.tokens) };
}

function findRule(rules: ParsedRule[], selector: string, media?: string): ParsedRule {
  const rule = rules.find((r) => r.selector === selector && r.media === media);
  assert.ok(rule, `Missing rule ${media ?? ''} ${selector}`);
  return rule;
}

describe('token sources', () => {
  it('fall back to the default theme, which components import on its own to stay small', () => {
    assert.deepEqual(darkTokens, themes[defaultThemeName].tokens);
  });

  it('give every theme the same token names', () => {
    const reference = Object.keys(themes[defaultThemeName].tokens).sort();
    for (const name of themeNames) {
      assert.deepEqual(Object.keys(themes[name].tokens).sort(), reference, name);
    }
  });

  it('use 6-digit hex for every color', () => {
    for (const name of themeNames) {
      for (const [token, value] of Object.entries(themes[name].tokens)) {
        if (token.startsWith('color-')) assert.match(value, /^#[0-9a-f]{6}$/i, `${name} ${token}`);
      }
    }
  });

  it('never reference other custom properties, so subtree overrides keep working', () => {
    const all: TokenMap[] = [baseTokens, ...themeNames.map((n) => themes[n].tokens)];
    for (const tokens of all) {
      for (const [token, value] of Object.entries(tokens)) {
        assert.ok(!value.includes('var('), `${token} references another property`);
      }
    }
  });

  it('only override density tokens that exist in the base set', () => {
    for (const mode of densityModes) {
      for (const name of Object.keys(density[mode])) {
        assert.ok(name in baseTokens, `${mode}: ${name}`);
      }
    }
    assert.deepEqual(Object.keys(density.compact), Object.keys(density.low));
    for (const [name, value] of Object.entries(density.low)) {
      assert.notEqual(value, density.compact[name], `low density does not change ${name}`);
    }
  });
});

describe('emitted CSS', () => {
  const tokensRules = parseCss(renderTokensCss());
  const themesRules = parseCss(renderThemesCss());

  it('writes base tokens at zero specificity', () => {
    assert.deepEqual(findRule(tokensRules, ':where(:root)').declarations, prefixed(baseTokens));
  });

  it('writes the default theme on :root and its own attribute', () => {
    const rule = findRule(tokensRules, `:where(:root), [data-punk-theme="${defaultThemeName}"]`);
    assert.deepEqual(rule.declarations, themeDeclarations(defaultThemeName));
  });

  it('writes both density modes', () => {
    for (const mode of densityModes) {
      const rule = findRule(tokensRules, `[data-punk-density="${mode}"]`);
      assert.deepEqual(rule.declarations, prefixed(density[mode]));
    }
  });

  it('writes every other theme as an attribute rule', () => {
    for (const name of themeNames.filter((n) => n !== defaultThemeName)) {
      const rule = findRule(themesRules, `[data-punk-theme="${name}"]`);
      assert.deepEqual(rule.declarations, themeDeclarations(name));
    }
  });

  it('maps auto to the default theme and, under a light preference, the light theme', () => {
    const dark = findRule(themesRules, '[data-punk-theme="auto"]');
    assert.deepEqual(dark.declarations, themeDeclarations(defaultThemeName));
    const light = findRule(
      themesRules,
      '[data-punk-theme="auto"]',
      '@media (prefers-color-scheme: light)',
    );
    assert.deepEqual(light.declarations, themeDeclarations(autoLightThemeName));
  });

  it('declares only tokens that exist in the TypeScript sources, and all of them', () => {
    const source = new Set<string>();
    for (const tokens of [baseTokens, ...themeNames.map((n) => themes[n].tokens)]) {
      for (const name of Object.keys(tokens)) source.add(`--punk-${name}`);
    }
    const emitted = new Set<string>();
    for (const rule of [...tokensRules, ...themesRules]) {
      for (const name of Object.keys(rule.declarations)) {
        if (name.startsWith('--')) emitted.add(name);
      }
    }
    assert.deepEqual([...emitted].sort(), [...source].sort());
  });

  it('is deterministic and marked as generated', () => {
    assert.equal(renderTokensCss(), renderTokensCss());
    assert.match(renderTokensCss(), /^\/\* Generated by scripts\/build-css\.ts/);
    assert.match(renderThemesCss(), /^\/\* Generated by scripts\/build-css\.ts/);
  });

  it('is written to disk by the build script', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'punk-css-'));
    try {
      const outDir = pathToFileURL(`${directory}/`);
      await buildCss(outDir);
      assert.equal(await readFile(join(directory, 'tokens.css'), 'utf8'), renderTokensCss());
      assert.equal(await readFile(join(directory, 'themes.css'), 'utf8'), renderThemesCss());
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('contrast gate', () => {
  it('computes known ratios', () => {
    assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 0.001);
    assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.01);
  });

  it('passes for every shipped theme', () => {
    assert.deepEqual(evaluateContrast(), [], formatFailures(evaluateContrast()));
  });

  it('fails a theme whose text is too dim', () => {
    const dim = {
      colorScheme: 'dark',
      tokens: { ...themes.industrial.tokens, 'color-text': '#444444' },
    } as const;
    const failures = evaluateContrast({ dim });
    assert.ok(failures.some((f) => f.rule === 'text' && f.theme === 'dim'));
  });

  it('fails a theme whose control edge is too dim on any surface', () => {
    const industrial: Record<string, string> = themes.industrial.tokens;
    for (const surface of ['canvas', 'panel', 'panel-raised', 'panel-inset']) {
      const dim = {
        colorScheme: 'dark',
        tokens: { ...industrial, 'color-control-edge': industrial[`color-${surface}`] ?? '' },
      } as const;
      const failures = evaluateContrast({ dim });
      assert.ok(
        failures.some((f) => f.rule === 'control-edge' && f.background === surface),
        surface,
      );
    }
  });

  it('fails a theme whose selection or highlight outline is lost on a raised surface', () => {
    for (const outline of ['accent', 'warning']) {
      const lost = {
        colorScheme: 'dark',
        tokens: {
          ...themes.industrial.tokens,
          [`color-${outline}`]: themes.industrial.tokens['color-panel-raised'],
        },
      } as const;
      const failures = evaluateContrast({ lost });
      assert.ok(
        failures.some(
          (f) =>
            f.rule === 'outline' && f.foreground === outline && f.background === 'panel-raised',
        ),
        outline,
      );
    }
  });

  it('fails a theme whose muted text, such as a placeholder, is lost on the inset surface', () => {
    const lost = {
      colorScheme: 'dark',
      tokens: {
        ...themes.industrial.tokens,
        'color-text-muted': themes.industrial.tokens['color-panel-inset'],
      },
    } as const;
    const failures = evaluateContrast({ lost });
    assert.ok(
      failures.some(
        (f) => f.rule === 'text-muted' && f.background === 'panel-inset' && f.required === 4.5,
      ),
    );
  });

  it('requires 7:1 text contrast in the high-contrast theme', () => {
    const almost = {
      ...themes['high-contrast'],
      tokens: { ...themes['high-contrast'].tokens, 'color-text': '#9a9a9a' },
    };
    const failures = evaluateContrast({ 'high-contrast': almost });
    assert.ok(failures.some((f) => f.required === 7));
  });
});
