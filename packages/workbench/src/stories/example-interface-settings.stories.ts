import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, render } from 'lit';
import '@dieselpunk/core/connection-row/register.js';
import '@dieselpunk/core/item-stack/register.js';
import '@dieselpunk/core/meter/register.js';
import '@dieselpunk/core/production-stat/register.js';
import '@dieselpunk/core/recipe/register.js';
import '@dieselpunk/core/select/register.js';
import '@dieselpunk/core/slot/register.js';
import '@dieselpunk/core/window/register.js';
import { item } from '../icons/items.ts';
import { locales, setLocale } from '../lib/localization.ts';
import { densities, paletteThemes } from '../lib/options.ts';

const meta: Meta = {
  title: 'Examples/Interface settings',
  tags: ['!autodocs'],
  parameters: {
    docs: {
      description: {
        story:
          'A language, a theme, and a density. The language calls `setLocale`, and `bindDocumentLocale()` sets `lang` and `dir` on the page, so the components change their words and their direction. This is the one place that shows localization working across the whole library.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const InterfaceSettings: Story = {
  render: () => {
    const host = document.createElement('div');
    host.className = 'wb-stack';
    host.style.maxInlineSize = '760px';
    let theme = 'dark';
    let density = 'compact';
    // The workbench page is one page: start each showing in English, so a language chosen earlier
    // does not carry over.
    void setLocale('en');

    const readout = () => {
      const root = document.documentElement;
      return `lang="${root.lang || 'en'}" dir="${root.dir || 'ltr'}"`;
    };
    const draw = () =>
      render(
        html`
          <div>
            <h2>Interface settings</h2>
            <p>
              Choose a language: the words the components write change, and the page's
              <code>lang</code> and <code>dir</code> follow.
            </p>
          </div>
          <div class="wb-row" style="align-items: flex-end">
            <punk-select label="Language" @change=${onLanguage}>
              ${locales.map(
                (locale) =>
                  html`<option value=${locale.code} ?selected=${locale.code === 'en'}>
                    ${locale.name}
                  </option>`,
              )}
            </punk-select>
            <punk-select
              label="Theme"
              @change=${(e: Event) => ((theme = (e.target as HTMLInputElement).value), draw())}
            >
              ${paletteThemes.map((t) => html`<option value=${t.value} ?selected=${t.value === theme}>${t.title}</option>`)}
            </punk-select>
            <punk-select
              label="Density"
              @change=${(e: Event) => ((density = (e.target as HTMLInputElement).value), draw())}
            >
              ${densities.map((d) => html`<option value=${d.value} ?selected=${d.value === density}>${d.title}</option>`)}
            </punk-select>
          </div>
          <output class="wb-mono" data-readout>${readout()}</output>
          <div
            class="wb-cell wb-stack"
            data-punk-theme=${theme}
            data-punk-density=${density}
            style="padding: 16px"
          >
            <punk-window heading="Sample" open>
              <div class="wb-stack">
                <punk-recipe
                  name="Speed module"
                  duration="6"
                  available
                  craftable-count="4"
                  selected
                >
                  ${item('module', 'icon')}
                  <span slot="ingredients">2 gears</span>
                  <span slot="products">Speed module</span>
                </punk-recipe>
                <punk-recipe name="Circuit" duration="2">
                  ${item('circuit', 'icon')}
                  <span slot="ingredients">1 plate</span>
                </punk-recipe>
                <div class="wb-row">
                  <punk-item-stack name="Gear" count="3" capacity="9" durability="0.4" quality="3">
                    ${item('gear', 'icon')}
                  </punk-item-stack>
                  <punk-slot label="Module slot" invalid></punk-slot>
                </div>
                <punk-meter
                  label="Boiler heat"
                  low="30"
                  high="70"
                  optimum="50"
                  value="15"
                  show-value
                ></punk-meter>
                <div class="wb-row">
                  <punk-production-stat
                    label="Iron plates"
                    value="1234567.89"
                    unit="/min"
                    trend="up"
                    delta="0.124"
                    delta-percent
                  ></punk-production-stat>
                  <punk-production-stat label="Not measured" unit="/min"></punk-production-stat>
                </div>
                <punk-connection-row removable direction="both" status="success">
                  <span slot="source">Iron smelter</span>
                  <span slot="destination">Assembler</span>
                  <span slot="status">Running</span>
                </punk-connection-row>
              </div>
            </punk-window>
          </div>
        `,
        host,
      );
    async function onLanguage(event: Event) {
      await setLocale((event.target as HTMLInputElement).value);
      draw();
    }
    draw();
    return host;
  },
};
