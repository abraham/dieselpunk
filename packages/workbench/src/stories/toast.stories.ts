import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkToast, PunkToastStack } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/toast/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkToast>('punk-toast');

const meta = preview.type<{ args: StoryArgs<PunkToast> }>().meta({
  title: 'Components/Toast',
  component: 'punk-toast',
  args: {
    ...args,
    variant: 'success',
    heading: 'Saved',
    // A toast in a story must not close by itself, or the page would lose it.
    duration: 0,
    'default-slot': 'The recipe was added to the assembler.',
  },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A short message that does not interrupt, and the stack that shows and announces it. The pair is registered together by \`@dieselpunk/core/toast/register.js\`. Put a \`punk-toast\` in a \`punk-toast-stack\`, or call the stack's \`show()\`. Outside a stack a toast is only shown, not announced.

**Announcements:** the stack has two live regions that exist before any toast does, because a region added together with its content is not reliably announced. \`warning\` and \`danger\` toasts go in \`role="alert"\`, and \`info\` and \`success\` in \`role="status"\`. The stack moves each toast into the right one by writing its \`slot\`, and gives the slot you had back when the toast leaves. A toast shown while a modal window or dialog is open is inert, like the rest of the page: put a stack inside the dialog when its toasts must be usable.

**Variant:** each variant is a shape on an inset lens (a diamond, a circle, a triangle, a square) as well as a color, and the text is always in the text color.

**Closing:** every toast has a dismiss button. Unless \`duration\` says otherwise, an \`info\` or \`success\` toast closes after 5 seconds, and a \`warning\` or \`danger\` toast, or one with an \`action\`, stays until it is dismissed. \`duration="0"\` means never. The countdown pauses while the pointer is over the toast, while focus is inside it, and while the page is hidden, and resumes with the time that was left (WCAG 2.2 SC 2.2.1).

**Events:** \`punk-dismiss\` with \`{ reason }\` (\`user\`, \`timeout\`, \`method\`, or \`limit\`). A dismissed toast removes itself after a short fade, which reduced motion leaves out. Cancel the event to keep the toast, for example when a framework removes it.

**The stack:** \`placement\` is one of four corners (\`start\` and \`end\` follow the writing direction), and the newest toast is nearest the screen edge. Past \`limit\` (5 by default) the oldest toast is dismissed with the reason \`limit\`. It stays in the top layer even when empty, and lets clicks through everywhere there is no toast. \`show({ message, heading, variant, duration, action })\` creates a toast, and \`clear()\` dismisses them all.
`,
      },
    },
  },
});

export const Playground = meta.story();

const stackFor = (event: Event) =>
  (event.currentTarget as HTMLElement).parentElement?.querySelector(
    'punk-toast-stack',
  ) as PunkToastStack;

/** A stack covers a corner of the story, so toasts come from buttons. */
export const Stack = meta.story({
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; min-block-size: 120px">
      <punk-button
        @click=${(event: Event) => stackFor(event).show({ message: 'Autosaved the factory.' })}
        >Info, closes in 5 s</punk-button
      >
      <punk-button
        @click=${(event: Event) =>
          stackFor(event).show({
            message: 'Blueprint exported.',
            variant: 'success',
            heading: 'Done',
          })}
        >Success</punk-button
      >
      <punk-button
        @click=${(event: Event) => {
          const undo = document.createElement('punk-button');
          undo.setAttribute('size', 'sm');
          undo.textContent = 'Undo';
          stackFor(event).show({ message: 'Assembler 03 removed.', action: undo });
        }}
        >With an action</punk-button
      >
      <punk-button
        @click=${(event: Event) =>
          stackFor(event).show({
            message: 'Reactor offline.',
            variant: 'danger',
            heading: 'Alarm',
          })}
        >Danger, announced at once</punk-button
      >
      <punk-button @click=${(event: Event) => stackFor(event).clear()}>Clear</punk-button>
      <punk-toast-stack placement="bottom-end" limit="3"></punk-toast-stack>
    </div>
  `,
});

const toasts = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Every variant',
      html`<div class="wb-stack">
        <punk-toast variant="info" duration="0">Autosaved the factory.</punk-toast>
        <punk-toast variant="success" duration="0" heading="Done">Blueprint exported.</punk-toast>
        <punk-toast variant="warning" duration="0">Low on fuel.</punk-toast>
        <punk-toast variant="danger" duration="0" heading="Alarm">Reactor offline.</punk-toast>
      </div>`,
    )}
    ${group(
      'With an action, and a long message that wraps',
      html`<div class="wb-stack">
        <punk-toast variant="warning" duration="0">
          Assembler 03 removed.
          <punk-button slot="action" size="sm">Undo</punk-button>
        </punk-toast>
        <punk-toast variant="info" duration="0" style="max-inline-size: 240px">
          Fertigungsgeschwindigkeitsüberschreitung im Nordwerk
        </punk-toast>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => toasts(),
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(toasts),
});
