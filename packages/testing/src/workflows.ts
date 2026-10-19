import { parse } from 'yaml';

// specs/security.md §6.2: what a workflow or composite action may contain. Pure, so the test can
// try it on broken examples as well as on the repository's own files.

type Mapping = Record<string, unknown>;

const isMapping = (value: unknown): value is Mapping =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const outsideAction = /^[\w.-]+\/[\w./-]+@v\d+\.\d+\.\d+$/;
const localStepAction = /^\$\/\.github\/actions\/[\w-]+$/;
const localWorkflow = /^\.\/\.github\/workflows\/[\w-]+\.ya?ml$/;
const forbiddenTriggers = ['pull_request_target', 'workflow_run'];

/** What `file`'s top level may grant, at most. */
export type AllowedPermissions = Record<string, 'read'>;

/**
 * What is wrong with one file under `.github/`. `file` is its path from the repository root, and
 * names the problems; `allowed` is the most its top-level `permissions:` may grant.
 */
export function checkWorkflow(file: string, text: string, allowed: AllowedPermissions): string[] {
  const document = parse(text) as unknown;
  if (!isMapping(document)) return [`${file} is not a mapping`];
  const problems: string[] = [];
  const action = /(^|\/)action\.ya?ml$/.test(file);

  if (!action) {
    const permissions = document['permissions'];
    if (permissions === undefined) {
      problems.push(`${file} has no top-level permissions`);
    } else if (!isMapping(permissions)) {
      problems.push(`${file} grants "${String(permissions)}" at the top level`);
    } else {
      for (const [scope, level] of Object.entries(permissions)) {
        if (level !== 'none' && allowed[scope] !== level) {
          problems.push(`${file} grants ${scope}: ${String(level)} at the top level`);
        }
      }
    }

    const on = document['on'];
    const triggers = isMapping(on) ? Object.keys(on) : Array.isArray(on) ? on : [on];
    for (const trigger of triggers) {
      if (forbiddenTriggers.includes(String(trigger))) {
        problems.push(`${file} runs on ${String(trigger)}`);
      }
    }
  }

  const jobs = action
    ? { [file]: document['runs'] }
    : isMapping(document['jobs'])
      ? document['jobs']
      : {};
  for (const [jobName, job] of Object.entries(jobs)) {
    if (!isMapping(job)) continue;
    const where = action ? file : `${file} job ${jobName}`;

    const reusable = job['uses'];
    if (typeof reusable === 'string' && !localWorkflow.test(reusable)) {
      if (!outsideAction.test(reusable)) {
        problems.push(`${where} calls ${reusable}, not by a full vX.Y.Z tag`);
      }
    }

    const steps = Array.isArray(job['steps']) ? job['steps'] : [];
    for (const [index, step] of steps.entries()) {
      if (!isMapping(step)) continue;
      const label = `${where} step ${typeof step['name'] === 'string' ? `"${step['name']}"` : index + 1}`;
      const uses = step['uses'];
      if (typeof uses === 'string') {
        if (uses.startsWith('./')) {
          problems.push(`${label} uses ${uses}; a local action is named as $/…`);
        } else if (!localStepAction.test(uses) && !outsideAction.test(uses)) {
          problems.push(`${label} uses ${uses}, not by a full vX.Y.Z tag`);
        }
        if (uses.startsWith('actions/checkout@')) {
          const options = isMapping(step['with']) ? step['with'] : {};
          if (options['persist-credentials'] !== false) {
            problems.push(`${label} checks out without persist-credentials: false`);
          }
        }
      }
      const run = step['run'];
      if (typeof run === 'string' && run.includes('${{')) {
        problems.push(`${label} puts an expression in its script; pass it through env`);
      }
    }
  }
  return problems;
}
