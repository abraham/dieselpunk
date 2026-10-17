import 'vitest/browser';
// The shared commands: media emulation and a held pointer.
import '@dieselpunk/testing/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** The generated Custom Elements Manifest, parsed. */
    readManifest: () => Promise<unknown>;
  }
}
