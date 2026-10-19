import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLockfile, checkRuntimeLicenses, packageName, registry } from '../src/lockfile.ts';
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

describe('checkRuntimeLicenses', () => {
  const tree = (licenses: Record<string, string | undefined>): Lockfile => ({
    lockfileVersion: 3,
    packages: {
      'packages/core': {
        dependencies: { lit: '^3' },
        optionalDependencies: { optional: '^1' },
        devDependencies: { tool: '^1' },
        peerDependencies: { peer: '^1' },
      } as Record<string, unknown>,
      'node_modules/lit': { license: licenses['lit'], dependencies: { 'lit-html': '^3' } },
      'node_modules/lit-html': { license: licenses['lit-html'] },
      // A copy nested under lit wins over the hoisted one, as Node resolves it.
      'node_modules/lit/node_modules/lit-html': { license: licenses['nested'] },
      'node_modules/optional': { license: licenses['optional'] },
      'node_modules/tool': { license: 'GPL-3.0-only' },
      'node_modules/peer': { license: 'GPL-3.0-only' },
    },
  });
  const allowed = { lit: 'BSD-3-Clause', 'lit-html': 'MIT', nested: 'MIT', optional: 'ISC' };

  it('passes runtime dependencies with allowed licenses, ignoring dev and peer ones', () => {
    assert.deepEqual(checkRuntimeLicenses(tree(allowed), ['packages/core']), []);
  });

  it('fails a runtime dependency, direct, nested, or optional, with another license', () => {
    for (const name of ['lit', 'nested', 'optional'] as const) {
      const problems = checkRuntimeLicenses(tree({ ...allowed, [name]: 'GPL-3.0-only' }), [
        'packages/core',
      ]);
      assert.equal(problems.length, 1, name);
      assert.match(problems[0] ?? '', /is licensed GPL-3\.0-only/, name);
    }
  });

  it('fails a missing license, and reads OR and AND expressions', () => {
    const check = (license: string | undefined) =>
      checkRuntimeLicenses(tree({ ...allowed, lit: license }), ['packages/core']);
    assert.match(check(undefined)[0] ?? '', /licensed with no license/);
    assert.deepEqual(check('(MIT OR GPL-3.0-only)'), []);
    assert.equal(check('(MIT AND GPL-3.0-only)').length, 1);
  });

  it("passes the published packages' runtime trees in the repository's own lockfile", () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const lockfile = JSON.parse(readFileSync(`${root}package-lock.json`, 'utf8')) as Lockfile;
    assert.deepEqual(checkRuntimeLicenses(lockfile, ['packages/core', 'packages/locales']), []);
  });
});
