import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { AssessmentPlan } from '@/lib/types/assessmentPlan';
import { isSessionPlanWizardSkipped } from '@/lib/assessment/baselineSession';
import {
  getPartialCategoryFromEditType,
  hasPartialAssessmentInSession,
  parseEditAssessmentPayload,
} from '@/lib/assessment/assessmentSessionStorage';

export function shouldSkipSessionPlanWizard(
  plan?: AssessmentPlan | null | undefined,
): boolean {
  try {
    if (isSessionPlanWizardSkipped(plan)) return true;
    if (hasPartialAssessmentInSession()) return true;
    if (sessionStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true') return true;
    const parsed = parseEditAssessmentPayload();
    if (parsed?.editType && getPartialCategoryFromEditType(parsed.editType)) return true;
  } catch {
    /* ignore */
  }
  return false;
}
