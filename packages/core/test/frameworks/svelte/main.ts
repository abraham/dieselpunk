import { mount } from 'svelte';
import '@dieselpunk/core/tokens.css';
import '@dieselpunk/core/themes.css';
// Registering is a side effect, so each element you use is imported once, before it renders.
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/dialog/register.js';
import '@dieselpunk/core/slider/register.js';
import '@dieselpunk/core/switch/register.js';
import '@dieselpunk/core/tabs/register.js';
import '@dieselpunk/core/text-field/register.js';
import '@dieselpunk/core/window/register.js';
import App from './App.svelte';

mount(App, { target: document.getElementById('root')! });
