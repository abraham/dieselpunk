import { unsafeCSS } from 'lit';
import type { TokenMap } from '../tokens/base.ts';
import { density } from '../tokens/density.ts';

function declarations(tokens: TokenMap) {
  return unsafeCSS(
    Object.entries(tokens)
      .map(([name, value]) => `--punk-${name}: ${value};`)
      .join('\n'),
  );
}

/** Token overrides a component applies to its own subtree for a local `density` property. */
export const lowDensityTokens = declarations(density.low);
export const compactDensityTokens = declarations(density.compact);
