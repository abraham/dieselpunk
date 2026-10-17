import type { PunkBreadcrumb } from './breadcrumb.ts';
import type { PunkBreadcrumbItem } from './breadcrumb-item.ts';

export { PunkBreadcrumb } from './breadcrumb.ts';
export { PunkBreadcrumbItem } from './breadcrumb-item.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-breadcrumb': PunkBreadcrumb;
    'punk-breadcrumb-item': PunkBreadcrumbItem;
  }
}
