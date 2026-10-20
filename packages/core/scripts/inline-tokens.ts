import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokenNames, tokenValue } from '../src/tokens/token.ts';
import type { TokenName } from '../src/tokens/token.ts';

const call = /\$\{token\('([^']*)'\)\}/g;
const tokenImport = /^import \{ token \} from "(?:\.\.?\/)+tokens\/token\.js";\n/m;

/**
 * Writes each `${token('name')}` in emitted code as the text it evaluates to, so an entry no longer
 * bundles every token's default to look one up (specs/performance.md §2).
 */
export function inlineTokens(code: string): string {
  const inlined = code.replace(call, (_, name: string) => {
    if (!tokenNames.includes(name as TokenName)) throw new Error(`Unknown token "${name}"`);
    return tokenValue(name as TokenName).replace(/[`\\]|\$\{/g, (c) => `\\${c}`);
  });
  if (inlined === code) return code;
  const result = inlined.replace(tokenImport, '');
  if (/\btoken\(|tokens\/token\.js/.test(result)) {
    throw new Error("token() can only be inlined as ${token('name')} inside a template");
  }
  return result;
}

if (import.meta.main) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  let changed = 0;
  for (const file of readdirSync(dist, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.js')) continue;
    const code = readFileSync(dist + file, 'utf8');
    let result: string;
    try {
      result = inlineTokens(code);
    } catch (error) {
      throw new Error(`dist/${file}: ${(error as Error).message}`, { cause: error });
    }
    if (result === code) continue;
    writeFileSync(dist + file, result);
    changed++;
  }
  console.log(`Inlined tokens in ${changed} files`);
}
