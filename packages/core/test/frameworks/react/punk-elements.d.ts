import type {
  PunkButton,
  PunkCloseDetail,
  PunkDialog,
  PunkSlider,
  PunkSwitch,
  PunkTab,
  PunkTabChangeDetail,
  PunkTabs,
  PunkTextField,
  PunkWindow,
} from '@dieselpunk/core';
import type * as React from 'react';

// Props of an element: the HTML ones, the element's own properties, and its events. A custom
// element's events are listeners, so React takes them as `oninput` and `onpunk-close`, in lower
// case, and not as `onInput`, which is React's own synthetic event.
type Props<T extends HTMLElement, Events = object> = React.DetailedHTMLProps<
  React.HTMLAttributes<T>,
  T
> &
  Partial<Omit<T, keyof HTMLElement>> &
  Events;

type Field<T> = {
  oninput?: (event: Event & { target: T }) => void;
  onchange?: (event: Event & { target: T }) => void;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'punk-button': Props<PunkButton>;
      'punk-dialog': Props<
        PunkDialog,
        { 'onpunk-close'?: (event: CustomEvent<PunkCloseDetail>) => void }
      >;
      'punk-slider': Props<PunkSlider, Field<PunkSlider>>;
      'punk-switch': Props<PunkSwitch, Field<PunkSwitch>>;
      'punk-tab': Props<PunkTab>;
      'punk-tabs': Props<
        PunkTabs,
        { 'onpunk-tab-change'?: (event: CustomEvent<PunkTabChangeDetail>) => void }
      >;
      'punk-text-field': Props<PunkTextField, Field<PunkTextField>>;
      'punk-window': Props<
        PunkWindow,
        { 'onpunk-close'?: (event: CustomEvent<PunkCloseDetail>) => void }
      >;
    }
  }
}
