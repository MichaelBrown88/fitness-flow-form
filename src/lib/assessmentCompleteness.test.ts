import { describe, expect, it } from 'vitest';
import { createEmptyAssessmentForm } from '@/contexts/FormContext';
import { isAssessmentComplete } from '@/lib/assessmentCompleteness';

describe('isAssessmentComplete', () => {
  it('returns false when client name is missing (full mode)', () => {
    const form = createEmptyAssessmentForm();
    expect(isAssessmentComplete(form, 'full')).toBe(false);
  });

  it('returns false when client name is missing (partial mode)', () => {
    const form = createEmptyAssessmentForm();
    expect(isAssessmentComplete(form, 'partial', 'bodycomp')).toBe(false);
  });

  it('returns false for full mode when name exists but no pillar has score data', () => {
    const form = createEmptyAssessmentForm();
    form.fullName = 'Test Client';
    expect(isAssessmentComplete(form, 'full')).toBe(false);
  });

  it('returns false for partial bodycomp when name exists but body comp fields are empty', () => {
    const form = createEmptyAssessmentForm();
    form.fullName = 'Test Client';
    expect(isAssessmentComplete(form, 'partial', 'bodycomp')).toBe(false);
  });

  it('returns true for full mode when client name and at least one pillar produce a score', () => {
    const form = createEmptyAssessmentForm();
    form.fullName = 'Test Client';
    form.dateOfBirth = '1990-06-01';
    form.gender = 'male';
    form.inbodyBodyFatPct = '22';
    expect(isAssessmentComplete(form, 'full')).toBe(true);
  });
});
