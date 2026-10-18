import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkFileField } from '@dieselpunk/core';
import '@dieselpunk/core/file-field/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkFileField>('punk-file-field');

const meta = preview.type<{ args: StoryArgs<PunkFileField> }>().meta({
  title: 'Components/File field',
  tags: ['forms'],
  component: 'punk-file-field',
  args: { ...args, label: 'Plans', 'drop-zone': true, multiple: true },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A field for choosing files, with a native \`<input type="file">\` in its shadow tree that takes
the focus, and a list of the chosen files' names and sizes below it. The input's button opens the
platform's file chooser, so the keyboard and every pointer can always choose; its text and
"No file chosen" are the browser's.

**Drop zone.** With \`drop-zone\` the field is also a place to drop files, as an enhancement and
never the only way. Dropped files that \`accept\` does not name are left out, and only the first is
kept unless \`multiple\` is set.

**Form:** it submits each chosen file under \`name\`, a form reset clears the choice, and
\`required\` is its validity. \`files\` reads the chosen files.
`,
      },
    },
  },
});

export const Playground = meta.story();

const fields = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Button only',
      html`<punk-file-field label="Plans" accept=".pdf">
        <span slot="hint">PDF files only.</span>
      </punk-file-field>`,
    )}
    ${group(
      'Drop zone',
      html`<div class="wb-stack">
        <punk-file-field label="Photos" accept="image/*" drop-zone multiple></punk-file-field>
        <punk-file-field label="Archive" drop-zone disabled></punk-file-field>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({ render: fields });

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(fields),
});
