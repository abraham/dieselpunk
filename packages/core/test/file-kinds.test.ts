import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acceptsFile, formatFileSize } from '../src/components/file-field/file-kinds.ts';

describe('file sizes', () => {
  it('uses the largest unit that keeps the size at 1 or more', () => {
    assert.equal(formatFileSize(0, 'en'), '0 byte');
    assert.equal(formatFileSize(999, 'en'), '999 byte');
    assert.equal(formatFileSize(1000, 'en'), '1 kB');
    assert.equal(formatFileSize(1_540_000, 'en'), '1.5 MB');
    assert.equal(formatFileSize(3_200_000_000, 'en'), '3.2 GB');
    assert.equal(formatFileSize(5_000_000_000_000, 'en'), '5,000 GB');
  });

  it('formats for the language', () => {
    assert.equal(formatFileSize(1_540_000, 'de'), '1,5 MB');
  });
});

describe('accepted kinds', () => {
  const plan = { name: 'Plan.PDF', type: 'application/pdf' };
  const photo = { name: 'belt.jpg', type: 'image/jpeg' };

  it('takes every file when accept is empty', () => {
    assert.equal(acceptsFile(plan, ''), true);
    assert.equal(acceptsFile(plan, ' , '), true);
  });

  it('matches extensions without regard to case, MIME types, and type wildcards', () => {
    assert.equal(acceptsFile(plan, '.pdf'), true);
    assert.equal(acceptsFile(plan, 'application/pdf'), true);
    assert.equal(acceptsFile(photo, 'image/*'), true);
    assert.equal(acceptsFile(photo, '.png, image/png'), false);
    assert.equal(acceptsFile(photo, '.png, IMAGE/*'), true);
    assert.equal(acceptsFile(plan, 'image/*'), false);
  });
});
