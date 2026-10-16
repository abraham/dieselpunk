import { createOverlayStack } from './overlay-stack.ts';

/** The page's open overlays: the one stack every overlay joins while it is open. */
export const overlayStack = createOverlayStack(() => document);
