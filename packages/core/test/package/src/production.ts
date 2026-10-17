import { configureLocalization } from '@lit/localize';
import type {
  ConnectionDirection,
  ProductionTrend,
  PunkConnectionRow,
  PunkProductionStat,
  PunkRemoveDetail,
} from '@dieselpunk/core';
import '@dieselpunk/core/connection-row/register.js';
import '@dieselpunk/core/meter/register.js';
import '@dieselpunk/core/production-stat/register.js';
import '@dieselpunk/core/status-light/register.js';
import '@dieselpunk/core/window/register.js';
import { loadLocale, sourceLocale, targetLocales } from '@dieselpunk/locales';
import { bindDocumentLocale } from '@dieselpunk/locales/document';

// A production view built from the registration entries a developer would pick, with the
// translations of `@dieselpunk/locales` and Lit Localize configured from this project's own copy
// (specs/testing.md §8).

document.body.innerHTML = `
  <punk-window heading="Smelter" open>
    <punk-production-stat label="Iron plates" value="1234567.89" unit="/min" trend="up" delta="0.12" delta-percent></punk-production-stat>
    <punk-meter label="Furnace heat" value="64" show-value></punk-meter>
    <punk-status-light variant="success">Running</punk-status-light>
    <punk-connection-row removable direction="forward" status="success" value="belt-1">
      <span slot="source">Iron smelter</span>
      <span slot="destination">Assembler</span>
      <span slot="status">Running</span>
    </punk-connection-row>
  </punk-window>
`;

const stat: PunkProductionStat = document.querySelector('punk-production-stat')!;
const row: PunkConnectionRow = document.querySelector('punk-connection-row')!;

const direction: ConnectionDirection = 'both';
row.direction = direction;
// @ts-expect-error `direction` is `forward`, `backward`, or `both`.
row.direction = 'sideways';
row.direction = 'forward';

const trend: ProductionTrend = 'down';
stat.trend = trend;
// @ts-expect-error `trend` is `up`, `down`, or `flat`.
stat.trend = 'sideways';
stat.trend = 'up';

const removed: string[] = [];
// The row's event bubbles, so an ancestor hears it.
document.querySelector('punk-window')!.addEventListener('punk-remove', (event) => {
  const detail: PunkRemoveDetail = event.detail;
  const item: HTMLElement = detail.item;
  // @ts-expect-error The detail is `{ value, item }`; it has no `reason`.
  void detail.reason;
  removed.push(`${detail.value}:${item.localName}`);
  document.documentElement.dataset['removed'] = removed.join(' ');
});

const { setLocale } = configureLocalization({ sourceLocale, targetLocales, loadLocale });
bindDocumentLocale();

declare global {
  interface Window {
    production: { setLocale: (code: string) => Promise<void> };
  }
}
window.production = { setLocale };

await setLocale('de');
document.documentElement.dataset['production'] = 'ready';
