import { describe, expect, it } from 'vitest';
import { registerElement } from '../../utilities/register-element.ts';
import { PunkTab, PunkTabs } from './index.ts';

// A separate file: the registry here has no tab defined until the test defines it.
describe('tabs defined before their tabs', () => {
  it('manages a tab that is upgraded after the tabs have rendered', async () => {
    registerElement('punk-tabs', PunkTabs);
    const tabs = document.createElement('punk-tabs');
    tabs.setAttribute('aria-label', 'Late');
    tabs.innerHTML = '<punk-tab slot="tab" panel="a">A</punk-tab>';
    document.body.append(tabs, Object.assign(document.createElement('div'), { id: 'a' }));
    await tabs.updateComplete;
    await new Promise((resolve) => setTimeout(resolve));
    registerElement('punk-tab', PunkTab);
    const tab = tabs.querySelector('punk-tab') as PunkTab;
    await tab.updateComplete;
    expect(tab.owner).toBe(tabs);
    expect(tab.selected).toBe(true);
    expect(document.getElementById('a')?.getAttribute('role')).toBe('tabpanel');
    tabs.remove();
    document.getElementById('a')?.remove();
  });
});
