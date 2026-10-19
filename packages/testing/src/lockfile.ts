// specs/security.md §5.2 and §5.3: what a lockfile may contain. Pure, so it can be tested on
// recorded lockfiles; scripts/check-lockfile.ts reads the real one.

export const registry = 'https://registry.npmjs.org/';

interface LockEntry {
  resolved?: string;
  integrity?: string;
  link?: boolean;
  inBundle?: boolean;
  hasInstallScript?: boolean;
  license?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface Lockfile {
  lockfileVersion?: number;
  packages?: Record<string, LockEntry>;
}

/** The package an entry installs: the part after its last `node_modules/`. */
export function packageName(path: string): string {
  return path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
}

/**
 * What is wrong with `lock`: an installed package from anywhere but the registry or without an
 * integrity hash, or an install script that `installScripts` (package name to reason) does not
 * list with a reason. A listed package that no longer runs one is wrong too.
 */
export function checkLockfile(lock: Lockfile, installScripts: Record<string, string>): string[] {
  if (!lock.packages) return [`lockfileVersion ${lock.lockfileVersion} has no "packages"`];
  const problems: string[] = [];
  const running = new Set<string>();
  for (const [path, entry] of Object.entries(lock.packages)) {
    // The root and workspaces are this repository; links point at them; bundled packages
    // arrive inside their parent's tarball.
    if (!path.includes('node_modules/') || entry.link || entry.inBundle) continue;
    if (!entry.resolved?.startsWith(registry)) {
      problems.push(`${path} resolves from ${entry.resolved ?? 'nowhere'}, not ${registry}`);
    }
    if (!entry.integrity) problems.push(`${path} has no integrity hash`);
    if (entry.hasInstallScript) running.add(packageName(path));
  }
  for (const name of [...running].sort()) {
    if (!(name in installScripts)) {
      problems.push(`${name} runs an install script, and .install-scripts.json does not list it`);
    } else if (!installScripts[name]?.trim()) {
      problems.push(`${name} is listed in .install-scripts.json without a reason`);
    }
  }
  for (const name of Object.keys(installScripts)) {
    if (!running.has(name)) {
      problems.push(`${name} is listed in .install-scripts.json, but runs no install script`);
    }
  }
  return problems;
}

/** The licenses a published package's runtime dependencies may have (specs/security.md §5.2). */
export const runtimeLicenses = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0'];

/** Where Node finds `name` from the package at `from`, as npm lays out the lockfile. */
function resolveFrom(packages: Record<string, LockEntry>, from: string, name: string) {
  for (let base = from; ;) {
    const path = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (packages[path]) return path;
    if (!base) return undefined;
    const parent = base.lastIndexOf('/node_modules/');
    base = parent === -1 ? '' : base.slice(0, parent);
  }
}

/** Whether an SPDX expression of single licenses joined by OR or AND is allowed. */
function allowedLicense(expression: string): boolean {
  const bare = expression.replace(/[()]/g, '').trim();
  if (bare.includes(' OR ')) return bare.split(' OR ').some((part) => allowedLicense(part));
  if (bare.includes(' AND ')) return bare.split(' AND ').every((part) => allowedLicense(part));
  return runtimeLicenses.includes(bare);
}

/**
 * What is wrong with the licenses of what `workspaces` (paths such as `packages/core`) install at
 * run time: their dependencies and optional dependencies, and theirs in turn. Peers are the
 * consumer's, and development dependencies are not installed with the package.
 */
export function checkRuntimeLicenses(lock: Lockfile, workspaces: string[]): string[] {
  const packages = lock.packages;
  if (!packages) return [`lockfileVersion ${lock.lockfileVersion} has no "packages"`];
  const problems: string[] = [];
  const seen = new Set<string>();
  const visit = (from: string, via: string) => {
    const entry = packages[from];
    const names = Object.keys({ ...entry?.dependencies, ...entry?.optionalDependencies });
    for (const name of names) {
      const path = resolveFrom(packages, from, name);
      if (!path) {
        problems.push(`${name}, needed by ${via}, is not in the lockfile`);
        continue;
      }
      if (seen.has(path)) continue;
      seen.add(path);
      const license = packages[path]?.license;
      if (!license || !allowedLicense(license)) {
        problems.push(
          `${name}, at run time for ${via}, is licensed ${license ?? 'with no license'}`,
        );
      }
      visit(path, via);
    }
  };
  for (const workspace of workspaces) visit(workspace, workspace);
  return problems;
}
