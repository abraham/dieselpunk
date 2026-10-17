import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/cluster/register.js';
import '@dieselpunk/core/number-field/register.js';
import '@dieselpunk/core/stack/register.js';
import '@dieselpunk/core/switch/register.js';
import '@dieselpunk/core/text-field/register.js';
import '@dieselpunk/core/window/register.js';
import { group } from '../lib/matrix.ts';

// The examples of the Responsive layouts guide. The smoke test loads each at 375px and at 187px,
// the layout width of a 375px window at 200% zoom, and fails if the page scrolls sideways.

const meta: Meta = {
  title: 'Guides/Responsive layouts',
  tags: ['!autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

const rowStyles = html`<style>
  /* The container is the setting, and the row inside it reacts to the container's width. */
  .setting {
    container-type: inline-size;
  }
  .setting-row {
    display: flex;
    flex-direction: column;
    gap: var(--punk-space-2);
  }
  @container (min-inline-size: 480px) {
    .setting-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .setting-row > :first-child {
      flex: 1 1 0;
      min-inline-size: 0;
    }
  }
</style>`;

const actions = html`
  <punk-button slot="footer" variant="primary">Start production</punk-button>
  <punk-button slot="footer">Pause</punk-button>
  <punk-button slot="footer" variant="danger">Discard the run</punk-button>
`;

export const WindowFooter: Story = {
  name: 'Window footer',
  render: () => html`
    <div class="wb-stack" style="max-inline-size: 640px">
      ${group(
        'At 560px wide, the actions sit in a row',
        html`<div style="max-inline-size: 560px">
          <punk-window heading="Assembler 03" open>
            <p style="margin: 0">Crafting speed 0.75</p>
            ${actions}
          </punk-window>
        </div>`,
      )}
      ${group(
        'At 320px wide, they stack, full width and in order',
        html`<div style="max-inline-size: 320px">
          <punk-window heading="Assembler 03" open>
            <p style="margin: 0">Crafting speed 0.75</p>
            ${actions}
          </punk-window>
        </div>`,
      )}
    </div>
  `,
};

export const SettingsRow: Story = {
  name: 'Settings row',
  render: () => html`
    ${rowStyles}
    <div class="wb-stack" style="max-inline-size: 640px">
      ${group(
        'In 560px, the label is beside the control',
        html`<div style="max-inline-size: 560px">${settings()}</div>`,
      )}
      ${group(
        'In 320px, it is above',
        html`<div style="max-inline-size: 320px">${settings()}</div>`,
      )}
    </div>
  `,
};

function settings() {
  return html`
    <punk-stack gap="3">
      <div class="setting">
        <div class="setting-row">
          <span>Restart the machine automatically after a power failure</span>
          <punk-switch name="restart">Restart</punk-switch>
        </div>
      </div>
      <div class="setting">
        <div class="setting-row">
          <span>The most the machine may draw from the grid</span>
          <punk-number-field label="Power limit" value="80" min="0" max="100">
            <span slot="suffix">kW</span>
          </punk-number-field>
        </div>
      </div>
      <div class="setting">
        <div class="setting-row">
          <span>Shown in the factory list</span>
          <punk-text-field label="Machine name" value="Assembler 03"></punk-text-field>
        </div>
      </div>
      <punk-cluster justify="end">
        <punk-button>Reset</punk-button>
        <punk-button variant="primary">Apply</punk-button>
      </punk-cluster>
    </punk-stack>
  `;
}

export const ModalWindow: Story = {
  name: 'Modal window',
  render: () => html`
    <punk-button
      variant="primary"
      @click=${(event: Event) =>
        (event.currentTarget as HTMLElement).nextElementSibling
          ?.querySelector<HTMLElement & { show(): void }>('punk-window')
          ?.show()}
      >Open a modal window</punk-button
    >
    <div>
      <punk-window heading="Assembler 03" modal dismissible movable>
        ${Array.from(
          { length: 12 },
          () =>
            html`<p>
              Crafting speed after every installed module has been counted and the quality of each
              has been applied to the base rate.
            </p>`,
        )}
        ${actions}
      </punk-window>
    </div>
  `,
};
