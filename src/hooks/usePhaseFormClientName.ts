import { useMemo } from 'react';
import {
  readPartialAssessmentClientNameHint,
  readPrefillClientNameHint,
} from '@/lib/assessment/assessmentSessionStorage';

/**
 * Resolves the active client name for partial flows: session hints first, then live form field.
 */
export function usePhaseFormClientName(formFullName: string): string {
  const clientNameFromStorage = useMemo(() => {
    const partialName = readPartialAssessmentClientNameHint();
    if (partialName) return partialName;
    return readPrefillClientNameHint();
  }, []);

  return clientNameFromStorage || formFullName || '';
}
