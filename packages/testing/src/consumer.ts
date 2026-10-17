import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';

// Building blocks of the consumer and framework checks (specs/testing.md §8): packed packages
// installed into throwaway projects, and pages driven in Chromium that must log nothing.

/** Runs a command and returns its output; on failure the error carries `stdout` and `stderr`. */
export const run = (command: string, args: string[], cwd: string): string =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Packs the package in `directory` into `destination`, and returns the tarball's path. */
export function pack(directory: string, destination: string): string {
  const [packed] = JSON.parse(
    run('npm', ['pack', '--json', '--pack-destination', destination], directory),
  ) as Array<{ filename: string }>;
  if (!packed) throw new Error(`npm pack wrote nothing for ${directory}`);
  return join(destination, packed.filename);
}

/** Writes a private package.json to `project` and installs it without running any script. */
export function installProject(
  project: string,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string> = {},
): void {
  mkdirSync(project, { recursive: true });
  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify({
      name: 'consumer',
      private: true,
      type: 'module',
      dependencies,
      devDependencies,
    }),
  );
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], project);
}

/** Collects the page's console errors and warnings, and its uncaught errors, as they happen. */
export function watchPage(page: Page): string[] {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) messages.push(message.text());
  });
  page.on('pageerror', (error) => messages.push(error.message));
  return messages;
}
