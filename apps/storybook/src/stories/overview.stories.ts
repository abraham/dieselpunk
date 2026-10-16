import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { PunkSelectionChangeDetail } from '@dieselpunk/core';
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/divider/register.js';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/progress-bar/register.js';
import '@dieselpunk/core/slot/register.js';
import '@dieselpunk/core/item-stack/register.js';
import '@dieselpunk/core/slot-grid/register.js';
import '@dieselpunk/core/recipe/register.js';
import '@dieselpunk/core/meter/register.js';
import '@dieselpunk/core/status-light/register.js';
import { icon } from '../icons/icons.ts';
import { item, itemLabels, itemNames } from '../icons/items.ts';
import { applicationShell } from '../lib/application-shell.ts';

const meta: Meta = {
  title: 'Overview',
  tags: ['!autodocs'],
};

export default meta;
type Story = StoryObj;

const showSelection = (event: CustomEvent<PunkSelectionChangeDetail>) => {
  const output = (event.currentTarget as HTMLElement).parentElement?.querySelector('output');
  if (output) output.textContent = event.detail.values.join(', ') || 'nothing selected';
};

export const Inventory: Story = {
  render: () => html`
    <div class="wb-stack" style="max-inline-size: 720px">
      <div>
        <h2>Dieselpunk UI</h2>
        <p>
          Industrial game-style Web Components. Use the toolbar to switch theme and density. This
          assembler is built from the inventory components: slots, item stacks, a keyboard-navigable
          grid, a recipe, meters, and status lights.
        </p>
      </div>

      <punk-panel role="region" aria-label="Assembling machine">
        <span slot="header">Assembling machine 2</span>
        <div class="wb-stack">
          <div class="wb-row" style="align-items: flex-start">
            <div class="wb-stack">
              <span class="wb-caption">Ingredients</span>
              <punk-slot-grid aria-label="Ingredients" columns="3">
                <punk-item-stack name=${itemLabels.gear} value="gear" count="2">
                  ${item('gear', 'icon')}
                </punk-item-stack>
                <punk-item-stack name=${itemLabels.circuit} value="circuit" count="1">
                  ${item('circuit', 'icon')}
                </punk-item-stack>
                <punk-slot label="Empty ingredient slot" value="free"></punk-slot>
              </punk-slot-grid>
            </div>
            <div class="wb-stack">
              <span class="wb-caption">Output</span>
              <punk-slot-grid aria-label="Output" columns="1">
                <punk-item-stack name=${itemLabels.module} value="module" count="8" quality="2">
                  ${item('module', 'icon')}
                </punk-item-stack>
              </punk-slot-grid>
            </div>
            <div class="wb-stack" style="flex: 1; min-inline-size: 220px">
              <span class="wb-caption">Recipe</span>
              <punk-recipe name="Speed module" duration="6" available craftable-count="4" selected>
                ${item('module', 'icon')}
                <span slot="ingredients">2 gears, 1 circuit</span>
                <span slot="products">Speed module</span>
              </punk-recipe>
            </div>
          </div>

          <punk-progress-bar
            label="Crafting speed module"
            value="64"
            show-value
          ></punk-progress-bar>

          <punk-divider>Condition</punk-divider>
          <div class="wb-stack">
            <punk-meter
              label="Power"
              low="30"
              high="70"
              optimum="100"
              value="92"
              show-value
            ></punk-meter>
            <punk-meter
              label="Boiler heat"
              low="30"
              high="70"
              optimum="50"
              value="81"
              show-value
            ></punk-meter>
            <punk-meter
              label="Coolant"
              low="30"
              high="70"
              optimum="100"
              value="12"
              show-value
            ></punk-meter>
          </div>

          <punk-divider>Controls</punk-divider>
          <div class="wb-row">
            <punk-button variant="primary">
              <span slot="icon-start">${icon('check')}</span>Start
            </punk-button>
            <punk-button>Pause</punk-button>
            <punk-button variant="danger">
              <span slot="icon-start">${icon('close')}</span>Stop
            </punk-button>
          </div>
        </div>
        <span slot="footer" class="wb-row">
          <punk-status-light variant="success">Running</punk-status-light>
          <punk-status-light variant="warning">Coolant low</punk-status-light>
        </span>
      </punk-panel>

      <punk-panel variant="inset">
        <span slot="header">Storage</span>
        <div class="wb-stack">
          <p>
            Tab into the grid and use the arrow keys. Space selects an item, and Shift+Arrow extends
            the selection.
          </p>
          <punk-slot-grid
            aria-label="Storage chest"
            selection="multiple"
            columns="8"
            .values=${['i2']}
            @punk-selection-change=${showSelection}
          >
            ${[...Array(16).keys()].map((index) => {
              const name = itemNames[index % itemNames.length] ?? 'gear';
              return index % 5 === 4
                ? html`<punk-slot
                    label=${`Empty slot ${index + 1}`}
                    value=${`i${index + 1}`}
                  ></punk-slot>`
                : html`
                    <punk-item-stack
                      name=${itemLabels[name]}
                      value=${`i${index + 1}`}
                      .count=${((index * 37) % 99) + 1}
                    >
                      ${item(name, 'icon')}
                    </punk-item-stack>
                  `;
            })}
          </punk-slot-grid>
          <output class="wb-caption">i2</output>
        </div>
      </punk-panel>
    </div>
  `,
};

export const ApplicationShell: Story = {
  name: 'Application shell',
  render: () => applicationShell(),
};
