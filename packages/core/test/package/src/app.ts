import { setStrings } from '@dieselpunk/core';
import type { ButtonVariant, PunkButton, PunkIconButton, PunkProgressBar } from '@dieselpunk/core';
import '@dieselpunk/core/icon-button/register.js';
import '@dieselpunk/core/progress-bar/register.js';

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

document.body.append(iconButton, bar, loading);
document.documentElement.dataset['consumer'] = 'ready';
