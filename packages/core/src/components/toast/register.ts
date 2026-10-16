import { registerElement } from '../../utilities/register-element.ts';
import { PunkToast } from './toast.ts';
import { PunkToastStack } from './toast-stack.ts';

registerElement('punk-toast', PunkToast);
registerElement('punk-toast-stack', PunkToastStack);
