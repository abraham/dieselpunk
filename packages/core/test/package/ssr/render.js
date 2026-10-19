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

// A textarea's text is its content, so it shows before scripts load, escaped.
const textarea = await ssr(
  html`<punk-textarea label="YAML" monospace readonly value="a &amp; &lt;b&gt;"></punk-textarea>`,
);
if (!/<textarea[^>]*>\na &amp; &lt;b><\/textarea>/.test(textarea)) {
  problems.push(`punk-textarea did not render its value as escaped content: ${textarea}`);
}

// The server cannot see children, so `data-punk-slots` says which strips have content.
const hinted = await ssr(
  html`<punk-panel data-punk-slots="header"><span slot="header">Title</span>Body</punk-panel>`,
);
if (/class="header"[^>]*hidden/.test(hinted) || !/class="footer"[^>]*hidden/.test(hinted)) {
  problems.push(`a panel with data-punk-slots="header" did not show only its header: ${hinted}`);
}
const unhinted = await ssr(html`<punk-panel><span slot="header">Title</span></punk-panel>`);
if (!/class="header"[^>]*hidden/.test(unhinted)) {
  problems.push(`a panel without data-punk-slots showed its header on the server: ${unhinted}`);
}

// Components with children, labels, and values. Each must end as a client render of its markup,
// children included, so the page keeps the markup in a template for the browser to render.
const composed = [
  '<punk-tabs aria-label="Unselected"><punk-tab slot="tab" panel="cu1">One</punk-tab><punk-tab slot="tab" panel="cu2">Two</punk-tab><div id="cu1">First</div><div id="cu2">Second</div></punk-tabs>',
  '<punk-list aria-label="Pick" selection="single" value="b"><punk-list-item value="a">Alpha</punk-list-item><punk-list-item value="b">Beta</punk-list-item></punk-list>',
  '<punk-radio-group label="Size" value="b"><punk-radio value="a">Small</punk-radio><punk-radio value="b">Large</punk-radio></punk-radio-group>',
  '<punk-tabs aria-label="Modules"><punk-tab slot="tab" panel="cp1">One</punk-tab><punk-tab slot="tab" panel="cp2" selected>Two</punk-tab><div id="cp1">First</div><div id="cp2">Second</div></punk-tabs>',
  '<punk-breadcrumb max-items="3"><punk-breadcrumb-item href="#a">A</punk-breadcrumb-item><punk-breadcrumb-item href="#b">B</punk-breadcrumb-item><punk-breadcrumb-item href="#c">C</punk-breadcrumb-item><punk-breadcrumb-item current>D</punk-breadcrumb-item></punk-breadcrumb>',
  '<punk-steps current="2"><punk-step>Mine</punk-step><punk-step>Smelt</punk-step><punk-step>Craft</punk-step></punk-steps>',
  '<punk-slot-grid aria-label="Inventory" selection="single" columns="3"><punk-slot value="s1"></punk-slot><punk-slot value="s2" selected></punk-slot><punk-slot value="s3"></punk-slot></punk-slot-grid>',
  '<punk-toolbar aria-label="Actions"><punk-button>Start</punk-button><punk-button>Stop</punk-button></punk-toolbar>',
  '<punk-accordion><punk-accordion-item heading="One" expanded><p>First</p></punk-accordion-item><punk-accordion-item heading="Two"><p>Second</p></punk-accordion-item></punk-accordion>',
  '<punk-list aria-label="Items" selection="single"><punk-list-item value="a">Alpha</punk-list-item><punk-list-item value="b" selected>Beta</punk-list-item></punk-list>',
  '<punk-toggle-group aria-label="Mode"><button value="a">A</button><button value="b">B</button></punk-toggle-group>',
  '<punk-radio-group label="Speed"><punk-radio value="a" checked>Slow</punk-radio><punk-radio value="b">Fast</punk-radio><span slot="hint">Pick one</span></punk-radio-group>',
  '<punk-menubar aria-label="Main"><punk-menu-item>File</punk-menu-item><punk-menu><punk-menu-item value="a">Open</punk-menu-item></punk-menu></punk-menubar>',
  '<punk-combobox label="Item" value="b"><option value="a">Iron</option><option value="b">Copper</option></punk-combobox>',
  '<punk-text-field label="Callsign" value="Echo"><span slot="hint">Your name</span></punk-text-field>',
  '<label for="cl">Thrust</label><punk-number-field id="cl" value="3"></punk-number-field>',
  '<fieldset disabled><punk-checkbox checked>Agree</punk-checkbox><punk-button>Send</punk-button></fieldset>',
  '<punk-date-field label="Day" value="2025-01-31"></punk-date-field>',
  '<punk-textarea label="Blueprint" monospace readonly value="0eNq &amp; &lt;x&gt;"></punk-textarea>',
  '<punk-production-stat label="Iron" value="1200" unit="/min"><svg slot="sparkline" viewBox="0 0 1 1"></svg></punk-production-stat>',
  '<punk-panel variant="inset"><span slot="header">Header</span>Body<span slot="footer">Footer</span></punk-panel>',
  '<punk-panel data-punk-slots="header footer"><span slot="header">Header</span>Body<span slot="footer">Footer</span></punk-panel>',
];
for (const [index, markup] of composed.entries()) {
  try {
    const rendered = await ssr(html`${unsafeStatic(markup)}`);
    body += `<div data-composed="${index}">${rendered}</div><template data-source="${index}">${markup}</template>\n`;
  } catch (error) {
    problems.push(`composed case ${index} threw: ${error.message}`);
  }
}

console.error = logError;
problems.push(...errors.map((error) => `the server logged an error: ${error}`));

mkdirSync(out, { recursive: true });
const imports = entries.map((entry) => `import '@dieselpunk/core/${entry}/register.js';`);
const support = "import '@lit-labs/ssr-client/lit-element-hydrate-support.js';";
// Without Lit's hydration support, with it alone, and with core's hydration entry too.
const pages = {
  plain: imports,
  support: [support, ...imports],
  hydrate: [support, "import '@dieselpunk/core/hydrate.js';", ...imports],
};
for (const [name, lines] of Object.entries(pages)) {
  writeFileSync(join(out, `client-${name}.js`), lines.join('\n') + '\n');
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
