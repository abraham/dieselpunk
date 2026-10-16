import 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Emulates `prefers-color-scheme`; `null` restores the browser default. */
    setColorScheme: (scheme: 'light' | 'dark' | null) => Promise<void>;
  }
}
