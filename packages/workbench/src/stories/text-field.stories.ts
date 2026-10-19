import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTextField } from '@dieselpunk/core';
import '@dieselpunk/core/text-field/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTextField>('punk-text-field');

const meta = preview.type<{ args: StoryArgs<PunkTextField> }>().meta({
  title: 'Components/Text field',
  tags: ['forms'],
  component: 'punk-text-field',
  args: { ...args, label: 'Callsign', placeholder: 'Three letters' },
  // An empty number control passes NaN to the field; a text one leaves the length unset.
  argTypes: {
    ...argTypes,
    minlength: { ...argTypes['minlength'], control: 'text' },
    maxlength: { ...argTypes['maxlength'], control: 'text' },
  },
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A field for a line of text, with a native \`<input>\` in its shadow tree that takes the focus. It takes part in a form: it submits \`value\` under \`name\`, a form reset puts \`value\` back to the attribute the markup had, and the native constraints (\`required\`, \`minlength\`, \`maxlength\`, \`pattern\`, and the ones the \`type\` brings, such as \`email\`) are its validity.

**Name:** \`label\` is the name and the text above the field. Without it the field takes \`aria-label\`, and failing that the text of a \`<label for>\` that points at it, read when it renders and when it gets focus, which is not live. A field with no name warns in development. A placeholder is not a name.

**Message:** it waits until the user has left the field, or a form reported it, so nobody is told they are wrong before they have typed. It is the browser's own message, drawn in the text color with a triangle and a frame, since the danger color is below 3:1 on the panel surfaces. It is described to assistive technology with \`aria-describedby\`, and the field is \`aria-invalid\`. Use \`setCustomValidity()\` for your own.

**Hint, prefix, and suffix:** the \`hint\` slot describes the field. \`prefix\` and \`suffix\` sit inside the box, such as an icon or a unit, and wrap inside half of it when long.

**Paste and autofill:** paste is never blocked. \`autocomplete\` is passed through, though a password manager may not fill a field inside a shadow root.

**Suggestions:** there is no \`list\`, since an input in a shadow root cannot reach a \`<datalist>\` in the page. For free text with suggestions, use \`punk-combobox\` with \`allow-custom\` (see Components/Combobox, Free text).

**Look:** the boundary is \`control-edge\`, which meets 3:1 on every surface, since an empty field has no text to identify it. A read-only field has a dashed boundary, and under forced colors a dotted one; an invalid one is dashed there.
`,
      },
    },
  },
});

export const Playground = meta.story();

const fields = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Value, placeholder, and a hint',
      html`<div class="wb-stack">
        <punk-text-field label="Callsign" value="Echo"></punk-text-field>
        <punk-text-field label="Callsign" placeholder="Three letters">
          <span slot="hint">The letters on the side of the hull.</span>
        </punk-text-field>
        <punk-text-field aria-label="Search" type="search" placeholder="Search"></punk-text-field>
      </div>`,
    )}
    ${group(
      'Prefix and suffix',
      html`<div class="wb-stack">
        <punk-text-field label="Length" value="12">
          <span slot="suffix">m</span>
        </punk-text-field>
        <punk-text-field label="Mail" type="email" value="pilot@example.com">
          <span slot="prefix">@</span>
        </punk-text-field>
      </div>`,
    )}
    ${group(
      'Read-only, and disabled',
      html`<div class="wb-stack">
        <punk-text-field label="Callsign" value="Echo" readonly></punk-text-field>
        <punk-text-field label="Callsign" value="Echo" disabled></punk-text-field>
      </div>`,
    )}
    ${group(
      'Invalid, after the user has left it (click in and out)',
      html`<div class="wb-stack">
        <punk-text-field label="Callsign" required>
          <span slot="hint">Required.</span>
        </punk-text-field>
        <punk-text-field label="Mail" type="email" value="pilot"></punk-text-field>
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
