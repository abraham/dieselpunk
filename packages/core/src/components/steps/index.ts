import type { PunkSteps } from './steps.ts';
import type { PunkStep } from './step.ts';

export { PunkSteps } from './steps.ts';
export { PunkStep } from './step.ts';
export type { StepState } from './step.ts';

declare global {
  interface HTMLElementTagNameMap {
    'punk-steps': PunkSteps;
    'punk-step': PunkStep;
  }
}
