import tokensCss from '@dieselpunk/core/tokens.css?raw';

function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/--punk-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (name && value) found.set(name, value.trim());
  }
  return found;
}

function blockAfter(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`tokens.css has no rule for ${selector}`);
  return css.slice(css.indexOf('{', start), css.indexOf('}', start));
}

/** Non-color tokens at compact density, as shipped in `tokens.css`. */
export const compactTokens = declarations(blockAfter(tokensCss, ':where(:root) {'));

/** Tokens the low-density rule overrides. */
export const lowTokens = declarations(blockAfter(tokensCss, '[data-punk-density="low"]'));

/** Every color token name, in the order `tokens.css` lists them. */
export const colorNames = [
  ...new Set([...tokensCss.matchAll(/--punk-(color-[a-z0-9-]+)\s*:/g)].map(([, name]) => name)),
] as string[];
