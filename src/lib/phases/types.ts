/**
 * Phase Configuration Types
 *
 * Type definitions for phase configuration system.
 */

import type { FormData } from '@/contexts/FormContext';

export type PhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'choice' | 'multiselect' | 'parq' | 'email' | 'tel' | 'date' | 'time';

export interface PhaseField {
  id: keyof FormData;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  tooltip?: string;
  options?: readonly {
    readonly value: string;
    readonly label: string;
    readonly subtitle?: string;
    readonly isRecommended?: boolean;
    readonly tag?: string;
  }[];
  required?: boolean;
  readOnly?: boolean;
  pattern?: string; // Movement pattern (e.g., 'Hip Hinge', 'Lunge')
  side?: 'left' | 'right'; // For side-by-side comparison
  pairId?: string; // To group fields together on one screen
  conditional?: {
    showWhen: {
      field: string;
      value?: string;
      notValue?: string;
      exists?: boolean;
      includes?: string;
    };
  };
}

export interface PhaseSection {
  id: string;
  title: string;
  description?: string;
  instructions?: {
    clientInstructions: string;
    coachNotes: string;
  };
  fields: PhaseField[];
}

export interface PhaseDefinition {
  id: PhaseId;
  title: string;
  summary: string;
  gateHint?: string;
  fields?: PhaseField[];
  sections?: PhaseSection[];
  gatedWarning?: (formData: FormData) => string | null;
}

export interface IntakeField extends PhaseField {
  id: keyof FormData;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
}
