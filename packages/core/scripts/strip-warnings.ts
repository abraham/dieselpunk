import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// specs/package-contract.md §6: `dist/development/` keeps the warnings; `dist/` is stripped of them.

const warners = new Set(['devWarn', 'warnNew']);
// `warnName`, `#warnOnce`; not the `#warned` fields that remember a warning.
const warnMethod = /^#?warn[A-Z]/;

/** A statement that only warns: a call to `devWarn` or `warnNew`, maybe assigned, or to `this.warn…`. */
function isWarning(node: ts.Node): boolean {
  if (!ts.isExpressionStatement(node)) return false;
  let expression = node.expression;
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    expression = expression.right;
  }
  if (!ts.isCallExpression(expression)) return false;
  const callee = expression.expression;
  if (ts.isIdentifier(callee)) return warners.has(callee.text);
  return (
    ts.isPropertyAccessExpression(callee) &&
    callee.expression.kind === ts.SyntaxKind.ThisKeyword &&
    warnMethod.test(callee.name.text)
  );
}

/** Whether a statement does nothing once its warnings are gone. */
function removable(node: ts.Statement): boolean {
  if (isWarning(node)) return true;
  if (ts.isBlock(node)) return node.statements.every(removable);
  return ts.isIfStatement(node) && !node.elseStatement && removable(node.thenStatement);
}

const isWarnMethod = (member: ts.ClassElement) =>
  ts.isMethodDeclaration(member) &&
  member.name !== undefined &&
  warnMethod.test(member.name.getText());

/** Removes development warnings: their statements, `warn…` methods, and their imports. */
export function stripWarnings(code: string, file = 'file.js'): string {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const cuts: { start: number; end: number; text: string }[] = [];
  const cut = (node: ts.Node, text = '') =>
    cuts.push({ start: node.getFullStart(), end: node.end, text });

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const named = node.importClause?.namedBindings;
      if (
        named &&
        ts.isNamedImports(named) &&
        named.elements.some((e) => warners.has(e.name.text))
      ) {
        const kept = named.elements
          .filter((e) => !warners.has(e.name.text))
          .map((e) => e.getText());
        if (kept.length === 0 && !node.importClause?.name) cut(node);
        else cuts.push({ start: named.getStart(), end: named.end, text: `{ ${kept.join(', ')} }` });
      }
      return;
    }
    if (ts.isClassLike(node)) {
      for (const member of node.members) {
        if (isWarnMethod(member)) cut(member);
        else visit(member);
      }
      return;
    }
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isCaseOrDefaultClause(node)) {
      for (const statement of node.statements) {
        if (removable(statement)) cut(statement);
        else visit(statement);
      }
      return;
    }
    if (ts.isIfStatement(node)) {
      if (removable(node.thenStatement)) cut(node.thenStatement, node.elseStatement ? ' {}' : ' ;');
      else visit(node.thenStatement);
      if (node.elseStatement && removable(node.elseStatement)) {
        cuts.push({ start: node.thenStatement.end, end: node.elseStatement.end, text: '' });
      } else if (node.elseStatement) visit(node.elseStatement);
      visit(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  let result = code;
  for (const { start, end, text } of cuts.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  const left: string[] = [];
  const check = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && warners.has(node.text)) left.push(node.text);
    if (ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword) {
      if (warnMethod.test(node.name.text)) left.push(node.name.text);
    }
    ts.forEachChild(node, check);
  };
  check(ts.createSourceFile(file, result, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
  if (left.length > 0) {
    throw new Error(
      `${file}: ${left.join(', ')} is not a statement of its own, so it cannot be removed`,
    );
  }
  return result;
}

if (import.meta.main) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  // A second run would copy stripped modules over the development ones.
  if (existsSync(`${dist}development`)) {
    throw new Error(
      'dist/development/ exists. Run `npm run build`, which starts from an empty dist/.',
    );
  }
  const files = readdirSync(dist, { recursive: true, encoding: 'utf8' }).filter(
    (file) =>
      file.endsWith('.js') && !file.startsWith('development/') && file !== 'utilities/warn.js',
  );
  let changed = 0;
  for (const file of files) {
    const code = readFileSync(dist + file, 'utf8');
    cpSync(dist + file, `${dist}development/${file}`);
    const result = stripWarnings(code, `dist/${file}`);
    if (result === code) continue;
    writeFileSync(dist + file, result);
    changed++;
  }
  cpSync(`${dist}utilities/warn.js`, `${dist}development/utilities/warn.js`);
  console.log(
    `Copied ${files.length + 1} modules to dist/development/; stripped warnings from ${changed}`,
  );
}
