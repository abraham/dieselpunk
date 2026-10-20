import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * Removes the `desc` of each `msg()` call. It is for translators: `lit-localize extract` reads it
 * from the source, and the runtime reads only the `id` (specs/localization.md §2).
 */
export function dropDescriptions(code: string): string {
  const source = ts.createSourceFile(
    'file.js',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const edits: { start: number; end: number }[] = [];
  const visit = (node: ts.Node): void => {
    const options =
      ts.isCallExpression(node) && node.expression.getText(source) === 'msg'
        ? node.arguments[1]
        : undefined;
    if (options && ts.isObjectLiteralExpression(options)) {
      const properties = options.properties;
      const index = properties.findIndex((property) => property.name?.getText(source) === 'desc');
      if (index !== -1) {
        // The property and the comma before it, or after it when it comes first.
        const start = index > 0 ? properties[index - 1]!.end : properties[index]!.getStart(source);
        const end =
          index > 0
            ? properties[index]!.end
            : (properties[index + 1]?.getStart(source) ?? properties[index]!.end);
        edits.push({ start, end });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  let result = code;
  for (const { start, end } of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + result.slice(end);
  }
  return result;
}

if (import.meta.main) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  let changed = 0;
  for (const file of readdirSync(dist, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.js')) continue;
    const code = readFileSync(dist + file, 'utf8');
    const result = dropDescriptions(code);
    if (result === code) continue;
    writeFileSync(dist + file, result);
    changed++;
  }
  console.log(`Dropped message descriptions in ${changed} files`);
}
