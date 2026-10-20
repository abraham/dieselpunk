import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { minifyCss } from '../scripts/minify-css.ts';

const wrap = (body: string) => `const s = css \`${body}\`;`;

describe('minifyCss', () => {
  it('removes comments, needless whitespace, and the last semicolon of a block', () => {
    const body = `
  /* The host. */
  :host {
    display: flex;
    gap: var(--a, 8px);
  }

  :host([x='y']) .line,
  .b > .c {
    border: 1px solid red;
  }
`;
    assert.equal(
      minifyCss(wrap(body)),
      wrap(":host{display:flex;gap:var(--a,8px)}:host([x='y']) .line,.b > .c{border:1px solid red}"),
    );
  });

  it('keeps a comment as a token separator', () => {
    assert.equal(minifyCss(wrap('a/* x */b{}')), wrap('a b{}'));
  });

  it('keeps strings as they are', () => {
    assert.equal(minifyCss(wrap(`a { content: '  /* x */  '; b: "a ; }" }`)), wrap(`a{content:'  /* x */  ';b:"a ; }"}`));
  });

  it('keeps one space beside a placeholder where it may separate tokens', () => {
    const code = 'const s = css `\n  ${x} ${y} 0 red,\n  ${z};\n  .a { calc(-1 * ${w}) }\n`;';
    assert.equal(minifyCss(code), 'const s = css `${x} ${y} 0 red,${z};.a{calc(-1 * ${w})}`;');
  });

  it('minifies nested templates and leaves other tags alone', () => {
    const code = 'const s = css `a { b: ${f(css` c `)} }`; const h = html` <p> x </p> `;';
    assert.equal(minifyCss(code), 'const s = css `a{b:${f(css`c`)}}`; const h = html` <p> x </p> `;');
  });

  it('rejects a comment that spans a placeholder', () => {
    assert.throws(() => minifyCss(wrap('a { /* ${x} */ }')), /comment/);
  });
});
