import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Writes a CycloneDX SBOM of each published package to <out dir>/<package>.cdx.json
// (specs/security.md §7). Run after `npm run build`.
//   node scripts/sbom.ts <out dir>
//
// `npm sbom` cannot describe one workspace of this repository: it describes the root, which has
// no version, with every workspace in it. So each package is packed, unpacked on its own, and
// resolved as a consumer would install it. Its peers are resolved, since `npm sbom` refuses a tree
// with missing ones, and then left out of the SBOM: the consumer chooses those versions.

const out = process.argv[2];
if (!out) {
  console.error('Usage: node scripts/sbom.ts <out dir>');
  process.exit(2);
}
const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = resolve(out);
mkdirSync(outDir, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'punk-sbom-'));
const npm = (args: string[], cwd: string) => execFileSync('npm', args, { cwd, encoding: 'utf8' });

try {
  for (const name of ['core', 'locales']) {
    const pack = ['pack', '-w', `@dieselpunk/${name}`, '--pack-destination', work, '--json'];
    const [packed] = JSON.parse(npm(pack, root)) as Array<{ filename: string }>;
    const dir = join(work, name);
    mkdirSync(dir);
    execFileSync('tar', ['-xzf', join(work, packed!.filename), '-C', dir, '--strip-components=1']);

    // npm resolves devDependencies even with --omit dev, and they name private workspaces.
    const manifestFile = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
    delete manifest['devDependencies'];
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

    npm(['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
    const sbom = npm(
      ['sbom', '--package-lock-only', '--omit', 'peer', '--sbom-format', 'cyclonedx'],
      dir,
    );
    const file = join(outDir, `${name}.cdx.json`);
    writeFileSync(file, sbom);

    const { components } = JSON.parse(sbom) as {
      components: Array<{ name: string; version: string }>;
    };
    const listed = components.map((component) => `${component.name}@${component.version}`);
    console.log(`${file}: ${listed.join(', ') || 'no runtime dependencies'}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
