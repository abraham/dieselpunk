import ts from 'typescript';

export interface SourceFile {
  path: string;
  text: string;
}

const propertyName = (property: ts.ObjectLiteralElementLike): string | undefined =>
  ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)
    ? property.name.text
    : undefined;

/**
 * Every `msg()` call must say its `id` and its `desc` as string literals. `lit-localize extract`
 * keeps the description a unit already has when a call loses its own, so the XLIFF cannot show it.
 */
export function messageCallProblems(files: SourceFile[]): string[] {
  const problems: string[] = [];
  for (const { path, text } of files) {
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'msg'
      ) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        const where = `${path}:${line + 1}`;
        const options = node.arguments[1];
        if (!options || !ts.isObjectLiteralExpression(options)) {
          problems.push(`${where}: msg() has no options with an id and a desc`);
        } else {
          for (const name of ['id', 'desc']) {
            const property = options.properties.find((entry) => propertyName(entry) === name);
            const value =
              property && ts.isPropertyAssignment(property) ? property.initializer : undefined;
            if (
              !value ||
              !(ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
            ) {
              problems.push(
                `${where}: msg() needs ${name === 'id' ? 'an' : 'a'} \`${name}\` that is a string literal`,
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return problems;
}
