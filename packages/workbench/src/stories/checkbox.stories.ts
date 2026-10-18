import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkCheckbox } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/checkbox/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkCheckbox>('punk-checkbox');

const meta = preview.type<{ args: StoryArgs<PunkCheckbox> }>().meta({
  title: 'Components/Checkbox',
  component: 'punk-checkbox',
  args: { ...args, 'default-slot': 'Feed the furnace automatically' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A checkbox that takes part in a form. It submits \`value\` (\`on\` unless you say otherwise) under \`name\` while it is checked, and nothing otherwise, and a form reset puts \`checked\` back to what the markup said, not to the live state. The same goes for a disabled checkbox, a disabled \`<fieldset>\` around it, and one with no \`name\`.

**Name:** the text in the default slot is its name. With no text, use \`aria-label\`. An outside \`<label for>\` focuses and toggles it when clicked, but does not name it, since an id reference cannot cross into the shadow tree; one that points at it is read when it renders and when it gets focus, and is not live. A checkbox with no name warns in development.

**Keyboard and pointer:** Space toggles it, when the key is released, and never scrolls the page. A click on the label toggles it too, except on a link or a field inside the label. \`input\` and \`change\` are sent once for each toggle by the user, and not when \`checked\` is set from code.

**Indeterminate:** \`indeterminate\` shows a dash and sets \`aria-checked="mixed"\`. A click clears it and toggles \`checked\`, as a native checkbox does. It is a state for the screen and is never submitted.

**Roles:** \`role="checkbox"\`, \`aria-checked\`, \`aria-required\`, \`aria-disabled\`, and \`tabindex\` are attributes on the host, so tools see what users get. A checkbox is an item of a toolbar's arrow-key group.

**Look:** the box has a \`control-edge\` boundary that meets 3:1 on every surface. A checked or mixed box is filled with the accent, and the mark is a shape (a check or a dash), so no state rests on color alone. Under forced colors the box is a bordered system-color box.
`,
      },
    },
  },
});

export const Playground = meta.story();

const checkboxes = () => html`
  <div class="wb-stack">
    ${group(
      'Unchecked, checked, and mixed',
      html`<div class="wb-stack">
        <punk-checkbox>Unchecked</punk-checkbox>
        <punk-checkbox checked>Checked</punk-checkbox>
        <punk-checkbox indeterminate>Mixed</punk-checkbox>
      </div>`,
    )}
    ${group(
      'Disabled',
      html`<div class="wb-stack">
        <punk-checkbox disabled>Unchecked</punk-checkbox>
        <punk-checkbox checked disabled>Checked</punk-checkbox>
        <punk-checkbox indeterminate disabled>Mixed</punk-checkbox>
      </div>`,
    )}
    ${group(
      'Required, with no text, and a long label',
      html`<div class="wb-stack" style="max-inline-size: 240px">
        <punk-checkbox required>I have read the safety notice</punk-checkbox>
        <punk-checkbox checked aria-label="Cooling"></punk-checkbox>
        <punk-checkbox>Fertigungsgeschwindigkeitsüberschreitung im Nordwerk</punk-checkbox>
      </div>`,
    )}
    ${group(
      'In a form',
      html`<form
        class="wb-stack"
        @submit=${(event: Event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget as HTMLFormElement);
          const output = (event.currentTarget as HTMLElement).querySelector('output');
          if (output) output.textContent = `Submitted: ${JSON.stringify([...data.keys()])}`;
        }}
      >
        <punk-checkbox name="fuel" checked>Fuel</punk-checkbox>
        <punk-checkbox name="coolant" value="water">Coolant</punk-checkbox>
        <div style="display: flex; gap: 8px">
          <punk-button type="submit" variant="primary">Submit</punk-button>
          <punk-button type="reset">Reset</punk-button>
        </div>
        <output></output>
      </form>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${checkboxes()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(checkboxes),
});
