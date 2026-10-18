import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLockfile, packageName, registry } from '../src/lockfile.ts';
import type { Lockfile } from '../src/lockfile.ts';

const integrity = 'sha512-abc';
const from = (name: string) => `${registry}${name}/-/${name.split('/').at(-1)}-1.0.0.tgz`;

function lock(packages: Lockfile['packages']): Lockfile {
  return {
    lockfileVersion: 3,
    packages: {
      '': { link: false },
      'packages/core': {},
      'node_modules/@dieselpunk/core': { resolved: 'packages/core', link: true },
      ...packages,
    },
  };
}

describe('packageName', () => {
  it('takes the part after the last node_modules/', () => {
    assert.equal(packageName('node_modules/esbuild'), 'esbuild');
    assert.equal(packageName('node_modules/a/node_modules/@scope/b'), '@scope/b');
    assert.equal(packageName('packages/core/node_modules/lit'), 'lit');
  });
});

describe('checkLockfile', () => {
  it('passes registry packages with integrity, the root, workspaces, links, and bundled ones', () => {
    const clean = lock({
      'node_modules/lit': { resolved: from('lit'), integrity },
      'node_modules/a/node_modules/b': { resolved: from('b'), integrity },
      'node_modules/a/node_modules/bundled': { inBundle: true },
    });
    assert.deepEqual(checkLockfile(clean, {}), []);
  });

  it('fails a package from anywhere but the registry', () => {
    for (const resolved of [
      'https://registry.example.com/lit/-/lit-1.0.0.tgz',
      'git+ssh://git@github.com/lit/lit.git#abc',
      'file:../lit',
      'http://registry.npmjs.org/lit/-/lit-1.0.0.tgz',
      undefined,
    ]) {
      const [problem] = checkLockfile(lock({ 'node_modules/lit': { resolved, integrity } }), {});
      assert.match(problem ?? '', /node_modules\/lit resolves from/, String(resolved));
    }
  });

  it('fails a package without an integrity hash', () => {
    const problems = checkLockfile(lock({ 'node_modules/lit': { resolved: from('lit') } }), {});
    assert.deepEqual(problems, ['node_modules/lit has no integrity hash']);
  });

  it('fails an install script that is not listed, or listed without a reason', () => {
    const scripted = lock({
      'node_modules/esbuild': { resolved: from('esbuild'), integrity, hasInstallScript: true },
      'node_modules/x/node_modules/@scope/native': {
        resolved: from('@scope/native'),
        integrity,
        hasInstallScript: true,
      },
    });
    assert.deepEqual(
      checkLockfile(scripted, { esbuild: 'installs its binary', '@scope/native': ' ' }),
      ['@scope/native is listed in .install-scripts.json without a reason'],
    );
    assert.deepEqual(checkLockfile(scripted, { '@scope/native': 'builds it' }), [
      'esbuild runs an install script, and .install-scripts.json does not list it',
    ]);
  });

  it('fails a listed package that runs no install script', () => {
    const plain = lock({ 'node_modules/esbuild': { resolved: from('esbuild'), integrity } });
    assert.deepEqual(checkLockfile(plain, { esbuild: 'installs its binary' }), [
      'esbuild is listed in .install-scripts.json, but runs no install script',
    ]);
  });

  it('fails a lockfile without "packages"', () => {
    assert.deepEqual(checkLockfile({ lockfileVersion: 1 }, {}), [
      'lockfileVersion 1 has no "packages"',
    ]);
  });

  it("passes the repository's own lockfile", () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const read = (file: string) => JSON.parse(readFileSync(`${root}${file}`, 'utf8')) as unknown;
    const problems = checkLockfile(
      read('package-lock.json') as Lockfile,
      read('.install-scripts.json') as Record<string, string>,
    );
    assert.deepEqual(problems, []);
  });
});
