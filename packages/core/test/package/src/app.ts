import { setStrings } from '@dieselpunk/core';
import type {
  ButtonVariant,
  GridSelection,
  PunkAccordion,
  PunkAccordionItem,
  PunkActivateDetail,
  PunkButton,
  PunkCloseDetail,
  PunkCloseReason,
  PunkCluster,
  PunkDialog,
  PunkIconButton,
  PunkItemStack,
  PunkMeter,
  PunkMoveDetail,
  PunkOverflowDetail,
  PunkProgressBar,
  PunkRecipe,
  PunkSelectionChangeDetail,
  PunkSlot,
  PunkSlotGrid,
  PunkStack,
  PunkStatusLight,
  PunkTab,
  PunkTabChangeDetail,
  PunkTabs,
  PunkToggleDetail,
  PunkToolbar,
  PunkWindow,
  StackGap,
  StatusVariant,
} from '@dieselpunk/core';
import '@dieselpunk/core/accordion/register.js';
import '@dieselpunk/core/cluster/register.js';
import '@dieselpunk/core/dialog/register.js';
import '@dieselpunk/core/icon-button/register.js';
import '@dieselpunk/core/item-stack/register.js';
import '@dieselpunk/core/meter/register.js';
import '@dieselpunk/core/progress-bar/register.js';
import '@dieselpunk/core/recipe/register.js';
import '@dieselpunk/core/slot/register.js';
import '@dieselpunk/core/slot-grid/register.js';
import '@dieselpunk/core/stack/register.js';
import '@dieselpunk/core/tabs/register.js';
import '@dieselpunk/core/toolbar/register.js';
import '@dieselpunk/core/window/register.js';
import '@dieselpunk/core/status-light/register.js';

setStrings({ loading: 'Laden' });

const variant: ButtonVariant = 'primary';

// The package declares the tag name map, so these are typed without a cast.
const iconButton: PunkIconButton = document.createElement('punk-icon-button');
iconButton.label = 'Settings';
iconButton.variant = variant;

const bar: PunkProgressBar = document.createElement('punk-progress-bar');
bar.label = 'Crafting';
bar.value = 64;

// @ts-expect-error The variants are a closed union, so a typo must not compile.
iconButton.variant = 'primry';

const loading: PunkButton = document.createElement('punk-button');
loading.loading = true;

// The inventory: a grid of slots and stacks, with typed events.
const selection: GridSelection = 'multiple';
const grid: PunkSlotGrid = document.createElement('punk-slot-grid');
grid.setAttribute('aria-label', 'Cargo');
grid.selection = selection;
grid.columns = 2;

const slot: PunkSlot = document.createElement('punk-slot');
slot.label = 'Engine slot';
slot.value = 'engine';

const stack: PunkItemStack = document.createElement('punk-item-stack');
stack.name = 'Iron plate';
stack.value = 'iron';
stack.count = 1234;
stack.compactCount = true;
grid.append(slot, stack);

// @ts-expect-error The selection modes are a closed union.
grid.selection = 'several';
grid.selection = selection;

// The event maps are declared by the package, so the details are typed without a cast.
let selectedValues: string[] = [];
grid.addEventListener('punk-selection-change', (event) => {
  const detail: PunkSelectionChangeDetail = event.detail;
  selectedValues = detail.values;
  // @ts-expect-error The detail carries `values` and `items`, not `selected`.
  void detail.selected;
});
grid.addEventListener('punk-activate', (event) => {
  const detail: PunkActivateDetail = event.detail;
  const item: HTMLElement = detail.item;
  void [detail.value, item, selectedValues];
});

const recipe: PunkRecipe = document.createElement('punk-recipe');
recipe.name = 'Gear';
recipe.duration = 2;

const meter: PunkMeter = document.createElement('punk-meter');
meter.label = 'Heat';
meter.value = 64;

const light: PunkStatusLight = document.createElement('punk-status-light');
const status: StatusVariant = 'warning';
light.variant = status;
light.textContent = 'Low fuel';

document.body.append(iconButton, bar, loading, grid, recipe, meter, light);

// The shell: layout primitives and an accordion, with a typed toggle event.
const layout: PunkStack = document.createElement('punk-stack');
const gap: StackGap = '3';
layout.gap = gap;
// @ts-expect-error The gaps are a closed union.
layout.gap = '9';
layout.gap = gap;
const cluster: PunkCluster = document.createElement('punk-cluster');
cluster.justify = 'between';
cluster.append(loading.cloneNode());
const accordion: PunkAccordion = document.createElement('punk-accordion');
accordion.multiple = false;
const section: PunkAccordionItem = document.createElement('punk-accordion-item');
section.heading = 'Inputs';
section.level = 3;
section.textContent = 'Iron plates';
section.addEventListener('punk-toggle', (event) => {
  const detail: PunkToggleDetail = event.detail;
  // @ts-expect-error The detail carries `expanded` only.
  void detail.open;
});
accordion.append(section);
layout.append(cluster, accordion);

// Tabs with a panel, and a toolbar, with typed events.
const tabs: PunkTabs = document.createElement('punk-tabs');
tabs.setAttribute('aria-label', 'Machine');
// @ts-expect-error The activation modes are a closed union.
tabs.activation = 'sometimes';
tabs.activation = 'manual';
const inputs: PunkTab = document.createElement('punk-tab');
inputs.slot = 'tab';
inputs.panel = 'inputs';
inputs.textContent = 'Inputs';
const outputs: PunkTab = document.createElement('punk-tab');
outputs.slot = 'tab';
outputs.panel = 'outputs';
outputs.textContent = 'Outputs';
const inputsPanel = document.createElement('div');
inputsPanel.id = 'inputs';
const outputsPanel = document.createElement('div');
outputsPanel.id = 'outputs';
tabs.addEventListener('punk-tab-change', (event) => {
  const detail: PunkTabChangeDetail = event.detail;
  const shown: HTMLElement | null = detail.panel;
  // @ts-expect-error The detail carries `value`, `tab`, and `panel`, not an index.
  void detail.index;
  void [detail.value, detail.tab, shown];
});
tabs.append(inputs, outputs, inputsPanel, outputsPanel);

const toolbar: PunkToolbar = document.createElement('punk-toolbar');
toolbar.setAttribute('aria-label', 'Tools');
toolbar.wrap = false;
toolbar.addEventListener('punk-overflow-change', (event) => {
  const detail: PunkOverflowDetail = event.detail;
  const hidden: HTMLElement[] = detail.hidden;
  // @ts-expect-error The detail lists the hidden items only.
  void detail.visible;
  void hidden;
});
toolbar.append(loading.cloneNode(true));
layout.append(tabs, toolbar);

// A window and a dialog, with typed open, close, and move events.
const assembler: PunkWindow = document.createElement('punk-window');
assembler.heading = 'Assembler';
assembler.movable = true;
assembler.dismissible = true;
assembler.addEventListener('punk-move-end', (event) => {
  const detail: PunkMoveDetail = event.detail;
  // @ts-expect-error The detail is an offset, `x` and `y` only.
  void detail.z;
  void [detail.x, detail.y];
});
const confirm: PunkDialog = document.createElement('punk-dialog');
confirm.heading = 'Discard the run?';
confirm.persistent = false;
confirm.addEventListener('punk-close', (event) => {
  const detail: PunkCloseDetail = event.detail;
  const reason: PunkCloseReason = detail.reason;
  // @ts-expect-error The reasons are a closed union.
  const unknown: PunkCloseReason = 'sulking';
  void [reason, unknown, detail.returnValue];
});
layout.append(assembler, confirm);

document.body.append(layout);
document.documentElement.dataset['consumer'] = 'ready';
