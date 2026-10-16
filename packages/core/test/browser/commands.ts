import 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Emulates `prefers-color-scheme`; `null` restores the browser default. */
    setColorScheme: (scheme: 'light' | 'dark' | null) => Promise<void>;
    /** Emulates `forced-colors`; `null` restores the browser default. */
    setForcedColors: (mode: 'active' | null) => Promise<void>;
    /** Emulates `prefers-reduced-motion`; `null` restores the browser default. */
    setReducedMotion: (mode: 'reduce' | null) => Promise<void>;
    /** Hovers the element matching `selector` and presses the primary button without releasing. */
    holdPointer: (selector: string) => Promise<void>;
    releasePointer: () => Promise<void>;
    /** The generated Custom Elements Manifest, parsed. */
    readManifest: () => Promise<unknown>;
  }
}
