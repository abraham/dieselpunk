import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Visual baselines are only valid for the exact Playwright version and image they were rendered on.
// This fails when a Playwright upgrade and the CI image tag drift apart.

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(`${repo}${path}`, 'utf8');
const version = (name: string) =>
  (JSON.parse(read(`node_modules/${name}/package.json`)) as { version: string }).version;

const workflows = readdirSync(`${repo}.github/workflows`).filter((file) => file.endsWith('.yml'));

test('@playwright/test and playwright are the same version', () => {
  assert.equal(version('@playwright/test'), version('playwright'));
});

test('every Playwright image in the workflows matches the installed version', () => {
  const installed = version('@playwright/test');
  const found = workflows.flatMap((file) =>
    [...read(`.github/workflows/${file}`).matchAll(/playwright:v([\d.]+)-noble/g)].map(
      ([, tag]) => ({ file, tag }),
    ),
  );
  assert.ok(found.length > 0, 'No workflow pins a Playwright image');
  for (const { file, tag } of found) {
    assert.equal(tag, installed, `${file} pins playwright:v${tag}, but ${installed} is installed`);
  }
});
