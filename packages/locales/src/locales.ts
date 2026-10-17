export type LocaleStatus = 'draft' | 'reviewed';

export interface LocaleInfo {
  /** A BCP 47 language tag. */
  readonly code: string;
  /** The language's name in that language. */
  readonly name: string;
  readonly dir: 'ltr' | 'rtl';
  /** `draft` until a native reader has reviewed the translations (specs/localization.md §5). */
  readonly status: LocaleStatus;
}

// English is the source of the messages, so it has no translations to review.
export const locales: readonly LocaleInfo[] = [
  { code: 'en', name: 'English', dir: 'ltr', status: 'reviewed' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', status: 'draft' },
  { code: 'fr', name: 'Français', dir: 'ltr', status: 'draft' },
  { code: 'es', name: 'Español', dir: 'ltr', status: 'draft' },
  { code: 'ja', name: '日本語', dir: 'ltr', status: 'draft' },
  { code: 'ar', name: 'العربية', dir: 'rtl', status: 'draft' },
];
