import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pageWindow } from '../src/components/pagination/page-window.ts';

describe('page window', () => {
  it('shows every page when there are few', () => {
    assert.deepEqual(pageWindow(1, 1, 1), [1]);
    assert.deepEqual(pageWindow(2, 3, 1), [1, 2, 3]);
    assert.deepEqual(pageWindow(1, 5, 1), [1, 2, 'gap', 5]);
    assert.deepEqual(pageWindow(3, 5, 1), [1, 2, 3, 4, 5]);
  });

  it('keeps the first and last pages and a window around the current one', () => {
    assert.deepEqual(pageWindow(10, 20, 1), [1, 'gap', 9, 10, 11, 'gap', 20]);
    assert.deepEqual(pageWindow(10, 20, 2), [1, 'gap', 8, 9, 10, 11, 12, 'gap', 20]);
    assert.deepEqual(pageWindow(10, 20, 0), [1, 'gap', 10, 'gap', 20]);
  });

  it('shows a single left-out page instead of a gap', () => {
    assert.deepEqual(pageWindow(4, 20, 1), [1, 2, 3, 4, 5, 'gap', 20]);
    assert.deepEqual(pageWindow(17, 20, 1), [1, 'gap', 16, 17, 18, 19, 20]);
  });

  it('works at both ends', () => {
    assert.deepEqual(pageWindow(1, 20, 1), [1, 2, 'gap', 20]);
    assert.deepEqual(pageWindow(20, 20, 1), [1, 'gap', 19, 20]);
  });

  it('never repeats a page and keeps them in order', () => {
    for (let pages = 1; pages <= 30; pages++) {
      for (let page = 1; page <= pages; page++) {
        for (const siblings of [0, 1, 2, 3]) {
          const numbers = pageWindow(page, pages, siblings).filter((entry) => entry !== 'gap');
          assert.deepEqual(
            numbers,
            [...new Set(numbers)].sort((a, b) => a - b),
          );
          assert.ok(numbers.includes(page) && numbers.includes(1) && numbers.includes(pages));
        }
      }
    }
  });
});
