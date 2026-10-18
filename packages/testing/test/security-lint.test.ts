import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// specs/security.md §4: the lint rules catch each sink in shipped source, and leave tests alone.

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: repo });

const shipped = 'packages/core/src/components/example/example.ts';
const testFile = 'packages/core/src/components/example/example.test.ts';
const styles = 'packages/core/src/styles/example.ts';

async function rules(code: string, filePath = shipped): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${repo}${filePath}` });
  assert.ok(result, `No lint result for ${filePath}`);
  return result.messages.map((message) => message.ruleId ?? message.message);
}

const caught: Array<[string, string, string]> = [
  [
    'unsafeHTML',
    "import { unsafeHTML } from 'lit/directives/unsafe-html.js';",
    'no-restricted-imports',
  ],
  [
    'unsafeSVG',
    "import { unsafeSVG } from 'lit/directives/unsafe-svg.js';",
    'no-restricted-imports',
  ],
  ['unsafeStatic', "import { unsafeStatic } from 'lit/static-html.js';", 'no-restricted-imports'],
  ['unsafeCSS outside styles', "import { unsafeCSS } from 'lit';", 'no-restricted-imports'],
  [
    'innerHTML',
    'export const f = (e: Element) => { e.innerHTML = "x"; };',
    'no-restricted-properties',
  ],
  ['outerHTML', 'export const f = (e: Element) => e.outerHTML;', 'no-restricted-properties'],
  [
    'insertAdjacentHTML',
    'export const f = (e: Element) => e.insertAdjacentHTML("beforeend", "x");',
    'no-restricted-properties',
  ],
  [
    'setHTMLUnsafe',
    'export const f = (e: Element) => e.setHTMLUnsafe("x");',
    'no-restricted-properties',
  ],
  ['document.write', 'document.write("x");', 'no-restricted-properties'],
  ['eval', 'eval("1");', 'no-eval'],
  ['new Function', 'export const f = new Function("return 1");', 'no-new-func'],
  ['string setTimeout', 'setTimeout("run()", 1);', 'no-restricted-syntax'],
  ['string window.setInterval', 'window.setInterval(`run()`, 1);', 'no-restricted-syntax'],
  ['fetch', 'fetch("/x");', 'no-restricted-globals'],
  ['window.fetch', 'window.fetch("/x");', 'no-restricted-properties'],
  ['XMLHttpRequest', 'export const r = new XMLHttpRequest();', 'no-restricted-globals'],
  ['WebSocket', 'export const s = new WebSocket("wss://x");', 'no-restricted-globals'],
  ['localStorage', 'localStorage.getItem("x");', 'no-restricted-globals'],
  ['sessionStorage', 'sessionStorage.getItem("x");', 'no-restricted-globals'],
  ['indexedDB', 'indexedDB.open("x");', 'no-restricted-globals'],
  ['document.cookie', 'export const c = document.cookie;', 'no-restricted-properties'],
  ['sendBeacon', 'navigator.sendBeacon("/x");', 'no-restricted-properties'],
  ['postMessage', 'window.parent.postMessage("x", "*");', 'no-restricted-properties'],
  [
    'a computed import',
    'export const load = (name: string) => import(name);',
    'no-restricted-syntax',
  ],
  ['a bare import', 'export const load = () => import("lit");', 'no-restricted-syntax'],
  [
    'an unguarded href',
    'import { html } from "lit"; export const t = (u: string) => html`<a href=${u}></a>`;',
    'local/url-bindings',
  ],
  [
    'an unguarded src',
    'import { html } from "lit"; export const t = (u: string) => html`<img src="${u}">`;',
    'local/url-bindings',
  ],
  [
    'an unguarded property binding',
    'import { html } from "lit"; export const t = (u: string) => html`<a .href=${u}></a>`;',
    'local/url-bindings',
  ],
];

for (const [name, code, rule] of caught) {
  test(`shipped source: ${name} fails ${rule}`, async () => {
    assert.ok((await rules(code)).includes(rule), `${rule} did not report ${name}`);
  });

  test(`tests: ${name} is allowed`, async () => {
    assert.ok(!(await rules(code, testFile)).includes(rule), `${rule} reported ${name} in a test`);
  });
}

test('shipped source: allowed patterns pass', async () => {
  const allowed = [
    'import { html } from "lit"; declare const safeUrl: (u: string) => string; export const t = (u: string) => html`<a href=${safeUrl(u)}></a>`;',
    'import { html } from "lit"; export const t = (v: string) => html`<a title=${v}></a>`;',
    'export const load = () => import("./de.ts");',
    'export const f = (e: Element) => e.textContent;',
  ];
  for (const code of allowed) assert.deepEqual(await rules(code), [], code);
});

test('styles and tokens may use unsafeCSS, but no other sink', async () => {
  assert.deepEqual(
    await rules("import { unsafeCSS } from 'lit'; export { unsafeCSS };", styles),
    [],
  );
  const sink = "import { unsafeHTML } from 'lit/directives/unsafe-html.js'; export { unsafeHTML };";
  assert.ok((await rules(sink, styles)).includes('no-restricted-imports'));
});
