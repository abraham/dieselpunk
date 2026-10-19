// specs/security.md §6.1: the results of a CodeQL analysis that fail a pull request. Pure, so it
// can be tested on recorded SARIF; scripts/check-codeql.ts reads what the analysis wrote.

/** The CVSS-style score from which a result is high (7.0) or critical (9.0). */
export const highSeverity = 7;

interface Rule {
  id?: string;
  properties?: { 'security-severity'?: string };
}

interface ToolComponent {
  rules?: Rule[];
}

interface Result {
  ruleId?: string;
  rule?: { id?: string; index?: number; toolComponent?: { index?: number } };
  message?: { text?: string };
  suppressions?: unknown[];
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri?: string };
      region?: { startLine?: number };
    };
  }>;
}

export interface Sarif {
  runs?: Array<{
    tool?: { driver?: ToolComponent; extensions?: ToolComponent[] };
    results?: Result[];
  }>;
}

/** Each unsuppressed result scored at or above `highSeverity`, as `rule at file:line (score)`. */
export function severeResults(sarif: Sarif): string[] {
  const found: string[] = [];
  for (const run of sarif.runs ?? []) {
    const driver = run.tool?.driver ?? {};
    const extensions = run.tool?.extensions ?? [];
    const byId = new Map<string, Rule>();
    for (const component of [driver, ...extensions]) {
      for (const rule of component.rules ?? []) if (rule.id) byId.set(rule.id, rule);
    }
    for (const result of run.results ?? []) {
      if ((result.suppressions ?? []).length > 0) continue;
      const component =
        result.rule?.toolComponent?.index === undefined
          ? driver
          : extensions[result.rule.toolComponent.index];
      const id = result.ruleId ?? result.rule?.id;
      const rule =
        (result.rule?.index === undefined ? undefined : component?.rules?.[result.rule.index]) ??
        (id ? byId.get(id) : undefined);
      const score = Number(rule?.properties?.['security-severity'] ?? Number.NaN);
      if (!(score >= highSeverity)) continue;
      const where = result.locations?.[0]?.physicalLocation;
      const file = where?.artifactLocation?.uri ?? 'an unknown file';
      const line = where?.region?.startLine;
      found.push(`${id ?? rule?.id ?? 'a rule'} at ${file}${line ? `:${line}` : ''} (${score})`);
    }
  }
  return found;
}
