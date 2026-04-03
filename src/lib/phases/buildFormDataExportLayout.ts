/**
 * Flatten phase definitions in coach assessment order for exports / documentation.
 */

import { phaseDefinitions } from './index';
import type { PhaseField, PhaseId } from './types';

export interface FormDataExportRow {
  phaseId: PhaseId;
  phaseTitle: string;
  sectionTitle: string;
  fieldKey: string;
  label: string;
  field: PhaseField;
}

function appendPhaseRows(rows: FormDataExportRow[], seen: Set<string>, phase: (typeof phaseDefinitions)[number]): void {
  const push = (sectionTitle: string, fields: PhaseField[]) => {
    for (const f of fields) {
      const key = String(f.id);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        phaseId: phase.id,
        phaseTitle: phase.title,
        sectionTitle,
        fieldKey: key,
        label: f.label,
        field: f,
      });
    }
  };

  if (phase.sections?.length) {
    for (const sec of phase.sections) {
      push(sec.title, sec.fields);
    }
  }
  if (phase.fields?.length) {
    push(phase.title, phase.fields);
  }
}

/** All form fields in the order they appear in phase definitions (P0→P7). */
export function buildFormDataExportLayout(): FormDataExportRow[] {
  const rows: FormDataExportRow[] = [];
  const seen = new Set<string>();
  for (const phase of phaseDefinitions) {
    appendPhaseRows(rows, seen, phase);
  }
  return rows;
}
