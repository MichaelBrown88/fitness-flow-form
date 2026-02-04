/**
 * Phase Configuration Module (re-export wrapper)
 *
 * This file re-exports from the refactored phases module
 * for backwards compatibility.
 */

export type {
  PhaseId,
  FieldType,
  PhaseField,
  PhaseSection,
  PhaseDefinition,
  IntakeField
} from './phases/types';

export { phaseDefinitions } from './phases';
