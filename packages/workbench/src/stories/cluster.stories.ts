import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkCluster } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/cluster/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkCluster>('punk-cluster');

const meta = preview.type<{ args: StoryArgs<PunkCluster> }>().meta({
  title: 'Components/Cluster',
  component: 'punk-cluster',
  args: {
    ...args,
    'default-slot':
      '<punk-button>Start</punk-button><punk-button>Pause</punk-button><punk-button variant="danger">Stop</punk-button>',
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A row that wraps onto further lines when its children do not fit, with a gap from the spacing scale between them. It has no role, no parts, and no keyboard interaction.

**Gap:** \`0\` to \`5\`, following the density; \`--punk-cluster-gap\` overrides it. The same gap is used between items and between lines.

**Justify:** \`start\` (the default), \`center\`, \`end\` and \`between\` distribute the children along the line. Start and end follow the writing direction.

**Align:** \`center\` (the default), \`start\`, \`end\`, \`baseline\` and \`stretch\` place the children across the line.
`,
      },
    },
  },
});

export const Playground = meta.story();

const buttons = html`<punk-button>Start</punk-button><punk-button>Pause</punk-button
  ><punk-button variant="danger">Stop</punk-button>`;

const clusters = () => html`
  <div class="wb-stack">
    ${group(
      'Gap',
      html`<div class="wb-stack">
        ${['0', '1', '2', '3', '4', '5'].map(
          (gap) => html`<punk-cluster gap=${gap}>${buttons}</punk-cluster>`,
        )}
      </div>`,
    )}
    ${group(
      'Justify',
      html`<div class="wb-stack">
        ${['start', 'center', 'end', 'between'].map(
          (justify) => html`<punk-cluster justify=${justify}>${buttons}</punk-cluster>`,
        )}
      </div>`,
    )}
    ${group(
      'Align',
      html`<div class="wb-stack">
        ${['start', 'center', 'end', 'baseline', 'stretch'].map(
          (align) => html`
            <punk-cluster align=${align}>
              <punk-button size="lg">Large</punk-button>
              <punk-button size="sm">Small</punk-button>
              <span>${align}</span>
            </punk-cluster>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Wrapping',
      html`<div style="max-inline-size: 200px"><punk-cluster>${buttons}</punk-cluster></div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${clusters()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(clusters),
});
