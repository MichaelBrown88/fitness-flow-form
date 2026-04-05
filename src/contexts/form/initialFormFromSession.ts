import { logger } from '@/lib/utils/logger';
import {
  readEditAssessmentRaw,
  writePartialRowIfPartialEditTypeFromPayload,
  readDraftAssessmentRaw,
  consumePrefillClientAsPartial,
} from '@/lib/assessment/assessmentSessionStorage';

/**
 * Hydrate assessment form state from sessionStorage (edit, draft, prefill).
 * Generic to avoid circular imports with FormContext.
 */
export function getInitialFormDataFromSession<T extends object>(base: T): T {
  try {
    const editData = readEditAssessmentRaw();
    if (editData) {
      const parsed = JSON.parse(editData) as { formData?: Partial<T>; editType?: string };
      if (parsed.formData) {
        writePartialRowIfPartialEditTypeFromPayload(parsed);
        return { ...base, ...parsed.formData };
      }
    }

    const draftData = readDraftAssessmentRaw();
    if (draftData) {
      const parsed = JSON.parse(draftData) as { formData?: unknown };
      if (parsed.formData && typeof parsed.formData === 'object') {
        return { ...base, ...(parsed.formData as Partial<T>) };
      }
    }

    const prefillPartial = consumePrefillClientAsPartial<T>();
    if (prefillPartial) {
      return { ...base, ...prefillPartial };
    }
  } catch (e) {
    logger.warn('Failed to parse prefill/edit data:', e);
  }
  return base;
}
