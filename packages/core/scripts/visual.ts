import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { arch } from 'node:os';
import { fileURLToPath } from 'node:url';

// Runs the visual tests on the Linux image that baselines come from (SPEC-PHASE-1.md §10.3).
//   node scripts/visual.ts check      compare against the committed baselines
//   node scripts/visual.ts update     rewrite the baselines (CI only; see below)
//   node scripts/visual.ts selftest   render twice into a scratch folder and require identical output
// On Linux (CI, inside the Playwright image) Playwright runs directly. Elsewhere it runs in Docker.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const repoDir = fileURLToPath(new URL('../../..', import.meta.url));
const mode = process.argv[2];
const extra = process.argv.slice(3);

if (mode !== 'check' && mode !== 'update' && mode !== 'selftest') {
  console.error('Usage: node scripts/visual.ts <check|update|selftest> [playwright arguments]');
  process.exit(2);
}

const { version } = JSON.parse(
  readFileSync(`${repoDir}node_modules/@playwright/test/package.json`, 'utf8'),
) as { version: string };
const image = `mcr.microsoft.com/playwright:v${version}-noble`;

if (!existsSync(`${repoDir}node_modules/.bin/playwright`)) {
  console.error('Dependencies are not installed. Run `npm ci` first.');
  process.exit(1);
}

// Committed baselines are written by CI, on the same image and architecture it checks with. A local
// container on Apple Silicon is arm64, and emulating amd64 there crashes Chromium, so a local
// "update" would commit baselines CI cannot reproduce.
if (mode === 'update' && !process.env['CI'] && !process.env['PUNK_VISUAL_FORCE_UPDATE']) {
  console.error(
    'Baselines are written by CI. Run the "Update visual baselines" workflow and commit its artifact.\n' +
      'Set PUNK_VISUAL_FORCE_UPDATE=1 to override, for example on a Linux amd64 machine.',
  );
  process.exit(1);
}

execFileSync('node', ['scripts/build-visual.ts'], { cwd: packageDir, stdio: 'inherit' });

if (mode === 'check' && !existsSync(`${packageDir}test/visual/__screenshots__`)) {
  console.error(
    'There are no committed baselines. Run the "Update visual baselines" workflow, download its\n' +
      'artifact, and commit it to packages/core/test/visual/__screenshots__.',
  );
  process.exit(1);
}

const scratch = 'test-results/visual-selftest';

function playwright(args: string[], snapshots?: string): number {
  const command = ['playwright', 'test', ...args, ...extra];
  const env = { ...process.env, ...(snapshots ? { PUNK_VISUAL_SNAPSHOTS: snapshots } : {}) };
  if (process.platform === 'linux') {
    return spawnSync('npx', command, { cwd: packageDir, stdio: 'inherit', env }).status ?? 1;
  }
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
  } catch {
    console.error(
      `Docker is not running. Visual tests must render on ${image}, so this needs Docker.`,
    );
    process.exit(1);
  }
  const forwarded = snapshots ? ['-e', `PUNK_VISUAL_SNAPSHOTS=${snapshots}`] : [];
  const dockerArgs = [
    'run',
    '--rm',
    '--ipc=host',
    '-v',
    `${repoDir}:/work`,
    '-w',
    '/work/packages/core',
  ];
  return (
    spawnSync('docker', [...dockerArgs, ...forwarded, image, 'npx', ...command], {
      cwd: packageDir,
      stdio: 'inherit',
    }).status ?? 1
  );
}

if (mode === 'selftest') {
  // The first run writes fresh baselines to a scratch folder; the second must reproduce them exactly.
  rmSync(`${packageDir}${scratch}`, { recursive: true, force: true });
  const where = process.platform === 'linux' ? 'this machine' : `Docker, ${arch()}`;
  console.log(`Self-test on ${image} (${where})`);
  const first = playwright(['--update-snapshots'], scratch);
  if (first !== 0) process.exit(first);
  process.exit(playwright([], scratch));
}

console.log(`Rendering on ${image}`);
process.exit(playwright(mode === 'update' ? ['--update-snapshots'] : []));
