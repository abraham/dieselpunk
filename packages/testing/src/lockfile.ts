// specs/security.md §5.2 and §5.3: what a lockfile may contain. Pure, so it can be tested on
// recorded lockfiles; scripts/check-lockfile.ts reads the real one.

export const registry = 'https://registry.npmjs.org/';

interface LockEntry {
  resolved?: string;
  integrity?: string;
  link?: boolean;
  inBundle?: boolean;
  hasInstallScript?: boolean;
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
