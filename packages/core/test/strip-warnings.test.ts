import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stripWarnings } from '../scripts/strip-warnings.ts';

const squash = (code: string) => code.replace(/\s+/g, ' ').trim();

describe('stripWarnings', () => {
  it('removes warning statements, the ifs they leave empty, and their imports', () => {
    const code = `import { devWarn, warnNew } from '../warn.js';
import { other } from './other.js';
class A {
  updated() {
    render();
    if (this.a && !this.warned) devWarn(this, 'one');
    if (this.b) {
      this.warned = true;
      devWarn(this, 'two');
    }
    this.problems = warnNew(this, this.problems, () => ['three']);
  }
}`;
    assert.equal(
      squash(stripWarnings(code)),
      squash(`import { other } from './other.js';
class A {
  updated() {
    render();
    if (this.b) {
      this.warned = true;
    }
  }
}`),
    );
  });

  it('removes warn methods and calls to them, and an else that only warns', () => {
    const code = `import { other, devWarn } from '../warn.js';
class A {
  #warnOnce(key, message) { devWarn(this, message); }
  warnIfUnnamed(name) { if (!name) devWarn(this, 'unnamed'); }
  sync() {
    if (this.a) this.#warnOnce('a', 'four');
    this.warnIfUnnamed(this.name);
    if (first) first.focus();
    else if (!this.warnedItems) { devWarn(this, 'five'); }
  }
}`;
    assert.equal(
      squash(stripWarnings(code)),
      squash(`import { other } from '../warn.js';
class A {
  sync() {
    if (first) first.focus();
  }
}`),
    );
  });

  it('rejects a warning that is not a statement of its own', () => {
    assert.throws(
      () => stripWarnings(`const shown = ready && devWarn(this, 'six');`),
      /devWarn is not a statement of its own/,
    );
  });
});
