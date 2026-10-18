import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTree } from '@dieselpunk/core';
import '@dieselpunk/core/tree/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes } = getStorybookHelpers<PunkTree>('punk-tree');

const nodes = html`
  <punk-tree-item label="Smelting" value="smelting" expanded>
    <punk-tree-item label="Iron plate" value="iron"></punk-tree-item>
    <punk-tree-item label="Copper plate" value="copper"></punk-tree-item>
    <punk-tree-item label="Steel" value="steel">
      <punk-tree-item label="Alloy steel" value="alloy"></punk-tree-item>
    </punk-tree-item>
  </punk-tree-item>
  <punk-tree-item label="Assembly" value="assembly">
    <punk-tree-item label="Gear" value="gear"></punk-tree-item>
    <punk-tree-item label="Circuit" value="circuit" disabled></punk-tree-item>
  </punk-tree-item>
  <punk-tree-item label="Logistics" value="logistics"></punk-tree-item>
`;

const meta = preview.type<{ args: StoryArgs<PunkTree> }>().meta({
  title: 'Components/Tree',
  component: 'punk-tree',
  args: { ...args, selection: 'single' },
  argTypes,
  render: (storyArgs) =>
    html`<punk-tree
      aria-label="Recipes"
      selection=${storyArgs.selection}
      style="max-inline-size: 360px"
      >${nodes}</punk-tree
    >`,
  parameters: {
    docs: {
      description: {
        component: `
Hierarchical navigation and selection, such as a file tree or a tech tree: the APG tree view.
Nest \`punk-tree-item\` elements inside each other; each is named by its \`label\`, and a parent
shows its children while it is \`expanded\`. Name the tree with \`aria-label\`.

**Keys.** The tree is one tab stop. Up and Down move among the items that show, Home and End go to
the first and last, Right expands a closed parent and enters an open one, and Left collapses an
open parent or goes up to the item's parent. \`*\` expands every sibling, a letter moves to the next
item that starts with it, and Enter sends \`punk-activate\`.

**Selection.** With \`selection="single"\` or \`"multiple"\`, Space and a click select or toggle an
item, and Ctrl+A selects all in a multiple tree. \`values\` reads and assigns the selection, and
\`punk-selection-change\` reports each change the user makes. A click on a triangle expands or
collapses, and \`punk-toggle\` reports it.
`,
      },
    },
  },
});

export const Playground = meta.story();

const trees = () => html`
  <div class="wb-stack">
    ${group('Navigation', html`<punk-tree aria-label="Recipes">${nodes}</punk-tree>`)}
    ${group(
      'Multiple selection',
      html`<punk-tree aria-label="Recipes" selection="multiple">${nodes}</punk-tree>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 360px">${trees()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(trees),
});
