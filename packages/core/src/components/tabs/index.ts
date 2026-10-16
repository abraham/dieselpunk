import type { PunkTabs } from './tabs.ts';
import type { PunkTab } from './tab.ts';

export { PunkTabs } from './tabs.ts';
export { PunkTab } from './tab.ts';
export type { PunkTabChangeDetail, TabActivation, TabsOrientation } from './tabs.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-tabs': PunkTabs;
    'punk-tab': PunkTab;
  }
}
