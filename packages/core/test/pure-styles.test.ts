import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { markStylesPure } from '../scripts/pure-styles.ts';

describe('markStylesPure', () => {
  it('wraps module-level css templates and marks unsafeCSS calls', () => {
    const code = [
      "import { css, unsafeCSS } from 'lit';",
      'const image = unsafeCSS(`url(x)`);',
      'export const a = css `a{b:${image}}`;',
    ].join('\n');
    assert.equal(
      markStylesPure(code),
      [
        "import { css, unsafeCSS } from 'lit';",
        'const image = /* @__PURE__ */ unsafeCSS(`url(x)`);',
        'export const a = /* @__PURE__ */ (() => css `a{b:${image}}`)();',
      ].join('\n'),
    );
  });

  it('leaves templates inside functions and classes alone', () => {
    const code =
      'export function f(x) { return css `a{${x}}`; }\nclass A { static styles = css `b{}`; }';
    assert.equal(markStylesPure(code), code);
  });
});
