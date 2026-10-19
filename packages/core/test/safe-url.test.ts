import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeUrl } from '../src/internal/safe-url.ts';

describe('safeUrl', () => {
  for (const url of [
    'https://example.com/a',
    'http://example.com',
    'HTTPS://EXAMPLE.COM',
    'mailto:ops@example.com',
    '//example.com/a',
    '/base/north',
    'north.html',
    '../line',
    '#north',
    '?page=2',
    '',
  ]) {
    it(`keeps ${JSON.stringify(url)}`, () => assert.equal(safeUrl(url), url));
  }

  for (const url of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    '\u0000javascript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'blob:https://example.com/id',
    'file:///etc/passwd',
    'http://[',
  ]) {
    it(`drops ${JSON.stringify(url)}`, () => assert.equal(safeUrl(url), undefined));
  }
});
