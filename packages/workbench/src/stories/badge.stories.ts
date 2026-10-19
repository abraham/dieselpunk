import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkBadge } from '@dieselpunk/core';
import '@dieselpunk/core/badge/register.js';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/tabs/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkBadge>('punk-badge');

const meta = preview.type<{ args: StoryArgs<PunkBadge> }>().meta({
  title: 'Components/Badge',
  tags: ['data'],
  component: 'punk-badge',
  args: { ...args, 'default-slot': '12' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A small count or status label, placed inside a tab, a button, a list item, or a table cell, whose text then joins that element's name: a tab "Alerts 3". It has no role and is never announced on its own.

**Never color alone:** the text carries the meaning. \`neutral\` is text alone, and \`info\`, \`success\`, \`warning\`, and \`danger\` add their status shape, hidden from assistive technology. A badge with no text warns in development.
`,
      },
    },
  },
});

export const Playground = meta.story();

const badges = () => html`
  <div class="wb-stack">
    ${group(
      'Variants',
      html`<div style="display: flex; flex-wrap: wrap; gap: 8px">
        <punk-badge>12</punk-badge>
        <punk-badge variant="info">New</punk-badge>
        <punk-badge variant="success">Running</punk-badge>
        <punk-badge variant="warning">Low fuel</punk-badge>
        <punk-badge variant="danger">Offline</punk-badge>
      </div>`,
    )}
    ${group(
      'In a button and a tab',
      html`<div class="wb-stack">
        <punk-button>Alerts <punk-badge variant="warning">3</punk-badge></punk-button>
        <punk-tabs aria-label="Logs">
          <punk-tab slot="tab" panel="badge-a">Production</punk-tab>
          <punk-tab slot="tab" panel="badge-b"
            >Alerts <punk-badge variant="danger">2</punk-badge></punk-tab
          >
          <div id="badge-a">All machines are running.</div>
          <div id="badge-b">Two machines are offline.</div>
        </punk-tabs>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${badges()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(badges),
});
