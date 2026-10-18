import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSwitch } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/switch/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkSwitch>('punk-switch');

const meta = preview.type<{ args: StoryArgs<PunkSwitch> }>().meta({
  title: 'Components/Switch',
  component: 'punk-switch',
  args: { ...args, 'default-slot': 'Power' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
An on and off switch that takes part in a form, for a setting that takes effect at once. It submits \`value\` (\`on\` unless you say otherwise) under \`name\` while it is on, and a form reset puts \`checked\` back to what the markup said. A disabled switch, a disabled \`<fieldset>\` around it, and one with no \`name\` add nothing to the form.

**Name:** the text in the default slot is its name. With no text, use \`aria-label\`. A switch with no name warns in development.

**Keyboard and pointer:** Space toggles it when the key is released, Enter toggles it, and a click on the label toggles it. \`input\` and \`change\` are sent once for each toggle by the user, and not when \`checked\` is set from code.

**Roles:** \`role="switch"\`, \`aria-checked\`, \`aria-required\`, \`aria-disabled\`, and \`tabindex\` are attributes on the host. A switch is an item of a toolbar's arrow-key group.

**Look:** on is the thumb at the end of the track with a bar on it and an accent track, and off is the thumb at the start with a ring, so the state is a position and a shape and not only a color. The track has a \`control-edge\` boundary that meets 3:1 on every surface. The thumb slides in a short transition that reduced motion removes.
`,
      },
    },
  },
});

export const Playground = meta.story();

const switches = () => html`
  <div class="wb-stack">
    ${group(
      'Off and on',
      html`<div class="wb-stack">
        <punk-switch>Off</punk-switch>
        <punk-switch checked>On</punk-switch>
      </div>`,
    )}
    ${group(
      'Disabled',
      html`<div class="wb-stack">
        <punk-switch disabled>Off</punk-switch>
        <punk-switch checked disabled>On</punk-switch>
      </div>`,
    )}
    ${group(
      'Required, with no text, and a long label',
      html`<div class="wb-stack" style="max-inline-size: 240px">
        <punk-switch required>Remote shutdown</punk-switch>
        <punk-switch checked aria-label="Cooling"></punk-switch>
        <punk-switch>Fertigungsgeschwindigkeitsüberschreitung im Nordwerk</punk-switch>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${switches()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(switches),
});
