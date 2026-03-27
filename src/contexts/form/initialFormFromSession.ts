import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/lib/utils/logger';

/**
 * Hydrate assessment form state from sessionStorage (edit, draft, prefill).
 * Generic to avoid circular imports with FormContext.
 */
export function getInitialFormDataFromSession<T extends object>(base: T): T {
  try {
    const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    if (editData) {
      const parsed = JSON.parse(editData) as { formData?: Partial<T>; editType?: string };
      if (parsed.formData) {
        if (parsed.editType?.startsWith('partial-')) {
          const category = parsed.editType.replace('partial-', '');
          try {
            // Session JSON is untyped; we only read known string keys for partial-assessment UX.
            const patch = parsed.formData as Record<string, unknown>;
            const clientName =
              typeof patch.fullName === 'string' ? patch.fullName : '';
            sessionStorage.setItem(
              STORAGE_KEYS.PARTIAL_ASSESSMENT,
              JSON.stringify({ category, clientName }),
            );
          } catch {
            // non-fatal
          }
        }
        return { ...base, ...parsed.formData };
      }
    }

    const draftData = sessionStorage.getItem(STORAGE_KEYS.DRAFT_ASSESSMENT);
    if (draftData) {
      const parsed = JSON.parse(draftData) as { formData?: unknown };
      if (parsed.formData && typeof parsed.formData === 'object') {
        return { ...base, ...(parsed.formData as Partial<T>) };
      }
    }

    const prefillData = sessionStorage.getItem(STORAGE_KEYS.PREFILL_CLIENT);
    if (prefillData) {
      const data = JSON.parse(prefillData) as Partial<T>;
      sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
      return { ...base, ...data };
    }
  } catch (e) {
    logger.warn('Failed to parse prefill/edit data:', e);
  }
  return base;
}
