// The server half of the SSR fixture (specs/ssr.md Verification), run under Node in the installed
// project: renders every tag of the packed package with Lit SSR, checks the output, and writes a
// page of it for the browser half, once with Lit's hydration support and once without.
/* global console, customElements, process */
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html, unsafeStatic } from 'lit/static-html.js';

const out = process.argv[2];
const components = 'node_modules/@dieselpunk/core/dist/components';
const entries = readdirSync(components).filter((entry) =>
  existsSync(join(components, entry, 'register.js')),
);
const problems = [];
const errors = [];
const logError = console.error;
console.error = (...args) => errors.push(args.join(' '));

for (const entry of entries) {
  try {
    await import(`@dieselpunk/core/${entry}/register.js`);
  } catch (error) {
    problems.push(`importing ${entry} threw: ${error.message}`);
  }
}
const tags = [...customElements.__definitions.keys()].filter((tag) => tag.startsWith('punk-'));

const ssr = (template) => collectResult(render(template));
let body = '';
for (const tag of tags) {
  const t = unsafeStatic(tag);
  const cases = [
    html`<${t}></${t}>`,
    html`<${t} lang="de" dir="rtl" value="5" label="Label" open
      ><option value="a">A</option><span slot="header">Header</span>Text</${t}
    >`,
  ];
  for (const [index, template] of cases.entries()) {
    try {
      const markup = await ssr(template);
      if (!markup.includes('shadowrootmode="open"')) {
        problems.push(`${tag} (case ${index}) has no declarative shadow root`);
      }
      const ids = markup.match(/(?:id|for|aria-[a-z]+)="punk-[a-z-]+-\d+"/g);
      if (ids) problems.push(`${tag} (case ${index}) generated ids on the server: ${ids}`);
      if (index === 0) body += `<div data-case="${tag}">${markup}</div>\n`;
    } catch (error) {
      problems.push(`${tag} (case ${index}) threw: ${error.message}`);
    }
  }
}

// What the server cannot know (specs/ssr.md §3), and a field to type into before the upgrade.
body += await ssr(html`
  <punk-production-stat id="stat" label="Iron" value="12345.6"></punk-production-stat>
  <punk-panel id="panel"><span slot="header">Assembler</span>Body</punk-panel>
  <punk-divider id="divider">Section</punk-divider>
  <punk-popover id="popover" open>Open</punk-popover>
  <punk-text-field id="typed" label="Name"></punk-text-field>
  <punk-select id="select" label="Pick"
    ><option value="a">A</option>
    <option value="b" selected>B</option></punk-select
  >
`);

console.error = logError;
problems.push(...errors.map((error) => `the server logged an error: ${error}`));

mkdirSync(out, { recursive: true });
const imports = entries.map((entry) => `import '@dieselpunk/core/${entry}/register.js';`);
for (const name of ['plain', 'hydrate']) {
  const support =
    name === 'hydrate' ? ["import '@lit-labs/ssr-client/lit-element-hydrate-support.js';"] : [];
  writeFileSync(join(out, `client-${name}.js`), [...support, ...imports].join('\n') + '\n');
  writeFileSync(
    join(out, `${name}.html`),
    `<!doctype html>
<html lang="de" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <script>window.ssrTags = ${JSON.stringify(tags)};</script>
    <script src="ssr-check.js"></script>
    <script type="module">window.upgrade = () => import('./client-${name}.bundle.js');</script>
  </head>
  <body>
${body}
  </body>
</html>
`,
  );
}

console.log(JSON.stringify({ tags: tags.length, problems }));
