import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkDialog } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/dialog/register.js';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkDialog>('punk-dialog');

const open = (event: Event) =>
  ((event.currentTarget as HTMLElement).nextElementSibling as PunkDialog | null)?.show();

const meta: Meta<StoryArgs<PunkDialog>> = {
  title: 'Components/Dialog',
  component: 'punk-dialog',
  args: {
    ...args,
    heading: 'Discard the run?',
    'default-slot':
      '<p>The items in the machine are returned to the belt. This cannot be undone.</p>',
    'footer-slot':
      '<punk-button slot="footer" variant="danger" data-punk-close="discard">Discard</punk-button><punk-button slot="footer" data-punk-close="keep">Keep</punk-button>',
  },
  argTypes,
  // A dialog is modal and covers the story, so it opens from a button.
  render: (storyArgs) =>
    html`<punk-button @click=${open}>Open the dialog</punk-button
      >${template({ ...storyArgs, open: false })}`,
  parameters: {
    docs: {
      description: {
        component: `
A modal confirmation or task surface. It makes the rest of the page inert, traps focus, starts focus on content, and gives focus back to what opened it. It is a native \`<dialog>\`, so it also holds the page's scroll while it is open. Give it a \`heading\`, or an \`aria-label\`.

**Actions** are in the \`footer\` slot, and stack at container widths of 480px and below. An element with \`data-punk-close\` closes the dialog on click: its value becomes \`returnValue\`, and \`punk-close\` reports the reason \`action\`. Application code can call \`close(returnValue)\` instead.

**Escape and the backdrop:** Escape closes the dialog (reason \`escape\`) unless it is \`persistent\`, in which case Escape does nothing, and does not reach anything beneath. A click on the backdrop never closes a dialog: these are task surfaces, and a stray click must not discard work. A \`persistent\` dialog needs an action to close it; a dialog with nothing to focus and no \`persistent\` warns in development builds, because a touch user could not leave it.

**Alert:** \`alert\` makes it an \`alertdialog\`, described by its content, for a message that needs an answer.

**Events:** \`punk-open\`, and \`punk-close\` with \`{ reason, returnValue }\`.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkDialog>>;

export const Playground: Story = {};

export const Alert: Story = {
  args: { alert: true, heading: 'Reactor offline' },
};

export const Persistent: Story = {
  args: { persistent: true, heading: 'Confirm shutdown' },
};
