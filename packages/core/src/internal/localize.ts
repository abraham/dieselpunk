// `msg` and `str` come from the files that define them. The package entry, `@lit/localize`, also
// pulls in the runtime and the decorators, about 1.7 kB in every entry that a library never uses.
export { msg } from '@lit/localize/init/install.js';
export { str } from '@lit/localize/internal/str-tag.js';
export { LOCALE_STATUS_EVENT } from '@lit/localize/internal/locale-status-event.js';
