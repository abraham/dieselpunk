import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inlineTokens } from '../scripts/inline-tokens.ts';

const tokenImport = 'import { token } from "../../tokens/token.js";\n';

describe('inlineTokens', () => {
  it('writes each token as its var() with the default, and drops the import', () => {
    const code = `import { css } from 'lit';\n${tokenImport}export const s = css \`gap: \${token('space-2')}; font: \${token('font-family')};\`;\n`;
    assert.equal(
      inlineTokens(code),
      `import { css } from 'lit';\nexport const s = css \`gap: var(--punk-space-2, 8px); font: var(--punk-font-family, "Chakra Petch", "Trebuchet MS", sans-serif);\`;\n`,
    );
  });

  it('leaves code without tokens unchanged', () => {
    const code = 'export const a = 1;\n';
    assert.equal(inlineTokens(code), code);
  });

  it('rejects an unknown token', () => {
    assert.throws(
      () => inlineTokens(`${tokenImport}css \`\${token('space-9')}\``),
      /Unknown token "space-9"/,
    );
  });

  it('rejects a call outside a template interpolation', () => {
    assert.throws(
      () => inlineTokens(`${tokenImport}const e = token('radius');\ncss \`\${token('radius')}\``),
      /inside a template/,
    );
  });
});
