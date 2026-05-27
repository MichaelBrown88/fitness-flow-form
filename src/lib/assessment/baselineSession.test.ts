import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  buildFullBaselinePlan,
  clientHasFullBaseline,
  markBaselineAssessmentSession,
  readBaselineSessionPlan,
  clearBaselineSessionFlags,
  hasActiveBaselineSession,
  isSessionPlanWizardSkipped,
} from './baselineSession';
import { isAssessmentPlanFullCoverage } from '@/lib/types/assessmentPlan';

describe('baselineSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('buildFullBaselinePlan matches full coverage', () => {
    const plan = buildFullBaselinePlan();
    expect(isAssessmentPlanFullCoverage(plan)).toBe(true);
    expect(plan.templateId).toBe('full_holistic');
  });

  it('clientHasFullBaseline detects full snapshot types', () => {
    expect(clientHasFullBaseline({ snapshots: [{ type: 'full' }] })).toBe(true);
    expect(clientHasFullBaseline({ snapshots: [{ type: 'full-assessment' }] })).toBe(true);
    expect(clientHasFullBaseline({ snapshots: [{ type: 'partial-strength' }] })).toBe(false);
  });

  it('clientHasFullBaseline uses client doc assessmentType', () => {
    expect(
      clientHasFullBaseline({
        clientDoc: { assessmentType: 'full', isPartial: false },
      }),
    ).toBe(true);
    expect(
      clientHasFullBaseline({
        clientDoc: { assessmentType: 'pillar', isPartial: true },
      }),
    ).toBe(false);
  });

  it('round-trips baseline session plan in sessionStorage', () => {
    markBaselineAssessmentSession('studio');
    expect(hasActiveBaselineSession()).toBe(true);
    const plan = readBaselineSessionPlan();
    expect(plan).not.toBeNull();
    expect(isAssessmentPlanFullCoverage(plan)).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEYS.BASELINE_INTAKE_MODE)).toBe('studio');
    clearBaselineSessionFlags();
    expect(hasActiveBaselineSession()).toBe(false);
  });

  it('isSessionPlanWizardSkipped when baseline session active', () => {
    markBaselineAssessmentSession('studio');
    expect(isSessionPlanWizardSkipped(null)).toBe(true);
    expect(isSessionPlanWizardSkipped(buildFullBaselinePlan())).toBe(true);
  });
});
