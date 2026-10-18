import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkStack } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/stack/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkStack>('punk-stack');

const meta = preview.type<{ args: StoryArgs<PunkStack> }>().meta({
  title: 'Components/Stack',
  tags: ['layout'],
  component: 'punk-stack',
  args: {
    ...args,
    'default-slot':
      '<punk-panel variant="flat">First</punk-panel><punk-panel variant="flat">Second</punk-panel><punk-panel variant="flat">Third</punk-panel>',
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A column that spaces its children with a gap from the spacing scale. It has no role, no parts, and no keyboard interaction: it only lays out its children.

**Gap:** \`0\` to \`5\` select a step of the spacing scale, which follows the density. The default is \`2\`. \`--punk-stack-gap\` overrides it.

**Align:** \`stretch\` (the default) gives every child the full width; \`start\`, \`center\` and \`end\` size children to their content and place them at the start, middle or end of the inline axis. Start and end follow the writing direction.

**Reflow:** children can shrink below their content width and are never wider than the stack, so a long word breaks instead of forcing horizontal scrolling.
`,
      },
    },
  },
});

export const Playground = meta.story();

const panel = (text: string) => html`<punk-panel variant="flat">${text}</punk-panel>`;

const stacks = () => html`
  <div class="wb-stack">
    ${group(
      'Gap',
      html`<div class="wb-stack">
        ${['0', '1', '2', '3', '4', '5'].map(
          (gap) =>
            html`<punk-stack gap=${gap}>${panel(`gap ${gap}`)}${panel('Second')}</punk-stack>`,
        )}
      </div>`,
    )}
    ${group(
      'Align',
      html`<div class="wb-stack">
        ${['stretch', 'start', 'center', 'end'].map(
          (align) => html`
            <punk-stack align=${align}>
              <punk-button>${align}</punk-button>
              ${panel('Content')}
            </punk-stack>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Nested',
      html`<punk-stack>
        ${panel('Outer')}
        <punk-stack gap="1">${panel('Inner one')}${panel('Inner two')}</punk-stack>
      </punk-stack>`,
    )}
    ${group(
      'A long word wraps',
      html`<div style="max-inline-size: 187px">
        <punk-stack align="center">
          <punk-panel variant="flat" style="overflow-wrap: anywhere"
            >Verarbeitungsanlagenbetriebsvorschrift</punk-panel
          >
        </punk-stack>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${stacks()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(stacks),
});
