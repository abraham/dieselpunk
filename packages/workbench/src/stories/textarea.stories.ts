import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTextarea } from '@dieselpunk/core';
import '@dieselpunk/core/textarea/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTextarea>('punk-textarea');

const meta = preview.type<{ args: StoryArgs<PunkTextarea> }>().meta({
  title: 'Components/Textarea',
  component: 'punk-textarea',
  args: { ...args, label: 'Shift notes' },
  argTypes: {
    ...argTypes,
    minlength: { ...argTypes['minlength'], control: 'text' },
    maxlength: { ...argTypes['maxlength'], control: 'text' },
  },
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A field for several lines of text, with a native \`<textarea>\` in its shadow tree that takes the focus. It takes part in a form as the text field does: \`value\` under \`name\`, the \`value\` attribute as the default a form reset goes back to, and \`required\`, \`minlength\`, and \`maxlength\` as its native constraints.

**Size:** \`rows\` lines tall, and the user can drag it taller. With \`autogrow\` it grows with its text up to \`--punk-textarea-max-height\`, where the browser supports \`field-sizing\`; elsewhere it stays \`rows\` lines tall and scrolls.

**Count:** \`show-count\` shows how many characters there are, out of \`maxlength\` when it is set, and the count describes the field.

**Name:** \`label\`, else \`aria-label\`, else a \`<label for>\` pointing at the host. A field with no name warns in development.
`,
      },
    },
  },
});

export const Playground = meta.story();

const fields = () => html`
  <div class="wb-stack">
    ${group('Empty', html`<punk-textarea label="Shift notes"></punk-textarea>`)}
    ${group(
      'With a count and a hint',
      html`<punk-textarea
        label="Shift notes"
        show-count
        maxlength="200"
        value="Belt 3 jammed twice."
        ><span slot="hint">Read by the next shift.</span></punk-textarea
      >`,
    )}
    ${group(
      'Grows with its text',
      html`<punk-textarea
        label="Shift notes"
        rows="2"
        autogrow
        placeholder="What happened?"
      ></punk-textarea>`,
    )}
    ${group(
      'Read-only and disabled',
      html`<div class="wb-stack">
        <punk-textarea label="Log" value="Reactor stable." readonly></punk-textarea>
        <punk-textarea label="Log" value="Reactor stable." disabled></punk-textarea>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${fields()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(fields),
});
