import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * Marks each module-level style constant as pure, so a bundler drops the ones an entry does not
 * use (specs/performance.md §2). Bundlers keep any unused `css` tagged template, because a tag
 * may have side effects and a pure annotation does not apply to one; wrapping it in an annotated
 * arrow call does, and bundlers inline the arrow again.
 */
export function markStylesPure(code: string): string {
  const source = ts.createSourceFile(
    'file.js',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const edits: { start: number; end: number; text: string }[] = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const { initializer } of statement.declarationList.declarations) {
      if (!initializer) continue;
      const start = initializer.getStart(source);
      if (ts.isTaggedTemplateExpression(initializer) && initializer.tag.getText(source) === 'css') {
        edits.push({
          start,
          end: initializer.end,
          text: `/* @__PURE__ */ (() => ${initializer.getText(source)})()`,
        });
      } else if (
        ts.isCallExpression(initializer) &&
        initializer.expression.getText(source) === 'unsafeCSS'
      ) {
        edits.push({ start, end: start, text: '/* @__PURE__ */ ' });
      }
    }
  }
  let result = code;
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  return result;
}

if (import.meta.main) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  let changed = 0;
  for (const file of readdirSync(dist, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.js')) continue;
    const code = readFileSync(dist + file, 'utf8');
    const result = markStylesPure(code);
    if (result === code) continue;
    writeFileSync(dist + file, result);
    changed++;
  }
  console.log(`Marked styles pure in ${changed} files`);
}
