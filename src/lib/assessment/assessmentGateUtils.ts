import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  getPartialCategoryFromEditType,
  hasPartialAssessmentInSession,
  parseEditAssessmentPayload,
} from '@/lib/assessment/assessmentSessionStorage';

export function shouldSkipSessionPlanWizard(): boolean {
  try {
    if (hasPartialAssessmentInSession()) return true;
    if (sessionStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true') return true;
    const parsed = parseEditAssessmentPayload();
    if (parsed?.editType && getPartialCategoryFromEditType(parsed.editType)) return true;
  } catch {
    /* ignore */
  }
  return false;
}
