import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, render } from 'lit';
import type { PunkSwitch } from '@dieselpunk/core';
import '@dieselpunk/core/meter/register.js';
import '@dieselpunk/core/production-stat/register.js';
import '@dieselpunk/core/progress-bar/register.js';
import '@dieselpunk/core/status-light/register.js';
import '@dieselpunk/core/switch/register.js';
import '@dieselpunk/core/window/register.js';
import { createProductionDemo } from '../lib/production-demo.ts';
import type { DemoState } from '../lib/production-demo.ts';
import { sparkline } from '../lib/sparkline.ts';

const meta: Meta = {
  title: 'Examples/Production dashboard',
  tags: ['!autodocs'],
  parameters: {
    docs: {
      description: {
        story:
          'Stats with sparklines, meters, status lights, and progress bars, updated once a second. "Pause updates" stops the timer, since content that updates by itself must be pausable (WCAG 2.2.2).',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const series = [
  ['iron', 'Iron plates'],
  ['copper', 'Copper plates'],
  ['gears', 'Gears'],
  ['circuits', 'Circuits'],
] as const;

/** The change since the last second, as a ratio, which the stat shows as a percentage. */
function ratio(values: number[]): number {
  const last = values.at(-1) as number;
  const before = values.at(-2) as number;
  return (last - before) / before;
}

const dashboard = (state: DemoState) => html`
  <div
    style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px"
  >
    ${series.map(
      ([key, label]) => html`
        <punk-production-stat
          label=${label}
          unit="/min"
          .value=${Math.round(state.series[key].at(-1) as number)}
          .delta=${ratio(state.series[key])}
          delta-percent
          decimals="0"
        >
          ${sparkline(state.series[key])}
        </punk-production-stat>
      `,
    )}
  </div>
  <div class="wb-stack">
    <punk-meter
      label="Grid power"
      low="20"
      high="80"
      optimum="50"
      .value=${state.power}
      show-value
    ></punk-meter>
    <punk-meter
      label="Coolant"
      low="20"
      high="80"
      optimum="50"
      .value=${state.fluid}
      show-value
    ></punk-meter>
    <punk-meter
      label="Boiler heat"
      low="30"
      high="70"
      optimum="10"
      .value=${state.heat}
      show-value
    ></punk-meter>
  </div>
  <div class="wb-row">
    ${state.groups.map(
      (group) => html`
        <punk-status-light variant=${group.status}>${group.name}: ${group.text}</punk-status-light>
      `,
    )}
  </div>
  <div class="wb-stack">
    <punk-progress-bar label="Gear line" .value=${state.progress[0]} show-value></punk-progress-bar>
    <punk-progress-bar
      label="Circuit line"
      .value=${state.progress[1]}
      show-value
    ></punk-progress-bar>
    <punk-progress-bar
      label="Module line"
      .value=${state.progress[2]}
      show-value
    ></punk-progress-bar>
  </div>
`;

/**
 * Updates set properties and nothing else: no focus moves, and nothing is a live region, so a
 * screen reader is not told about each second. The timer stops when the story leaves the page.
 */
export const ProductionDashboard: Story = {
  render: () => {
    const demo = createProductionDemo();
    const host = document.createElement('div');
    host.className = 'wb-stack';
    host.style.maxInlineSize = '760px';
    host.dataset['paused'] = 'false';
    host.dataset['ticks'] = '0';
    let timer: number | undefined;

    const draw = () =>
      render(
        html`
          <div>
            <h2>Production dashboard</h2>
            <p>The numbers drift once a second. Nothing here is announced.</p>
            <punk-switch @change=${pause}>Pause updates</punk-switch>
          </div>
          <punk-window heading="Smelter hall" open>
            <div class="wb-stack">${dashboard(demo.state)}</div>
          </punk-window>
        `,
        host,
      );
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const tick = () => {
      if (!host.isConnected) {
        stop();
        return;
      }
      demo.step();
      host.dataset['ticks'] = String(demo.state.ticks);
      draw();
    };
    const start = () => {
      stop();
      timer = window.setInterval(tick, 1000);
    };
    function pause(event: Event) {
      const paused = (event.target as PunkSwitch).checked;
      host.dataset['paused'] = String(paused);
      if (paused) stop();
      else start();
    }
    draw();
    start();
    return host;
  },
};
