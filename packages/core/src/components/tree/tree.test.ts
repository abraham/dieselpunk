import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkTree, PunkTreeItem } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const nodes = `
  <punk-tree-item label="Smelting" value="smelting">
    <punk-tree-item label="Iron" value="iron"></punk-tree-item>
    <punk-tree-item label="Copper" value="copper" disabled></punk-tree-item>
    <punk-tree-item label="Steel" value="steel">
      <punk-tree-item label="Alloys" value="alloys"></punk-tree-item>
    </punk-tree-item>
  </punk-tree-item>
  <punk-tree-item label="Assembly" value="assembly">
    <punk-tree-item label="Gears" value="gears"></punk-tree-item>
  </punk-tree-item>
  <punk-tree-item label="Logistics" value="logistics"></punk-tree-item>
`;

async function mount(
  attributes = 'aria-label="Recipes"',
  inner = nodes,
  dir = 'ltr',
): Promise<PunkTree> {
  const holder = track(document.createElement('div'));
  holder.dir = dir;
  holder.style.inlineSize = '320px';
  holder.innerHTML = `<punk-tree ${attributes}>${inner}</punk-tree><button id="after">After</button>`;
  const tree = holder.firstElementChild as PunkTree;
  await settle(tree);
  return tree;
}

async function settle(tree: PunkTree): Promise<void> {
  for (let round = 0; round < 2; round++) {
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all(
      [tree, ...tree.querySelectorAll<PunkTreeItem>('punk-tree-item')].map(
        (element) => element.updateComplete,
      ),
    );
  }
}

const item = (tree: Element, value: string) =>
  tree.querySelector(`punk-tree-item[value="${value}"]`) as PunkTreeItem;
const focused = () => (document.activeElement as PunkTreeItem | null)?.value;
const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;

async function press(tree: PunkTree, keys: string): Promise<void> {
  await userEvent.keyboard(keys);
  await settle(tree);
}

describe('semantics', () => {
  it('is a tree of tree items with levels, names, and expanded states', async () => {
    const tree = await mount();
    expect(tree.getAttribute('role')).toBe('tree');
    expect(page.getByRole('tree', { name: 'Recipes' }).element()).toBe(tree);
    const smelting = item(tree, 'smelting');
    expect(smelting.getAttribute('role')).toBe('treeitem');
    expect(smelting.getAttribute('aria-label')).toBe('Smelting');
    expect(smelting.getAttribute('aria-level')).toBe('1');
    expect(smelting.getAttribute('aria-expanded')).toBe('false');
    expect(item(tree, 'alloys').getAttribute('aria-level')).toBe('3');
    expect(item(tree, 'iron').hasAttribute('aria-expanded')).toBe(false);
    expect(item(tree, 'copper').getAttribute('aria-disabled')).toBe('true');
    expect(part(smelting, 'group').getAttribute('role')).toBe('group');
    expect(tree.hasAttribute('aria-multiselectable')).toBe(false);
    expect(smelting.hasAttribute('aria-selected')).toBe(false);
  });

  it('shows children only while their parent is expanded, with the triangle turned', async () => {
    const tree = await mount();
    const smelting = item(tree, 'smelting');
    expect(item(tree, 'iron').checkVisibility()).toBe(false);
    expect(part(item(tree, 'iron'), 'toggle').hidden).toBe(true);
    smelting.expanded = true;
    await settle(tree);
    expect(item(tree, 'iron').checkVisibility()).toBe(true);
    expect(smelting.getAttribute('aria-expanded')).toBe('true');
    expect(part(smelting, 'toggle').classList.contains('open')).toBe(true);
  });

  it('indents each level, and mirrors in right-to-left text', async () => {
    const tree = await mount(
      'aria-label="Recipes"',
      nodes.replace('value="smelting"', 'value="smelting" expanded'),
    );
    const outer = part(item(tree, 'smelting'), 'label').getBoundingClientRect();
    const inner = part(item(tree, 'iron'), 'label').getBoundingClientRect();
    expect(inner.left - outer.left).toBeGreaterThan(8);
    const rtl = await mount(
      'aria-label="Recipes"',
      nodes.replace('value="smelting"', 'value="smelting" expanded'),
      'rtl',
    );
    const rtlOuter = part(item(rtl, 'smelting'), 'label').getBoundingClientRect();
    const rtlInner = part(item(rtl, 'iron'), 'label').getBoundingClientRect();
    expect(rtlOuter.right - rtlInner.right).toBeGreaterThan(8);
  });

  it('warns about a missing name, a stray child, and missing values when selecting', async () => {
    await mount('', '<punk-tree-item label="A"></punk-tree-item><div>Stray</div>');
    const said = warn.mock.calls.map((call) => String(call[0]));
    expect(said.some((text) => text.includes('<punk-tree> It has no accessible name'))).toBe(true);
    expect(said.some((text) => text.includes('not `punk-tree-item`'))).toBe(true);
    warn.mockClear();
    await mount('aria-label="T" selection="single"', '<punk-tree-item label="A"></punk-tree-item>');
    expect(String(warn.mock.calls[0]?.[0])).toContain('distinct, non-empty `value`s');
  });
});

describe('keyboard', () => {
  it('is one tab stop, and Up and Down move among the items that show', async () => {
    const tree = await mount();
    expect(item(tree, 'smelting').tabIndex).toBe(0);
    expect(item(tree, 'assembly').tabIndex).toBe(-1);
    item(tree, 'smelting').focus();
    await press(tree, '{ArrowDown}');
    expect(focused()).toBe('assembly');
    await press(tree, '{ArrowDown}{ArrowDown}');
    expect(focused()).toBe('logistics');
    await press(tree, '{Home}');
    expect(focused()).toBe('smelting');
    await press(tree, '{End}{ArrowUp}');
    expect(focused()).toBe('assembly');
    expect(item(tree, 'assembly').tabIndex).toBe(0);
    await press(tree, '{Tab}');
    expect(document.activeElement?.id).toBe('after');
  });

  it('expands with Right, enters with Right, collapses with Left, and goes up with Left', async () => {
    const tree = await mount();
    const toggles: string[] = [];
    tree.addEventListener('punk-toggle', (event) =>
      toggles.push(`${(event.target as PunkTreeItem).value}:${event.detail.expanded}`),
    );
    item(tree, 'smelting').focus();
    await press(tree, '{ArrowRight}');
    expect(item(tree, 'smelting').expanded).toBe(true);
    expect(focused()).toBe('smelting');
    await press(tree, '{ArrowRight}');
    expect(focused()).toBe('iron');
    await press(tree, '{ArrowRight}');
    expect(focused()).toBe('iron');
    await press(tree, '{ArrowDown}');
    expect(focused()).toBe('steel');
    await press(tree, '{ArrowLeft}');
    expect(focused()).toBe('smelting');
    await press(tree, '{ArrowLeft}');
    expect(item(tree, 'smelting').expanded).toBe(false);
    expect(toggles).toEqual(['smelting:true', 'smelting:false']);
  });

  it('swaps Right and Left in right-to-left text', async () => {
    const tree = await mount('aria-label="Recipes"', nodes, 'rtl');
    item(tree, 'smelting').focus();
    await press(tree, '{ArrowLeft}');
    expect(item(tree, 'smelting').expanded).toBe(true);
  });

  it('expands every sibling with *, and moves by the first letter', async () => {
    const tree = await mount();
    item(tree, 'smelting').focus();
    await press(tree, '*');
    expect(item(tree, 'smelting').expanded).toBe(true);
    expect(item(tree, 'assembly').expanded).toBe(true);
    expect(item(tree, 'logistics').expanded).toBe(false);
    await press(tree, 'g');
    expect(focused()).toBe('gears');
    await press(tree, 's');
    expect(focused()).toBe('smelting');
    await press(tree, 's');
    expect(focused()).toBe('steel');
  });

  it('activates with Enter, once per press', async () => {
    const tree = await mount();
    const activated: string[] = [];
    tree.addEventListener('punk-activate', (event) => activated.push(event.detail.value));
    item(tree, 'logistics').focus();
    await press(tree, '{Enter}');
    expect(activated).toEqual(['logistics']);
  });

  it('moves focus out of what a collapse hides', async () => {
    const tree = await mount(
      'aria-label="Recipes"',
      nodes.replace('value="smelting"', 'value="smelting" expanded'),
    );
    item(tree, 'iron').focus();
    await userEvent.click(part(item(tree, 'smelting'), 'toggle'));
    await settle(tree);
    expect(focused()).toBe('smelting');
  });
});

describe('selection', () => {
  it('selects with Space and a click in a single-selection tree, once per change', async () => {
    const tree = await mount('aria-label="Recipes" selection="single"');
    const changes: string[][] = [];
    tree.addEventListener('punk-selection-change', (event) => changes.push(event.detail.values));
    expect(item(tree, 'smelting').getAttribute('aria-selected')).toBe('false');
    item(tree, 'smelting').focus();
    await press(tree, ' ');
    await userEvent.click(part(item(tree, 'logistics'), 'label'));
    await settle(tree);
    await userEvent.click(part(item(tree, 'logistics'), 'label'));
    await settle(tree);
    expect(changes).toEqual([['smelting'], ['logistics']]);
    expect(item(tree, 'logistics').getAttribute('aria-selected')).toBe('true');
    expect(item(tree, 'logistics').selected).toBe(true);
    expect(item(tree, 'smelting').selected).toBe(false);
  });

  it('toggles in a multiple-selection tree, selects all with Ctrl+A, and skips disabled items', async () => {
    const tree = await mount('aria-label="Recipes" selection="multiple"');
    expect(tree.getAttribute('aria-multiselectable')).toBe('true');
    item(tree, 'smelting').focus();
    await press(tree, ' ');
    await press(tree, '{End} ');
    expect(tree.values).toEqual(['smelting', 'logistics']);
    await press(tree, ' ');
    expect(tree.values).toEqual(['smelting']);
    await press(tree, '{Control>}a{/Control}');
    expect(tree.values).not.toContain('copper');
    expect(tree.values).toContain('alloys');
  });

  it('starts from the markup, takes values from code without an event, and draws a check', async () => {
    const tree = await mount(
      'aria-label="Recipes" selection="single"',
      nodes.replace('value="logistics"', 'value="logistics" selected'),
    );
    expect(tree.values).toEqual(['logistics']);
    expect(item(tree, 'logistics').tabIndex).toBe(0);
    const changes: unknown[] = [];
    tree.addEventListener('punk-selection-change', (event) => changes.push(event));
    tree.values = ['assembly'];
    await settle(tree);
    expect(item(tree, 'assembly').selected).toBe(true);
    expect(getComputedStyle(part(item(tree, 'assembly'), 'check')).display).toBe('block');
    expect(changes).toEqual([]);
  });

  it('keeps the selected row apart under forced colors', async () => {
    await commands.setForcedColors('active');
    const tree = await mount('aria-label="Recipes" selection="single"');
    tree.values = ['logistics'];
    await settle(tree);
    expect(getComputedStyle(part(item(tree, 'logistics'), 'row')).borderLeftWidth).toBe('3px');
    expect(getComputedStyle(part(item(tree, 'assembly'), 'row')).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(part(item(tree, 'logistics'), 'check')).display).toBe('block');
  });
});

describe('changes', () => {
  it('takes in items added inside a parent, and lets go of ones removed', async () => {
    const tree = await mount('aria-label="Recipes" selection="single"');
    const added = document.createElement('punk-tree-item');
    added.label = 'Rail';
    added.value = 'rail';
    item(tree, 'logistics').append(added);
    await settle(tree);
    expect(item(tree, 'logistics').getAttribute('aria-expanded')).toBe('false');
    expect(item(tree, 'rail').getAttribute('aria-level')).toBe('2');
    tree.values = ['rail'];
    await settle(tree);
    added.remove();
    await settle(tree);
    expect(tree.values).toEqual([]);
    expect(item(tree, 'logistics').hasAttribute('aria-expanded')).toBe(false);
  });
});
