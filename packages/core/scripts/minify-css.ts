import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// A space next to one of these is never needed; one before a colon can be a descendant selector.
const noSpaceAfter = new Set(['{', '}', ';', ',', ':']);
const noSpaceBefore = new Set(['{', '}', ';', ',']);

interface State {
  quote: string | undefined;
}

/** Minifies one literal part of a `css` template, between placeholders or the template's ends. */
function minifyPart(raw: string, state: State, atStart: boolean, atEnd: boolean): string {
  let out = '';
  let space = false;
  // An empty `out` follows a placeholder, unless the part opens the template.
  const spaceAfterPrev = () => (out === '' ? !atStart : !noSpaceAfter.has(out.at(-1)!));
  const emit = (text: string) => {
    if (space && spaceAfterPrev() && !noSpaceBefore.has(text[0]!)) out += ' ';
    space = false;
    if (text === '}' && out.endsWith(';')) out = out.slice(0, -1);
    out += text;
  };
  let i = 0;
  while (i < raw.length) {
    const c = raw[i]!;
    if (state.quote) {
      const close = c === state.quote;
      out += c === '\\' ? raw.slice(i, i + 2) : c;
      i += c === '\\' ? 2 : 1;
      if (close) state.quote = undefined;
    } else if (c === '\\') {
      emit(raw.slice(i, i + 2));
      i += 2;
    } else if (c === '"' || c === "'") {
      emit(c);
      state.quote = c;
      i++;
    } else if (raw.startsWith('/*', i)) {
      const end = raw.indexOf('*/', i + 2);
      if (end === -1) throw new Error('A comment in a css template spans a placeholder');
      space = true;
      i = end + 2;
    } else if (/\s/.test(c)) {
      space = true;
      i++;
    } else {
      emit(c);
      i++;
    }
  }
  if (space && !atEnd && spaceAfterPrev()) out += ' ';
  return out;
}

/**
 * Removes comments and needless whitespace from every `css` tagged template in emitted code
 * (specs/performance.md §2). Strings and placeholders are kept as they are.
 */
export function minifyCss(code: string): string {
  const source = ts.createSourceFile(
    'file.js',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const edits: { start: number; end: number; text: string }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      node.tag.text === 'css'
    ) {
      const template = node.template;
      const parts = ts.isNoSubstitutionTemplateLiteral(template)
        ? [template]
        : [template.head, ...template.templateSpans.map((span) => span.literal)];
      const state: State = { quote: undefined };
      parts.forEach((part, index) => {
        // Each part's text runs from after its opening `\`` or `}` to before its `${` or closing `\``.
        const start = part.getStart(source) + 1;
        const end = part.end - (ts.isTemplateHead(part) || ts.isTemplateMiddle(part) ? 2 : 1);
        const raw = code.slice(start, end);
        const text = minifyPart(raw, state, index === 0, index === parts.length - 1);
        if (text !== raw) edits.push({ start, end, text });
      });
      if (state.quote) throw new Error('A string in a css template is not closed');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  let result = code;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

if (import.meta.main) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  let changed = 0;
  for (const file of readdirSync(dist, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.js')) continue;
    const code = readFileSync(dist + file, 'utf8');
    let result: string;
    try {
      result = minifyCss(code);
    } catch (error) {
      throw new Error(`dist/${file}: ${(error as Error).message}`, { cause: error });
    }
    if (result === code) continue;
    writeFileSync(dist + file, result);
    changed++;
  }
  console.log(`Minified css templates in ${changed} files`);
}
