import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/divider/register.js';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/icon-button/register.js';
import '@dieselpunk/core/progress-bar/register.js';
import '@dieselpunk/core/tooltip/register.js';
import { icon } from '../icons/icons.ts';

const meta: Meta = {
  title: 'Foundations/Machine panel',
  tags: ['!autodocs'],
};

export default meta;
type Story = StoryObj;

export const MachinePanel: Story = {
  name: 'Machine panel',
  render: () => html`
    <div class="wb-stack" style="max-inline-size: 640px">
      <div>
        <h2>Dieselpunk UI</h2>
        <p>
          Industrial game-style Web Components. Use the toolbar to switch theme and density. This is
          a machine panel composed from the six foundation components.
        </p>
      </div>

      <punk-panel role="region" aria-label="Assembling machine">
        <span slot="header">Assembling machine 2</span>
        <div class="wb-stack">
          <punk-progress-bar label="Crafting gearbox" value="64" show-value></punk-progress-bar>
          <punk-progress-bar
            label="Power"
            variant="success"
            value="92"
            show-value
          ></punk-progress-bar>
          <punk-progress-bar
            label="Boiler heat"
            variant="warning"
            value="81"
            show-value
          ></punk-progress-bar>
          <punk-progress-bar
            label="Coolant"
            variant="danger"
            value="12"
            show-value
          ></punk-progress-bar>
          <punk-divider>Controls</punk-divider>
          <div class="wb-row">
            <punk-button variant="primary">
              <span slot="icon-start">${icon('check')}</span>Start
            </punk-button>
            <punk-button>Pause</punk-button>
            <punk-button variant="danger">
              <span slot="icon-start">${icon('close')}</span>Stop
            </punk-button>
            <span style="margin-inline-start: auto" class="wb-row">
              <punk-icon-button label="Add module">${icon('plus')}</punk-icon-button>
              <punk-icon-button label="Details">${icon('info')}</punk-icon-button>
              <punk-icon-button label="Settings">${icon('gear')}</punk-icon-button>
            </span>
          </div>
        </div>
        <span slot="footer">Output 0.75 per second</span>
      </punk-panel>

      <punk-panel variant="inset">
        <span slot="header">Research queue</span>
        <div class="wb-stack">
          <punk-progress-bar label="Searching for a signal"></punk-progress-bar>
          <div class="wb-row">
            <punk-button loading>Scanning</punk-button>
            <punk-button disabled>Cancel</punk-button>
            <punk-button>Details</punk-button>
            <punk-tooltip>Opens the research details</punk-tooltip>
          </div>
        </div>
      </punk-panel>
    </div>
  `,
};
