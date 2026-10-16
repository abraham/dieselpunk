import { spawnSync } from 'node:child_process';

const REQUIRED_NODE_MAJOR = 26;
const REQUIRED_TYPESCRIPT = /^6\.0\.\d+$/;

interface TreeNode {
  version?: string;
  dependencies?: Record<string, TreeNode>;
}

function collectTypescriptVersions(node: TreeNode, found: Set<string>): void {
  for (const [name, child] of Object.entries(node.dependencies ?? {})) {
    if (name === 'typescript' && child.version) found.add(child.version);
    collectTypescriptVersions(child, found);
  }
}

const problems: string[] = [];

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < REQUIRED_NODE_MAJOR) {
  problems.push(`Node ${process.versions.node} is older than required Node ${REQUIRED_NODE_MAJOR}`);
}

// npm exits non-zero for unrelated peer problems, so only the JSON on stdout is used.
const result = spawnSync('npm', ['ls', 'typescript', '--all', '--json'], { encoding: 'utf8' });
const versions = new Set<string>();
try {
  collectTypescriptVersions(JSON.parse(result.stdout) as TreeNode, versions);
} catch {
  problems.push('Could not parse `npm ls typescript --all --json` output');
}

if (versions.size === 0) {
  problems.push('TypeScript is not installed');
}
if (versions.size > 1) {
  problems.push(`Multiple TypeScript versions installed: ${[...versions].join(', ')}`);
}
for (const version of versions) {
  if (!REQUIRED_TYPESCRIPT.test(version)) {
    problems.push(`TypeScript ${version} is not 6.0.x`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Toolchain OK: Node ${process.versions.node}, TypeScript ${[...versions].join(', ')}`);
