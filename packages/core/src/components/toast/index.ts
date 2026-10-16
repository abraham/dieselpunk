import type { PunkToast } from './toast.ts';
import type { PunkToastStack } from './toast-stack.ts';

export { PunkToast } from './toast.ts';
export { PunkToastStack } from './toast-stack.ts';
export type { PunkDismissDetail, PunkDismissReason, ToastVariant } from './toast.ts';
export type { PunkToastOptions, ToastPlacement } from './toast-stack.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-toast-stack': PunkToastStack;
    'punk-toast': PunkToast;
  }
}
