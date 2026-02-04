/**
 * Phase Configuration Module
 *
 * Re-exports all phase-related types and definitions.
 */

// Types
export type {
  PhaseId,
  FieldType,
  PhaseField,
  PhaseSection,
  PhaseDefinition,
  IntakeField
} from './types';

// Individual phase definitions
export { phaseP0 } from './phaseP0';
export { phaseP1 } from './phaseP1';
export { phaseP2 } from './phaseP2';
export { phaseP3 } from './phaseP3';
export { phaseP4 } from './phaseP4';
export { phaseP5 } from './phaseP5';
export { phaseP6 } from './phaseP6';
export { phaseP7 } from './phaseP7';

// Combined phase definitions array
import { phaseP0 } from './phaseP0';
import { phaseP1 } from './phaseP1';
import { phaseP2 } from './phaseP2';
import { phaseP3 } from './phaseP3';
import { phaseP4 } from './phaseP4';
import { phaseP5 } from './phaseP5';
import { phaseP6 } from './phaseP6';
import { phaseP7 } from './phaseP7';
import type { PhaseDefinition } from './types';

export const phaseDefinitions: PhaseDefinition[] = [
  phaseP0,
  phaseP1,
  phaseP2,
  phaseP3,
  phaseP4,
  phaseP5,
  phaseP6,
  phaseP7,
];
